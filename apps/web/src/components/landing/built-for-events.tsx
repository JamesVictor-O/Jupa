import type { ReactNode } from "react";
import { LogoMark, Sparkle, octagon } from "@/components/art";

/**
 * The first market from the PRD: vendors at crypto events. Three stalls whose tills cycle
 * amount -> QR -> Paid on staggered clocks (CSS only), plus a ticker of receipts.
 * With reduced motion every till simply shows Paid and the ticker stands still.
 */

const STALLS = [
  {
    title: "Food & coffee",
    amount: "$4.50",
    item: "Flat white",
    awning: "#bde7c3",
    icon: <CupIcon />,
    delay: "0s",
  },
  {
    title: "Merch",
    amount: "$25.00",
    item: "Hackathon tee",
    awning: "#c9b8f5",
    icon: <TeeIcon />,
    delay: "-2.4s",
  },
  {
    title: "Tickets",
    amount: "$40.00",
    item: "Day pass",
    awning: "#ffffff",
    icon: <TicketIcon />,
    delay: "-4.8s",
  },
];

const RECEIPTS = [
  { amount: "$4.50", item: "Flat white", from: "Base" },
  { amount: "$25.00", item: "Hackathon tee", from: "Arc" },
  { amount: "$12.00", item: "Burrito", from: "Solana" },
  { amount: "$40.00", item: "Day pass", from: "Ethereum" },
  { amount: "$6.00", item: "Cold brew", from: "Arbitrum" },
  { amount: "$18.00", item: "Sticker pack", from: "Base" },
  { amount: "$9.50", item: "Bao buns", from: "Arc" },
  { amount: "$35.00", item: "Hoodie", from: "Solana" },
];

