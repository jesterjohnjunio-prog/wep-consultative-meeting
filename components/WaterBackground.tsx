// Decorative, fixed ocean backdrop: light rays, rising bubbles and layered waves.
const BUBBLES = [
  { l: 4, s: 10, d: 14, w: 0 },
  { l: 11, s: 18, d: 19, w: 3 },
  { l: 19, s: 8, d: 12, w: 7 },
  { l: 27, s: 14, d: 17, w: 2 },
  { l: 36, s: 6, d: 11, w: 9 },
  { l: 44, s: 22, d: 23, w: 5 },
  { l: 52, s: 9, d: 13, w: 1 },
  { l: 61, s: 16, d: 18, w: 11 },
  { l: 69, s: 7, d: 12, w: 4 },
  { l: 76, s: 20, d: 21, w: 8 },
  { l: 84, s: 11, d: 15, w: 2 },
  { l: 91, s: 15, d: 20, w: 6 },
  { l: 97, s: 8, d: 13, w: 10 },
];

export function WavePath({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 60 C 240 10 480 10 720 60 S 1200 110 1440 60 V120 H0 Z" />
    </svg>
  );
}

export default function WaterBackground() {
  return (
    <div className="ocean" aria-hidden="true">
      <div className="ocean-rays">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="ocean-bubbles">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            style={{
              left: `${b.l}%`,
              width: b.s,
              height: b.s,
              animationDuration: `${b.d}s`,
              animationDelay: `-${b.w}s`,
            }}
          />
        ))}
      </div>
      <div className="ocean-waves">
        <div className="wave-track wave-3">
          <WavePath />
          <WavePath />
        </div>
        <div className="wave-track wave-2">
          <WavePath />
          <WavePath />
        </div>
        <div className="wave-track wave-1">
          <WavePath />
          <WavePath />
        </div>
      </div>
    </div>
  );
}
