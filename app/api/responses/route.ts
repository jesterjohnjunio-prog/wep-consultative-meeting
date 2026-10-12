import { NextResponse } from 'next/server';
import { AirtableError, ConfigError, getSchemaStatus, listRegistrations } from '@/lib/airtable';
import { isAuthenticated } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: 'Not signed in.' }, { status: 401, headers: noStore });
  }
  try {
    const [records, schema] = await Promise.all([
      listRegistrations().catch((e) => {
        // A missing table just means setup has not run yet — the schema banner explains it.
        if (e instanceof AirtableError && (e.status === 404 || e.status === 403)) return [];
        throw e;
      }),
      getSchemaStatus(),
    ]);
    return NextResponse.json({ records, schema, fetchedAt: new Date().toISOString() }, { headers: noStore });
  } catch (e) {
    const message =
      e instanceof ConfigError
        ? 'Airtable is not connected: AIRTABLE_TOKEN is missing in Vercel → Settings → Environment Variables. Add it, then redeploy. Open /api/health to check.'
        : e instanceof AirtableError
          ? `Airtable: ${e.message}`
          : 'Could not load responses.';
    console.error('[responses]', e);
    return NextResponse.json({ message }, { status: 502, headers: noStore });
  }
}
