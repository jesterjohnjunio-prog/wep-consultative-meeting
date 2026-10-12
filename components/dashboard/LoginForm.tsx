'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Alert, ArrowRight, Lock } from '../Icons';

export default function LoginForm({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Sign-in failed.');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <section className="form-card login-card">
      <div className="login-logos">
        <Image src="/mwss-ro-logo.png" alt="MWSS Regulatory Office" width={1694} height={369} className="logo-mwss" priority />
        <Image src="/wep-logo.png" alt="Water Efficiency Program" width={725} height={987} className="logo-wep" priority />
      </div>
      <p className="section-kicker">Results dashboard</p>
      <h1 className="login-title">Barangay Consultative Meeting</h1>
      <p className="login-lead">For MWSS RO Water Efficiency Committee use only. Sign in to view and export registrations.</p>

      {configured ? (
        <form onSubmit={submit} noValidate>
          <div className={`field${error ? ' has-error' : ''}`}>
            <label htmlFor="dash-password" className="label">
              <span className="label-fil">Dashboard password</span>
            </label>
            <div className="control with-icon">
              <span className="control-icon">
                <Lock />
              </span>
              <input
                id="dash-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'dash-password-err' : undefined}
                autoFocus
              />
            </div>
            {error && (
              <p className="field-error" id="dash-password-err" role="alert">
                <Alert width={16} height={16} />
                {error}
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={busy || !password}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {busy ? 'Signing in…' : 'Sign in'}
            {!busy && <ArrowRight />}
          </button>
        </form>
      ) : (
        <p className="callout callout-warn">
          <Alert />
          <span>
            The dashboard is not set up yet.
            <small>Add a DASHBOARD_PASSWORD environment variable in Vercel (Project → Settings → Environment Variables), then redeploy.</small>
          </span>
        </p>
      )}
    </section>
  );
}
