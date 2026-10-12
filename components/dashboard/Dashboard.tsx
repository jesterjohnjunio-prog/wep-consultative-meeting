'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { EVENT, LOCATIONS, PROVINCES, type Province } from '@/lib/config';
import {
  applyFilters,
  computeStats,
  describeFilters,
  EMPTY_FILTERS,
  filtersToParams,
  findDuplicates,
  formatDateTime,
  RANGE_LABELS,
  type Filters,
  type RangeKey,
} from '@/lib/stats';
import type { Registration, SchemaStatus } from '@/lib/types';
import { Alert, Database, FileText, LogOut, Printer, Refresh, Search, Sheet, Users } from '../Icons';
import { BarList, ColumnChart, DailyTable, Meter, StackedBar, StatTile, type Segment } from './Charts';
import ResponsesTable from './ResponsesTable';

interface Payload {
  records: Registration[];
  schema: SchemaStatus;
  fetchedAt: string;
}

const REFRESH_MS = 60_000;
const fmt = (n: number) => n.toLocaleString('en-PH');
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

export default function Dashboard() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [setup, setSetup] = useState<{ busy: boolean; message: string; ok?: boolean }>({ busy: false, message: '' });
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/responses', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Could not load responses.');
      setPayload(json as Payload);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load responses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Print every filtered row, not just the current table page.
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const records = useMemo(() => payload?.records ?? [], [payload]);
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const dupKeys = useMemo(() => findDuplicates(records), [records]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'province' ? { city: '' } : {}) }));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const exportHref = (format: string) => {
    const p = filtersToParams(filters);
    p.set('format', format);
    return `/api/export?${p}`;
  };

  async function runSetup() {
    setSetup({ busy: true, message: '' });
    try {
      const res = await fetch('/api/admin/setup', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || 'Setup failed.');
      const r = json.report as { createdFields: string[]; tableName: string; createdTable: boolean };
      setSetup({
        busy: false,
        ok: true,
        message: r.createdTable
          ? `Created table “${r.tableName}” with ${r.createdFields.length} fields.`
          : `Added ${r.createdFields.length} field(s) to “${r.tableName}”.`,
      });
      await load();
    } catch (e) {
      setSetup({ busy: false, ok: false, message: e instanceof Error ? e.message : 'Setup failed.' });
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  const cities = filters.province ? LOCATIONS[filters.province as Province] : null;
  const female = stats.gender.find((g) => g.label === 'Female')?.value ?? 0;

  const genderSegments: Segment[] = stats.gender.map((g, i) => ({
    key: g.label,
    label: g.label,
    value: g.value,
    color: `var(--s${i + 1})`,
    ink: i === 0 ? 'light' : 'dark',
  }));
  const attendSegments: Segment[] = [
    { key: 'yes', label: 'Attending', value: stats.attending, color: 'var(--s1)', ink: 'light' },
    { key: 'no', label: 'Not attending', value: stats.notAttending, color: 'var(--de-emph)', ink: 'muted' },
  ];
  const pwdSegments: Segment[] = [
    { key: 'pwd', label: 'PWD', value: stats.pwd, color: 'var(--s1)', ink: 'light' },
    { key: 'non', label: 'Not PWD', value: stats.attendeesCounted - stats.pwd, color: 'var(--de-emph)', ink: 'muted' },
  ];

  const citiesCovered = stats.byCity.filter((c) => c.count > 0).length;

  return (
    <div className="dash">
      <header className="dash-head">
        <div className="dash-head-inner">
          <div className="dash-brand">
            <div className="dash-logos">
              <Image src="/mwss-ro-logo.png" alt="MWSS Regulatory Office" width={1694} height={369} className="dash-logo-mwss" priority />
              <span aria-hidden="true" />
              <Image src="/wep-logo.png" alt="Water Efficiency Program" width={725} height={987} className="dash-logo-wep" priority />
            </div>
            <div>
              <p className="dash-kicker">Registration dashboard</p>
              <h1>Barangay Consultative Meeting</h1>
              <p className="dash-sub">
                {EVENT.dateEn} · {EVENT.time} · {EVENT.venue}
              </p>
            </div>
          </div>
          <div className="dash-actions no-print">
            {payload && <span className="dash-updated">Updated {formatDateTime(payload.fetchedAt)}</span>}
            <button type="button" className="head-btn" onClick={() => void load()} disabled={loading}>
              <Refresh className={loading ? 'spin' : ''} width={18} height={18} />
              Refresh
            </button>
            <button type="button" className="head-btn" onClick={() => void logout()}>
              <LogOut width={18} height={18} />
              Sign out
            </button>
          </div>
        </div>
        <svg className="dash-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 30 C 240 0 480 0 720 30 S 1200 60 1440 30 V60 H0 Z" />
        </svg>
      </header>

      <main className={`dash-main${loading && payload ? ' is-refreshing' : ''}`}>
        {error && (
          <p className="banner banner-error" role="alert">
            <Alert />
            <span>{error}</span>
            <button type="button" className="btn-mini" onClick={() => void load()}>
              Try again
            </button>
          </p>
        )}

        {payload && !payload.schema.ok && (
          <div className="banner banner-warn" role="status">
            <Database />
            <div>
              <strong>Airtable needs setup.</strong>{' '}
              {payload.schema.missing.length} field(s) are missing
              {payload.schema.tableName ? ` in “${payload.schema.tableName}”` : ' (the table was not found)'}:{' '}
              <span className="muted">{payload.schema.missing.slice(0, 6).join(', ')}{payload.schema.missing.length > 6 ? '…' : ''}</span>
            </div>
            <button type="button" className="btn-mini btn-mini-solid" onClick={() => void runSetup()} disabled={setup.busy}>
              {setup.busy ? 'Creating…' : 'Create fields now'}
            </button>
          </div>
        )}
        {setup.message && (
          <p className={`banner ${setup.ok ? 'banner-ok' : 'banner-error'}`} role="status">
            {setup.message}
          </p>
        )}

        <section className="toolbar no-print" aria-label="Filters and export">
          <div className="filters">
            <label className="filter">
              <span>Submitted</span>
              <select value={filters.range} onChange={(e) => setFilter('range', e.target.value as RangeKey)}>
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
                  <option key={k} value={k}>
                    {RANGE_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter filter-search">
              <span>Search</span>
              <span className="search-box">
                <Search width={16} height={16} />
                <input
                  type="search"
                  placeholder="Barangay, name, reference…"
                  value={filters.q}
                  onChange={(e) => setFilter('q', e.target.value)}
                />
              </span>
            </label>
            <label className="filter">
              <span>Province</span>
              <select value={filters.province} onChange={(e) => setFilter('province', e.target.value)}>
                <option value="">All provinces</option>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="filter">
              <span>City / municipality</span>
              <select value={filters.city} onChange={(e) => setFilter('city', e.target.value)}>
                <option value="">All cities</option>
                {(cities ? [{ p: filters.province, list: cities }] : PROVINCES.map((p) => ({ p, list: LOCATIONS[p] }))).map((g) => (
                  <optgroup key={g.p} label={g.p}>
                    {g.list.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="filter">
              <span>Attendance</span>
              <select value={filters.attend} onChange={(e) => setFilter('attend', e.target.value as Filters['attend'])}>
                <option value="">All responses</option>
                <option value="Yes">Attending</option>
                <option value="No">Not attending</option>
              </select>
            </label>
            {hasFilters && (
              <button type="button" className="btn-mini filter-reset" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </button>
            )}
          </div>
          <div className="exports">
            <span className="exports-label">Export</span>
            <a className="btn-mini" href={exportHref('xlsx')} download>
              <Sheet width={16} height={16} />
              Excel
            </a>
            <a className="btn-mini" href={exportHref('csv')} download>
              <FileText width={16} height={16} />
              CSV
            </a>
            <a className="btn-mini" href={exportHref('attendees-csv')} download>
              <Users width={16} height={16} />
              Attendee list
            </a>
            <button type="button" className="btn-mini" onClick={() => window.print()}>
              <Printer width={16} height={16} />
              Print / PDF
            </button>
          </div>
        </section>

        <p className="scope-note">
          Showing <strong>{describeFilters(filters)}</strong>
          {payload && (
            <>
              {' '}
              · {fmt(filtered.length)} of {plural(records.length, 'registration', 'registrations')}
            </>
          )}
        </p>

        {!payload && loading ? (
          <div className="loading-block">
            <span className="spinner spinner-dark" aria-hidden="true" />
            Loading responses…
          </div>
        ) : (
          <>
            <section className="kpis" aria-label="Key figures">
              <StatTile hero label="Registered barangays" value={stats.total} note={plural(citiesCovered, 'city / municipality', 'cities / municipalities')} />
              <StatTile label="Confirmed attending" value={stats.attending} note={`${pct(stats.attending, stats.total)}% of registrations`} />
              <StatTile label="Not attending" value={stats.notAttending} note={`${pct(stats.notAttending, stats.total)}% of registrations`} />
              <StatTile label="Expected attendees" value={stats.expectedAttendees} note={`Target ${EVENT.capacity} pax`}>
                <Meter value={stats.expectedAttendees} max={EVENT.capacity} label="Expected attendees against target capacity" />
              </StatTile>
              <StatTile label="Women attendees" value={female} note={`${pct(female, stats.attendeesCounted)}% of attendees`} />
              <StatTile label="PWD attendees" value={stats.pwd} note={stats.pwd ? 'Plan accessibility support' : 'None declared'} />
            </section>

            <section className="chart-grid">
              <article className="card card-wide">
                <header className="card-head">
                  <h2>Registrations by city / municipality</h2>
                  <p>Number of barangays registered; hover a bar for expected attendees.</p>
                </header>
                <BarList
                  unit="registrations"
                  items={stats.byCity.map((c) => ({
                    key: c.city,
                    label: c.city,
                    sub: c.province,
                    value: c.count,
                    tip: [
                      { value: fmt(c.count), label: c.count === 1 ? 'barangay registered' : 'barangays registered', color: 'var(--s1)' },
                      { value: fmt(c.attendees), label: 'expected attendees' },
                    ],
                  }))}
                />
              </article>

              <article className="card">
                <header className="card-head">
                  <h2>Response &amp; attendee profile</h2>
                  <p>Share of registrations and of confirmed attendees.</p>
                </header>
                <StackedBar title="Attendance confirmation" unit="barangays" segments={attendSegments} />
                <StackedBar title="Attendee gender" unit="attendees" segments={genderSegments} />
                <StackedBar title="Persons with disability" unit="attendees" segments={pwdSegments} />
              </article>

              <article className="card">
                <header className="card-head">
                  <h2>Registrations per day</h2>
                  <p>Philippine time. The busiest day is labelled.</p>
                </header>
                <ColumnChart data={stats.daily} />
                {stats.daily.length > 0 && <DailyTable data={stats.daily} />}
              </article>

              <article className="card">
                <header className="card-head">
                  <h2>By province</h2>
                  <p>Registered barangays per province.</p>
                </header>
                <BarList
                  unit="registrations"
                  items={stats.byProvince.map((p) => ({
                    key: p.province,
                    label: p.province,
                    value: p.count,
                    tip: [{ value: fmt(p.count), label: 'barangays registered', color: 'var(--s1)' }],
                  }))}
                />
                {stats.duplicates > 0 && (
                  <p className="status status-warning dup-note">
                    <Alert width={14} height={14} />
                    {stats.duplicates} registrations share the same barangay and city — review them in the table.
                  </p>
                )}
              </article>
            </section>

            <section className="card table-card">
              <header className="card-head">
                <h2>Responses</h2>
                <p>{plural(filtered.length, 'registration', 'registrations')} · newest first by default. Click a column to sort.</p>
              </header>
              <ResponsesTable rows={filtered} dupKeys={dupKeys} showAll={printing} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
