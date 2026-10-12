import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'wep_dashboard';
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

export function dashboardConfigured() {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

function secret() {
  return (
    process.env.SESSION_SECRET ||
    createHash('sha256')
      .update(`wep-dashboard:${process.env.DASHBOARD_PASSWORD ?? ''}:${process.env.AIRTABLE_TOKEN ?? ''}`)
      .digest('hex')
  );
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string) {
  const expected = process.env.DASHBOARD_PASSWORD;
  return Boolean(expected) && safeEqual(input, expected as string);
}

export function createSessionToken() {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE);
  return `${exp}.${sign(exp)}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token || !dashboardConfigured()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) * 1000 > Date.now();
}

export async function isAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
};

/** Rejects cross-site POSTs to admin endpoints. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
