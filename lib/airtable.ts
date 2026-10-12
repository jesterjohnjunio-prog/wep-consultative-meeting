import 'server-only';
import { ATTENDEE_FIELDS, F, FIELD_SPECS } from './fields';
import type { Registration, SchemaStatus } from './types';

const API = 'https://api.airtable.com/v0';
export const DEFAULT_TABLE_NAME = 'BCG WEP';

export class AirtableError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
  ) {
    super(message);
  }
}

export class ConfigError extends Error {}

function config() {
  const token = process.env.AIRTABLE_TOKEN?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const table = process.env.AIRTABLE_TABLE_ID?.trim() || process.env.AIRTABLE_TABLE_NAME?.trim() || DEFAULT_TABLE_NAME;
  if (!token || !baseId) throw new ConfigError('AIRTABLE_TOKEN and AIRTABLE_BASE_ID must be set.');
  return { token, baseId, table };
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { token } = config();
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { type?: string; message?: string } | string | undefined;
    const type = typeof err === 'string' ? err : (err?.type ?? 'UNKNOWN');
    const message = typeof err === 'object' && err?.message ? err.message : `Airtable request failed (${res.status})`;
    throw new AirtableError(res.status, type, message);
  }
  return json as T;
}

// ---------------------------------------------------------------- schema

interface MetaField {
  id: string;
  name: string;
  type: string;
}
interface MetaTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: MetaField[];
}

async function findTable() {
  const { baseId, table } = config();
  const { tables } = await request<{ tables: MetaTable[] }>(`/meta/bases/${baseId}/tables`);
  return tables.find((t) => t.id === table || t.name === table);
}

export async function getSchemaStatus(): Promise<SchemaStatus> {
  try {
    const t = await findTable();
    if (!t) return { ok: false, missing: FIELD_SPECS.map((f) => f.name) };
    const names = new Set(t.fields.map((f) => f.name));
    const missing = FIELD_SPECS.filter((f) => !names.has(f.name)).map((f) => f.name);
    return { ok: missing.length === 0, tableName: t.name, missing };
  } catch (e) {
    return { ok: true, missing: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export interface SetupReport {
  tableId: string;
  tableName: string;
  createdTable: boolean;
  renamedPrimary?: string;
  createdFields: string[];
  typeMismatches: string[];
}

/**
 * Creates the registrations table (or any missing columns) in Airtable.
 * Safe to run repeatedly: existing columns and records are never changed,
 * except that Airtable's default primary column "Name" is renamed to "Reference No.".
 */
export async function ensureSchema(): Promise<SetupReport> {
  const { baseId, table } = config();
  const existing = await findTable();

  if (!existing) {
    const name = table.startsWith('tbl') ? DEFAULT_TABLE_NAME : table;
    const created = await request<MetaTable>(`/meta/bases/${baseId}/tables`, {
      method: 'POST',
      body: {
        name,
        description: 'Registrations from the Barangay Consultative Meeting form (MWSS RO Water Efficiency Program).',
        fields: FIELD_SPECS,
      },
    });
    return {
      tableId: created.id,
      tableName: created.name,
      createdTable: true,
      createdFields: FIELD_SPECS.map((f) => f.name),
      typeMismatches: [],
    };
  }

  const byName = new Map(existing.fields.map((f) => [f.name, f]));
  const report: SetupReport = {
    tableId: existing.id,
    tableName: existing.name,
    createdTable: false,
    createdFields: [],
    typeMismatches: [],
  };

  const primary = existing.fields.find((f) => f.id === existing.primaryFieldId);
  if (!byName.has(F.ref) && primary?.name === 'Name' && primary.type === 'singleLineText') {
    await request(`/meta/bases/${baseId}/tables/${existing.id}/fields/${primary.id}`, {
      method: 'PATCH',
      body: { name: F.ref, description: FIELD_SPECS[0].description },
    });
    byName.set(F.ref, { ...primary, name: F.ref });
    report.renamedPrimary = `Name → ${F.ref}`;
  }

  for (const spec of FIELD_SPECS) {
    const found = byName.get(spec.name);
    if (found) {
      if (found.type !== spec.type) report.typeMismatches.push(`${spec.name} (is ${found.type}, expected ${spec.type})`);
      continue;
    }
    await request(`/meta/bases/${baseId}/tables/${existing.id}/fields`, { method: 'POST', body: spec });
    report.createdFields.push(spec.name);
  }
  return report;
}

// ---------------------------------------------------------------- records

type Fields = Record<string, unknown>;
interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Fields;
}

const SELF_HEAL_ERRORS = new Set(['UNKNOWN_FIELD_NAME', 'TABLE_NOT_FOUND', 'NOT_FOUND', 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND']);

/** Saves one registration. If the table or columns are missing, creates them once and retries. */
export async function createRegistration(fields: Fields): Promise<string> {
  const { baseId, table } = config();
  const insert = (tableKey: string) =>
    request<{ records: AirtableRecord[] }>(`/${baseId}/${encodeURIComponent(tableKey)}`, {
      method: 'POST',
      body: { records: [{ fields }], typecast: true },
    });
  try {
    return (await insert(table)).records[0].id;
  } catch (e) {
    if (!(e instanceof AirtableError) || !SELF_HEAL_ERRORS.has(e.type)) throw e;
    const report = await ensureSchema();
    return (await insert(report.tableId)).records[0].id;
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

function toRegistration(r: AirtableRecord): Registration {
  const f = r.fields;
  const attendees = ATTENDEE_FIELDS.map((a) => ({
    name: str(f[a.name]),
    contact: str(f[a.contact]),
    gender: str(f[a.gender]),
    pwd: str(f[a.pwd]),
  })).filter((a) => a.name);
  return {
    id: r.id,
    ref: str(f[F.ref]),
    submittedAt: str(f[F.submittedAt]) || r.createdTime,
    consent: str(f[F.consent]),
    province: str(f[F.province]),
    city: str(f[F.city]),
    barangay: str(f[F.barangay]),
    hallAddress: str(f[F.hallAddress]),
    brgyContact: str(f[F.brgyContact]),
    brgyEmail: str(f[F.brgyEmail]),
    chairperson: str(f[F.chairperson]),
    focalPerson: str(f[F.focalPerson]),
    focalContact: str(f[F.focalContact]),
    focalEmail: str(f[F.focalEmail]),
    willAttend: str(f[F.willAttend]),
    attendeeCount: typeof f[F.attendeeCount] === 'number' ? (f[F.attendeeCount] as number) : attendees.length,
    attendees,
  };
}

/** Every registration in the table, newest first. Blank rows (e.g. Airtable's starter rows) are skipped. */
export async function listRegistrations(): Promise<Registration[]> {
  const { baseId, table } = config();
  const out: Registration[] = [];
  let offset: string | undefined;
  do {
    const q = new URLSearchParams({ pageSize: '100' });
    if (offset) q.set('offset', offset);
    const page = await request<{ records: AirtableRecord[]; offset?: string }>(
      `/${baseId}/${encodeURIComponent(table)}?${q}`,
    );
    for (const rec of page.records) {
      const reg = toRegistration(rec);
      if (reg.ref || reg.barangay) out.push(reg);
    }
    offset = page.offset;
  } while (offset);
  return out.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}
