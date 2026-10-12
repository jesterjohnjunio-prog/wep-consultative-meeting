import { NextResponse } from 'next/server';
import { listRegistrations } from '@/lib/airtable';
import { isAuthenticated } from '@/lib/auth';
import { attendeesCsv, buildWorkbook, registrationsCsv } from '@/lib/export';
import { applyFilters, dayKey, describeFilters, filtersFromParams } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'xlsx';
  const filters = filtersFromParams(url.searchParams);

  try {
    const rows = applyFilters(await listRegistrations(), filters);
    const stamp = dayKey(new Date());
    const base = `WEP-Consultative-Meeting`;

    let body: BodyInit;
    let type: string;
    let filename: string;
    if (format === 'csv') {
      body = registrationsCsv(rows);
      type = 'text/csv; charset=utf-8';
      filename = `${base}-Registrations-${stamp}.csv`;
    } else if (format === 'attendees-csv') {
      body = attendeesCsv(rows);
      type = 'text/csv; charset=utf-8';
      filename = `${base}-Attendees-${stamp}.csv`;
    } else {
      body = new Uint8Array(await buildWorkbook(rows, describeFilters(filters), url.origin));
      type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `${base}-${stamp}.xlsx`;
    }

    return new Response(body, {
      headers: {
        'Content-Type': type,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[export]', e);
    return NextResponse.json({ message: 'Export failed. Please try again.' }, { status: 502 });
  }
}
