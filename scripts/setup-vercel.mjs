#!/usr/bin/env node
// Connects the Vercel deployment to Airtable in one step:
//
//   npm run setup:vercel
//
// 1. Signs in to Vercel (opens the browser) if needed.
// 2. Links this folder to your existing Vercel project (first run only).
// 3. Copies AIRTABLE_TOKEN from .env.local into Vercel (always, so a new token replaces the old one),
//    and DASHBOARD_PASSWORD / SESSION_SECRET only if Vercel does not have them yet.
// 4. Redeploys production so the values take effect.
//
// Values are passed to the Vercel CLI through stdin, so they are never printed.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = 'vercel@60.1.3';
const TARGETS = 'production,preview';
const isWin = process.platform === 'win32';

function vercel(args, { input, capture = false } = {}) {
  const stdio = input !== undefined ? ['pipe', 'inherit', 'inherit'] : capture ? ['ignore', 'pipe', 'pipe'] : 'inherit';
  // Arguments are fixed strings from this script; secret values only travel through stdin.
  const command = ['npx', '--yes', CLI, ...args].join(' ');
  return spawnSync(command, { cwd: ROOT, stdio, input, encoding: 'utf8', shell: true });
}

/** Names of the variables Vercel already has for production (values are never printed). */
function existingProductionVars() {
  const r = vercel(['env', 'ls', 'production', '--json'], { capture: true });
  if (r.status !== 0) return null;
  return new Set([...r.stdout.matchAll(/"key"\s*:\s*"([A-Z0-9_]+)"/g)].map((m) => m[1]));
}

function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const step = (n, text) => console.log(`\n\x1b[36m[${n}/4]\x1b[0m ${text}`);
const fail = (text) => {
  console.error(`\n\x1b[31m✖ ${text}\x1b[0m`);
  process.exit(1);
};

const local = readEnvFile(join(ROOT, '.env.local'));
if (!local.AIRTABLE_TOKEN?.startsWith('pat')) {
  fail('Put your Airtable token in .env.local first, e.g.  AIRTABLE_TOKEN=pat...');
}

step(1, 'Checking your Vercel sign-in…');
if (vercel(['whoami'], { capture: true }).status !== 0) {
  console.log('Not signed in — a browser window will open to sign in to Vercel.');
  if (vercel(['login']).status !== 0) fail('Vercel sign-in did not complete.');
}

step(2, 'Linking this folder to your Vercel project…');
if (existsSync(join(ROOT, '.vercel', 'project.json'))) {
  console.log('Already linked.');
} else {
  console.log('Answer the prompts and choose your EXISTING project (e.g. "wep-consultative-meeting").');
  if (vercel(['link']).status !== 0) fail('Linking was cancelled.');
}

step(3, 'Saving environment variables in Vercel…');
const existing = existingProductionVars();
if (!existing) fail('Could not read the current Vercel variables, so nothing was changed.');

const vars = [
  { name: 'AIRTABLE_TOKEN', value: local.AIRTABLE_TOKEN, overwrite: true },
  { name: 'DASHBOARD_PASSWORD', value: local.DASHBOARD_PASSWORD, overwrite: false },
  { name: 'SESSION_SECRET', value: local.SESSION_SECRET, overwrite: false },
];
for (const v of vars) {
  if (!v.value) continue;
  if (!v.overwrite && existing.has(v.name)) {
    console.log(`• ${v.name}: already set in Vercel — kept as is.`);
    continue;
  }
  const r = vercel(['env', 'add', v.name, TARGETS, '--force', '--sensitive', '--yes'], { input: `${v.value}\n` });
  if (r.status !== 0) fail(`Could not save ${v.name}.`);
  console.log(`• ${v.name}: saved for ${TARGETS.replace(',', ' and ')}.`);
}

step(4, 'Redeploying production so the new settings take effect…');
if (vercel(['deploy', '--prod', '--yes']).status !== 0) {
  fail('Redeploy failed. You can also redeploy from Vercel → Deployments → ⋯ → Redeploy.');
}

console.log('\n\x1b[32m✔ Done.\x1b[0m Open https://<your-site>/api/health — it should show "connected": true.');