export function BuiltForEvents() {
  return (
    <section id="merchants" aria-labelledby="events-heading" className="relative isolate overflow-hidden bg-canvas">
      {/* Dark curve closing How it works above. */}
      <svg
        viewBox="0 0 1600 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 -z-10 h-16 w-full sm:h-24"
        aria-hidden="true"
      >
        <path d="M0 0h1600v20C1240 20 1100 110 760 110 470 110 260 60 0 60z" fill="#0e0e12" />
      </svg>

      <div className="mx-auto w-full max-w-7xl px-6 pb-16 pt-36 lg:px-12 lg:pb-20 lg:pt-44">
        <div className="reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:pl-20">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Sparkle className="size-3.5 text-ink" />
              Built for events
            </p>
            <h2
              id="events-heading"
              className="mt-5 font-display text-[clamp(2.25rem,4.2vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em] text-balance"
            >
              Made for the
              <br />
              busiest counters
            </h2>
          </div>
          <p className="max-w-sm text-lg text-muted text-pretty lg:pb-2">
            Conferences, hackathons and meetups, where the whole queue already holds USDC.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3 lg:mt-16">
          {STALLS.map((s) => (
            <li key={s.title} className="reveal rounded-3xl bg-surface p-3 shadow-pill">
              <Stall awning={s.awning} icon={s.icon} amount={s.amount} delay={s.delay} />
              <div className="flex items-center justify-between px-3 pb-3 pt-5">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.item}</p>
                </div>
                <span className="rounded-full bg-canvas px-3 py-1.5 text-sm font-bold tabular-nums">{s.amount}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ReceiptTicker />
    </section>
  );
}

/* ---------- a stall vignette ---------- */

function Stall({ awning, icon, amount, delay }: { awning: string; icon: ReactNode; amount: string; delay: string }) {
  const stripes = 7;
  return (
    <div aria-hidden="true" className="relative h-72 overflow-hidden rounded-2xl bg-canvas">
      {/* back wall pattern */}
      <svg viewBox="0 0 300 260" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        {[50, 90, 130, 170].map((r, i) => (
          <polygon key={r} points={octagon(150, 150, r)} fill="none" stroke="#0e0e12" strokeOpacity={0.06 - i * 0.01} />
        ))}
      </svg>

      {/* awning: alternating stripes with a scalloped edge */}
      <svg viewBox="0 0 300 64" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-16 w-full">
        {Array.from({ length: stripes }, (_, i) => {
          const w = 300 / stripes;
          const x = i * w;
          const fill = i % 2 ? awning : "#0e0e12";
          return (
            <path
              key={i}
              d={`M${x} 0h${w}v44a${w / 2} ${w / 2.6} 0 0 1 -${w} 0z`}
              fill={fill}
              stroke={awning === "#ffffff" ? "#0e0e12" : "none"}
              strokeOpacity="0.15"
            />
          );
        })}
      </svg>

      {/* counter */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-ink" />
      <div className="absolute inset-x-0 bottom-16 h-2 bg-ink-soft" />

      {/* item on the counter */}
      <div className="absolute bottom-[4.5rem] left-[14%] text-ink">{icon}</div>

      {/* till */}
      <div className="absolute bottom-[4.5rem] right-[12%]">
        <div className="w-24 rounded-2xl bg-ink p-1.5 shadow-float">
          <div className="relative h-28 overflow-hidden rounded-xl bg-surface">
            <div className="till-layer till-amount absolute inset-0 grid place-content-center text-center" style={{ animationDelay: delay }}>
              <p className="text-[9px] font-semibold text-muted">Charge</p>
              <p className="font-display text-lg font-bold tabular-nums">{amount}</p>
            </div>
            <div className="till-layer till-qr absolute inset-0 grid place-items-center" style={{ animationDelay: delay }}>
              <FakeQR />
            </div>
            <div
              className="till-layer till-paid absolute inset-0 grid place-content-center justify-items-center gap-1 bg-mint-strong text-mint-ink"
              style={{ animationDelay: delay }}
            >
              <span className="grid size-7 place-items-center rounded-full bg-ink text-mint">
                <CheckIcon />
              </span>
              <span className="text-sm font-extrabold">Paid</span>
            </div>
          </div>
        </div>
        <div className="mx-auto h-3 w-8 bg-ink-soft" />
      </div>

      <LogoMark className="absolute bottom-5 left-5 size-5 text-white/30" />
    </div>
  );
}

/** Deterministic QR-looking block (decorative, not scannable). */
function FakeQR() {
  const bits = "1011010011101001010111001011010110011100101101001110100101011100";
  return (
    <svg viewBox="0 0 10 10" className="size-16" shapeRendering="crispEdges">
      {[
        [0, 0],
        [7, 0],
        [0, 7],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width="3" height="3" fill="#0e0e12" />
          <rect x={x + 0.6} y={y + 0.6} width="1.8" height="1.8" fill="#fff" />
          <rect x={x + 1.1} y={y + 1.1} width="0.8" height="0.8" fill="#0e0e12" />
        </g>
      ))}
      {bits.split("").map((b, i) => {
        const x = 3 + (i % 4);
        const y = Math.floor(i / 4) % 10;
        const inFinder = (x < 3 && y < 3) || (x > 6 && y < 3) || (x < 3 && y > 6);
        return b === "1" && !inFinder ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0e0e12" /> : null;
      })}
      {bits
        .slice(0, 24)
        .split("")
        .map((b, i) =>
          b === "1" ? <rect key={`b${i}`} x={7 + (i % 3)} y={4 + Math.floor(i / 3) % 6} width="1" height="1" fill="#0e0e12" /> : null,
        )}
    </svg>
  );
}

/* ---------- ticker ---------- */

function ReceiptTicker() {
  const row = [...RECEIPTS, ...RECEIPTS];
  return (
    <div className="reveal bg-ink py-5 text-white">
      <p className="sr-only">Example receipts: payments from several chains, all marked Paid.</p>
      <div aria-hidden="true" className="ticker-mask overflow-hidden">
        <ul className="ticker flex w-max gap-3">
          {row.map((r, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-full bg-white/8 py-2 pl-2 pr-4 text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-mint text-mint-ink">
                <CheckIcon />
              </span>
              <span className="font-bold tabular-nums">{r.amount}</span>
              <span className="text-white/70">{r.item}</span>
              <span className="text-white/40">· from {r.from}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- icons (decorative) ---------- */

function CupIcon() {
  return (
    <svg viewBox="0 0 64 64" className="size-20" fill="none" aria-hidden="true">
      <path d="M22 10c0 4 4 4 4 8M32 8c0 4 4 4 4 8" stroke="#0e0e12" strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 24h36l-4 30a4 4 0 0 1-4 3.5H20A4 4 0 0 1 16 54z" fill="#0e0e12" />
      <path d="M48 30h3a6 6 0 0 1 0 12h-4.5" stroke="#0e0e12" strokeWidth="4" />
      <rect x="18" y="34" width="24" height="10" rx="2" fill="#bde7c3" />
    </svg>
  );
}

function TeeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="size-20" aria-hidden="true">
      <path d="M22 8 8 16l5 12 7-3v31h24V25l7 3 5-12-14-8c-1 5-5 8-10 8s-9-3-10-8z" fill="#0e0e12" />
      <rect x="25" y="30" width="14" height="8" rx="2" fill="#c9b8f5" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 64 64" className="size-20" aria-hidden="true">
      <g transform="rotate(-12 32 32)">
        <path d="M6 18h52v9a5 5 0 0 0 0 10v9H6v-9a5 5 0 0 0 0-10z" fill="#0e0e12" />
        <path d="M42 20v24" stroke="#f1f2ef" strokeWidth="1.5" strokeDasharray="3 3" />
        <rect x="13" y="26" width="22" height="4" rx="1" fill="#f1f2ef" />
        <rect x="13" y="33" width="14" height="4" rx="1" fill="#bde7c3" />
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}
