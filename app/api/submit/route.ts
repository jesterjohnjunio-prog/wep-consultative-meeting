import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { AirtableError, ConfigError, createRegistration } from '@/lib/airtable';
import { provinceOf } from '@/lib/config';
import { ATTENDEE_FIELDS, F } from '@/lib/fields';
import { attendeeIsBlank, normalizeInput, validateAll } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O, 1/I

function makeRef() {
  let s = '';
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `WEP-CM-${s}`;
}

const fail = (status: number, message: string, extra: object = {}) =>
  NextResponse.json({ ok: false, message, ...extra }, { status });

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 20_000) return fail(413, 'Request too large.');

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, 'Invalid request.');
  }

  const input = normalizeInput(body);
  // Honeypot filled in → almost certainly a bot. Pretend it worked and store nothing.
  if (input.website) return NextResponse.json({ ok: true, ref: makeRef() });

  const errors = validateAll(input);
  if (Object.keys(errors).length) {
    return fail(400, 'Pakisuri ang mga sagot na may marka (Please check the highlighted answers.)', { errors });
  }

  const attendees =
    input.willAttend === 'Yes' ? input.attendees.filter((a, i) => i === 0 || !attendeeIsBlank(a)) : [];
  const ref = makeRef();

  const fields: Record<string, string | number> = {
    [F.ref]: ref,
    [F.submittedAt]: new Date().toISOString(),
    [F.consent]: 'Agree',
    [F.province]: provinceOf(input.city),
    [F.city]: input.city,
    [F.barangay]: input.barangay,
    [F.hallAddress]: input.hallAddress,
    [F.brgyContact]: input.brgyContact,
    [F.brgyEmail]: input.brgyEmail,
    [F.chairperson]: input.chairperson,
    [F.focalPerson]: input.focalPerson,
    [F.focalContact]: input.focalContact,
    [F.focalEmail]: input.focalEmail,
    [F.willAttend]: input.willAttend,
    [F.attendeeCount]: attendees.length,
  };
  attendees.forEach((a, i) => {
    const k = ATTENDEE_FIELDS[i];
    fields[k.name] = a.name;
    fields[k.contact] = a.contact;
    fields[k.gender] = a.gender;
    fields[k.pwd] = a.pwd;
  });
  for (const k of Object.keys(fields)) if (fields[k] === '') delete fields[k];

  try {
    await createRegistration(fields);
    return NextResponse.json({ ok: true, ref });
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error('[submit] configuration error:', e.message);
      return fail(503, 'Ang form ay hindi pa handa (The form is not configured yet. Please contact MWSS RO.)');
    }
    console.error('[submit] Airtable error:', e instanceof AirtableError ? `${e.status} ${e.type}: ${e.message}` : e);
    return fail(502, 'Hindi naisumite ang form. Pakisubukang muli. (We could not save your response. Please try again.)');
  }
}
