import { NextResponse } from 'next/server';
import { AirtableError, ConfigError, ensureSchema } from '@/lib/airtable';
import { isAuthenticated, sameOrigin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Creates the Airtable table / columns the form needs. Signed-in dashboard users only. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  if (!(await isAuthenticated())) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });
  try {
    const report = await ensureSchema();
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const message =
      e instanceof ConfigError
        ? e.message
        : e instanceof AirtableError
          ? `Airtable (${e.status} ${e.type}): ${e.message}. Check that the token has schema.bases:write access.`
          : 'Setup failed.';
    console.error('[setup]', e);
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
