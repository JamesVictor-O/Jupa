import { HorizonOrbits } from "./horizon-orbits";

/** Jupa artwork drawn as SVG so it stays sharp and weighs nothing. All decorative unless noted. */

export function LogoMark({ className }: { className?: string }) {
  // Angular "J" with a detached pixel, echoing a QR finder block.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="currentColor">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <path d="M14 2h16v8h-6v12a8 8 0 0 1-8 8H6a4 4 0 0 1-4-4v-6h8v2h6V10h-2z" />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
    </svg>
  );
}

export function octagon(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Concentric soft octagon bands behind the hero, like light refracting through glass. */
export function OctagonField({ className }: { className?: string }) {
  const rings = Array.from({ length: 9 }, (_, i) => 120 + i * 95);
  return (
    <svg viewBox="0 0 1600 1200" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="field-glow" cx="68%" cy="48%" r="60%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="field-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="1600" height="1200" fill="url(#field-glow)" />
      <g fill="none" stroke="#ffffff" filter="url(#field-blur)">
        {rings.map((r, i) => (
          <polygon
            key={r}
            points={octagon(1080, 560, r)}
            strokeWidth={i % 2 ? 22 : 40}
            strokeOpacity={0.55 - i * 0.04}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Dark sweeping plane at the bottom of the hero. A mint coin carrying the Jupa mark sends out
 * octagon "tap to pay" ripples while three coins (USDC on different chains) orbit into it.
 * Motion lives in globals.css (.horizon-*) and is off under prefers-reduced-motion.
 */
export function Horizon({ className }: { className?: string }) {
  const cx = 310;
  const cy = 236;
  const PLANE = "M0 320C30 170 220 70 400 70c90 0 160 20 260 50l940 200z";
  const rings = [96, 140, 188, 240, 296];
  const origin = { transformOrigin: `${cx}px ${cy}px` };

  return (
    <svg viewBox="0 0 1600 320" preserveAspectRatio="xMinYMax slice" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="horizon-coin" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#e4f6e7" />
          <stop offset="0.55" stopColor="#bde7c3" />
          <stop offset="1" stopColor="#8fd39b" />
        </radialGradient>
        <radialGradient id="horizon-glow">
          <stop offset="0" stopColor="#bde7c3" stopOpacity="0.32" />
          <stop offset="1" stopColor="#bde7c3" stopOpacity="0" />
        </radialGradient>
        <clipPath id="plane">
          <path d={PLANE} />
        </clipPath>
      </defs>

      <path d={PLANE} fill="#0e0e12" />

      <g clipPath="url(#plane)">
        <circle cx={cx} cy={cy} r="170" fill="url(#horizon-glow)" />

        {/* Static rings: the brand's octagon, fading outward. */}
        <g fill="none" stroke="#bde7c3" strokeLinejoin="round">
          {rings.map((r, i) => (
            <polygon
              key={r}
              points={octagon(cx, cy, r)}
              strokeOpacity={0.3 - i * 0.05}
              strokeWidth={1.2}
              strokeDasharray={i % 2 ? "2 7" : undefined}
            />
          ))}
        </g>

        {/* Tap-to-pay ripples. */}
        <g fill="none" stroke="#bde7c3" strokeWidth="1.5" strokeLinejoin="round">
          {[0, 1, 2].map((i) => (
            <polygon
              key={i}
              points={octagon(cx, cy, 70)}
              className="horizon-ripple"
              style={{ ...origin, animationDelay: `${i * 1.6}s` }}
            />
          ))}
        </g>

        {/* Coins from different chains orbiting into one balance. */}
        <HorizonOrbits cx={cx} cy={cy} />
      </g>

      {/* The coin. */}
      <circle cx={cx} cy={cy} r="60" fill="url(#horizon-coin)" />
      <circle cx={cx} cy={cy} r="49" fill="none" stroke="#12341a" strokeOpacity="0.18" strokeWidth="1.5" />
      <svg x={cx - 22} y={cy - 22} width="44" height="44" viewBox="0 0 32 32" fill="#0e0e12">
        <rect x="2" y="2" width="8" height="8" rx="1" />
        <path d="M14 2h16v8h-6v12a8 8 0 0 1-8 8H6a4 4 0 0 1-4-4v-6h8v2h6V10h-2z" />
      </svg>
    </svg>
  );
}
