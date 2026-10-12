'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { withBarangay } from '@/lib/config';
import { duplicateKey, formatDateTime } from '@/lib/stats';
import type { Registration } from '@/lib/types';
import { Alert, Check, ChevronDown, X } from '../Icons';

type SortKey = 'submittedAt' | 'barangay' | 'city' | 'attendees';
const PAGE_SIZE = 20;

function AttendBadge({ value }: { value: string }) {
  if (value === 'Yes')
    return (
      <span className="status status-good">
        <Check width={14} height={14} />
        Attending
      </span>
    );
  if (value === 'No')
    return (
      <span className="status status-neutral">
        <X width={14} height={14} />
        Not attending
      </span>
    );
  return <span className="muted">—</span>;
}

function DupBadge() {
  return (
    <span className="status status-warning" title="Same barangay and city registered more than once">
      <Alert width={13} height={13} />
      Possible duplicate
    </span>
  );
}

export default function ResponsesTable({
  rows,
  dupKeys,
  showAll,
}: {
  rows: Registration[];
  dupKeys: Set<string>;
  showAll: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'submittedAt', dir: -1 });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Registration | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setPage(0), [rows]);

  useEffect(() => {
    const d = dialogRef.current;
    if (selected && d && !d.open) d.showModal();
  }, [selected]);

  const sorted = useMemo(() => {
    const val = (r: Registration) =>
      sort.key === 'attendees' ? (r.willAttend === 'Yes' ? r.attendees.length : -1) : (r[sort.key] ?? '').toString().toLowerCase();
    return [...rows].sort((a, b) => (val(a) < val(b) ? -sort.dir : val(a) > val(b) ? sort.dir : 0));
  }, [rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = showAll ? sorted : sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const header = (key: SortKey, label: string) => {
    const active = sort.key === key;
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
        <button
          type="button"
          className={`sort-btn${active ? ' is-active' : ''}`}
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'submittedAt' ? -1 : 1 }))}
        >
          {label}
          <ChevronDown width={14} height={14} className={active && sort.dir === 1 ? 'flip' : ''} />
        </button>
      </th>
    );
  };

  if (!rows.length) {
    return <p className="empty table-empty">No registrations match these filters yet.</p>;
  }

  return (
    <>
      <div className="table-scroll">
        <table className="resp-table">
          <thead>
            <tr>
              {header('submittedAt', 'Reference / Submitted')}
              {header('barangay', 'Barangay')}
              <th scope="col">Chairperson</th>
              <th scope="col">Focal person</th>
              {header('attendees', 'Attendance')}
              <th scope="col">Attendees</th>
              <th scope="col" className="no-print">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td data-label="Reference">
                  <span className="cell-strong mono">{r.ref || '—'}</span>
                  <span className="cell-sub">{formatDateTime(r.submittedAt)}</span>
                </td>
                <td data-label="Barangay">
                  <span className="cell-strong">{r.barangay}</span>
                  <span className="cell-sub">
                    {r.city}
                    {r.province && `, ${r.province}`}
                  </span>
                  {dupKeys.has(duplicateKey(r)) && <DupBadge />}
                </td>
                <td data-label="Chairperson">{r.chairperson}</td>
                <td data-label="Focal person">
                  <span className="cell-strong">{r.focalPerson}</span>
                  <span className="cell-sub">{r.focalContact}</span>
                  <span className="cell-sub">{r.focalEmail}</span>
                </td>
                <td data-label="Attendance">
                  <AttendBadge value={r.willAttend} />
                </td>
                <td data-label="Attendees">
                  {r.willAttend === 'Yes' && r.attendees.length ? (
                    <ul className="att-list">
                      {r.attendees.map((a, i) => (
                        <li key={i}>
                          <span>{a.name}</span>
                          <span className="cell-sub">
                            {a.gender || '—'}
                            {a.pwd === 'Yes' && ' · PWD'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="no-print cell-action">
                  <button type="button" className="btn-mini" onClick={() => setSelected(r)}>
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showAll && pages > 1 && (
        <nav className="pager no-print" aria-label="Table pages">
          <button type="button" className="btn-mini" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {pages} · {sorted.length} registrations
          </span>
          <button type="button" className="btn-mini" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </nav>
      )}

      <dialog
        ref={dialogRef}
        className="detail"
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {selected && (
          <div className="detail-inner">
            <header className="detail-head">
              <div>
                <p className="detail-ref mono">{selected.ref}</p>
                <h2>{withBarangay(selected.barangay)}</h2>
                <p className="cell-sub">
                  {selected.city}
                  {selected.province && `, ${selected.province}`} · Submitted {formatDateTime(selected.submittedAt)}
                </p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => dialogRef.current?.close()}>
                <X />
              </button>
            </header>
            <div className="detail-badges">
              <AttendBadge value={selected.willAttend} />
              {dupKeys.has(duplicateKey(selected)) && <DupBadge />}
              <span className="status status-neutral">Data privacy: {selected.consent || '—'}</span>
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Barangay hall address</dt>
                <dd>{selected.hallAddress || '—'}</dd>
              </div>
              <div>
                <dt>Barangay contact</dt>
                <dd>
                  {selected.brgyContact || '—'}
                  {selected.brgyEmail && <span className="cell-sub">{selected.brgyEmail}</span>}
                </dd>
              </div>
              <div>
                <dt>Barangay chairperson</dt>
                <dd>{selected.chairperson || '—'}</dd>
              </div>
              <div>
                <dt>WEP focal person</dt>
                <dd>
                  {selected.focalPerson || '—'}
                  <span className="cell-sub">{selected.focalContact}</span>
                  <span className="cell-sub">{selected.focalEmail}</span>
                </dd>
              </div>
            </dl>
            {selected.willAttend === 'Yes' && (
              <>
                <h3 className="detail-sub">Attendees</h3>
                <div className="detail-attendees">
                  {selected.attendees.map((a, i) => (
                    <div key={i} className="detail-att">
                      <span className="detail-att-n">{i + 1}</span>
                      <div>
                        <strong>{a.name}</strong>
                        <span className="cell-sub">{a.contact}</span>
                        <span className="cell-sub">
                          {a.gender || '—'} · PWD: {a.pwd || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
