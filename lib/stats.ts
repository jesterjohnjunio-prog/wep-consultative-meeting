// Filtering and summary statistics shared by the dashboard and the export endpoint,
// so the numbers on screen always match the downloaded file.
import { GENDERS, LOCATIONS, PROVINCES } from './config';
import type { Registration } from './types';

export type RangeKey = 'all' | 'today' | '7d' | '30d';

export interface Filters {
  q: string;
  province: string;
  city: string;
  attend: '' | 'Yes' | 'No';
  range: RangeKey;
}

export const EMPTY_FILTERS: Filters = { q: '', province: '', city: '', attend: '', range: 'all' };

export const RANGE_LABELS: Record<RangeKey, string> = {
  all: 'All time',
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD in Philippine time. */
export function dayKey(iso: string | Date) {
  return manilaDay.format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function filtersFromParams(p: URLSearchParams): Filters {
  const attend = p.get('attend');
  const range = p.get('range') as RangeKey | null;
  return {
    q: p.get('q') ?? '',
    province: p.get('province') ?? '',
    city: p.get('city') ?? '',
    attend: attend === 'Yes' || attend === 'No' ? attend : '',
    range: range && range in RANGE_LABELS ? range : 'all',
  };
}

export function filtersToParams(f: Filters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v && v !== 'all') p.set(k, v);
  return p;
}

export function describeFilters(f: Filters) {
  const parts: string[] = [];
  if (f.range !== 'all') parts.push(RANGE_LABELS[f.range]);
  if (f.province) parts.push(f.province);
  if (f.city) parts.push(f.city);
  if (f.attend) parts.push(f.attend === 'Yes' ? 'Attending' : 'Not attending');
  if (f.q) parts.push(`Search: "${f.q}"`);
  return parts.length ? parts.join(' · ') : 'All registrations';
}

export function applyFilters(rows: Registration[], f: Filters, now = new Date()): Registration[] {
  const q = f.q.trim().toLowerCase();
  let since = '';
  if (f.range !== 'all') {
    const days = f.range === 'today' ? 0 : f.range === '7d' ? 6 : 29;
    since = dayKey(new Date(now.getTime() - days * 86_400_000));
  }
  return rows.filter((r) => {
    if (f.province && r.province !== f.province) return false;
    if (f.city && r.city !== f.city) return false;
    if (f.attend && r.willAttend !== f.attend) return false;
    if (since && dayKey(r.submittedAt) < since) return false;
    if (q) {
      const hay = [
        r.ref,
        r.barangay,
        r.city,
        r.chairperson,
        r.focalPerson,
        r.focalEmail,
        r.brgyEmail,
        ...r.attendees.map((a) => a.name),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const duplicateKey = (r: Registration) => `${r.barangay.trim().toLowerCase()}|${r.city}`;

/** Keys of barangays that registered more than once. */
export function findDuplicates(rows: Registration[]) {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(duplicateKey(r), (counts.get(duplicateKey(r)) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n > 1).map(([k]) => k));
}

export interface Stats {
  total: number;
  attending: number;
  notAttending: number;
  expectedAttendees: number;
  gender: { label: string; value: number }[];
  pwd: number;
  attendeesCounted: number;
  byCity: { city: string; province: string; count: number; attendees: number }[];
  byProvince: { province: string; count: number }[];
  daily: { day: string; count: number }[];
  duplicates: number;
}

export function computeStats(rows: Registration[]): Stats {
  const attendingRows = rows.filter((r) => r.willAttend === 'Yes');
  const attendees = attendingRows.flatMap((r) => r.attendees);

  const cityMap = new Map<string, { count: number; attendees: number }>();
  for (const r of rows) {
    const c = cityMap.get(r.city) ?? { count: 0, attendees: 0 };
    c.count += 1;
    if (r.willAttend === 'Yes') c.attendees += r.attendees.length;
    cityMap.set(r.city, c);
  }
  const provinceOfCity = (city: string) => PROVINCES.find((p) => LOCATIONS[p].includes(city)) ?? '';

  const dayMap = new Map<string, number>();
  for (const r of rows) dayMap.set(dayKey(r.submittedAt), (dayMap.get(dayKey(r.submittedAt)) ?? 0) + 1);
  const days = [...dayMap.keys()].sort();
  const daily: Stats['daily'] = [];
  if (days.length) {
    // Fill gaps so quiet days show as zero rather than disappearing.
    for (let d = new Date(`${days[0]}T00:00:00+08:00`); dayKey(d) <= days[days.length - 1]; d = new Date(d.getTime() + 86_400_000)) {
      daily.push({ day: dayKey(d), count: dayMap.get(dayKey(d)) ?? 0 });
    }
  }

  const dupKeys = findDuplicates(rows);

  return {
    total: rows.length,
    attending: attendingRows.length,
    notAttending: rows.filter((r) => r.willAttend === 'No').length,
    expectedAttendees: attendees.length,
    gender: GENDERS.map((g) => ({ label: g.value, value: attendees.filter((a) => a.gender === g.value).length })),
    pwd: attendees.filter((a) => a.pwd === 'Yes').length,
    attendeesCounted: attendees.length,
    byCity: [...cityMap]
      .map(([city, v]) => ({ city: city || 'Unspecified', province: provinceOfCity(city), ...v }))
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
    byProvince: PROVINCES.map((p) => ({ province: p, count: rows.filter((r) => r.province === p).length })),
    daily,
    duplicates: rows.filter((r) => dupKeys.has(duplicateKey(r))).length,
  };
}

const longDate = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatDateTime = (iso: string) => (iso ? longDate.format(new Date(iso)) : '');
