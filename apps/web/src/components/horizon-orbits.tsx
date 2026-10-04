"use client";

import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * Coins (USDC from different chains) on flattened orbits around the hero coin.
 * SMIL moves them along each ellipse so they stay round; reduced motion parks them in place.
 */
const ORBITS = [
  { rx: 150, ry: 48, color: "#bde7c3", r: 6, dur: 14, start: 0.1 },
  { rx: 205, ry: 64, color: "#c9b8f5", r: 5, dur: 21, start: 0.55 },
  { rx: 262, ry: 80, color: "#ffffff", r: 4, dur: 30, start: 0.8 },
];

/** Ellipse as a path starting at its rightmost point, clockwise. */
function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}Z`;
}

export function HorizonOrbits({ cx, cy }: { cx: number; cy: number }) {
  const reduced = usePrefersReducedMotion();
  return (
    <g>
      {ORBITS.map((o) => {
        const d = ellipsePath(cx, cy, o.rx, o.ry);
        const angle = o.start * Math.PI * 2;
        return (
          <g key={o.rx}>
            <path d={d} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
            {reduced ? (
              <circle cx={cx + o.rx * Math.cos(angle)} cy={cy + o.ry * Math.sin(angle)} r={o.r} fill={o.color} />
            ) : (
              <circle r={o.r} fill={o.color}>
                <animateMotion
                  dur={`${o.dur}s`}
                  repeatCount="indefinite"
                  path={d}
                  begin={`-${o.start * o.dur}s`}
                />
              </circle>
            )}
          </g>
        );
      })}
    </g>
  );
}
