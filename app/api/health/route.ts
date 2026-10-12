import { NextResponse } from 'next/server';
import { connectionStatus } from '@/lib/airtable';
import { dashboardConfigured } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Setup check: open /api/health on the deployed site to see whether Airtable and the
 * dashboard are configured. Never returns secret values.
 */
export async function GET() {
  const airtable = await connectionStatus();
  const dashboardPassword = dashboardConfigured();
  const ok = airtable.ok && dashboardPassword;
  return NextResponse.json(
    {
      ok,
      deployment: process.env.VERCEL_ENV ?? 'local',
      airtable: {
        connected: airtable.ok,
        tokenVariable: airtable.tokenVariable,
        base: airtable.usingDefaultBase ? 'WEP base (built-in default)' : 'from AIRTABLE_BASE_ID',
        ...(airtable.problem ? { problem: airtable.problem } : {}),
      },
      dashboard: {
        passwordSet: dashboardPassword,
        ...(dashboardPassword ? {} : { problem: 'DASHBOARD_PASSWORD is missing — the dashboard cannot be opened.' }),
      },
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
