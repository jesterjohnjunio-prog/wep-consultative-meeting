'use client';

import { useCallback, useEffect, useState } from 'react';
import { WavePath } from './WaterBackground';

const SHOW_MS = 3600;
const SHOW_MS_REDUCED = 1100;
const LEAVE_MS = 800;

/**
 * Animated intro: the WEP drop falls into the water, ripples spread and the tide rises
 * before the form is revealed. Click, tap, Enter or Escape skips it.
 */
export default function Splash() {
  const [phase, setPhase] = useState<'show' | 'leaving' | 'gone'>('show');

  const skip = useCallback(() => setPhase((p) => (p === 'show' ? 'leaving' : p)), []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(skip, reduce ? SHOW_MS_REDUCED : SHOW_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [skip]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('splash-active', phase === 'show');
    if (phase !== 'leaving') return;
    const t = window.setTimeout(() => setPhase('gone'), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      className={`splash${phase === 'leaving' ? ' is-leaving' : ''}`}
      onClick={skip}
      role="status"
      aria-live="polite"
      aria-label="Loading the registration form"
    >
      <div className="splash-glow" />

      <div className="splash-stage">
        <div className="splash-fall">
          <div className="splash-bob">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="splash-logo" src="/wep-logo.png" alt="Water Efficiency Program logo" width={725} height={987} />
            <span className="splash-shine" />
          </div>
        </div>
        <div className="splash-ripples">
          <span />
          <span />
          <span />
        </div>
        <div className="splash-splash">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="splash-text">
        <p className="splash-kicker">MWSS Regulatory Office</p>
        <h1 className="splash-title">
          Water Efficiency <span>Program</span>
        </h1>
        <p className="splash-sub">Barangay Consultative Meeting</p>
      </div>

      <div className="splash-water">
        <div className="wave-track splash-wave-back">
          <WavePath />
          <WavePath />
        </div>
        <div className="wave-track splash-wave-front">
          <WavePath />
          <WavePath />
        </div>
        <div className="splash-water-body" />
      </div>

      <div className="splash-loader">
        <div className="splash-loader-track">
          <span />
        </div>
        <p>Inihahanda ang form… · Preparing your form…</p>
      </div>

      <button
        type="button"
        className="splash-skip"
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
      >
        Laktawan · Skip
      </button>
    </div>
  );
}
