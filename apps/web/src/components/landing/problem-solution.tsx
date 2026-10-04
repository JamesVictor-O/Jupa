"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LogoMark, Sparkle } from "@/components/art";
import { useInView, useLoopClock, usePrefersReducedMotion } from "@/lib/motion";

/**
 * Problem vs solution, told almost entirely through motion. Both stages share one 9s clock:
 * on the left one payment crawls through bridge/gas/wait and the sale is lost; on the right
 * three customers pay from three different chains in the same time.
 */

const LOOP = 9000;

// Stage geometry in a 560 × 360 coordinate space; HTML overlays are placed in % of it.
const W = 560;
const H = 360;
const CUSTOMER = { x: 72, y: 165 };
const MERCHANT = { x: 488, y: 165 };

type Pt = { x: number; y: number };
const pos = (p: Pt): CSSProperties => ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` });
const lerp = (a: Pt, b: Pt, f: number): Pt => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (f: number) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);
const mmss = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;

export function ProblemSolution() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef);
  const [paused, setPaused] = useState(false);
  const [clock] = useLoopClock(LOOP, !reduced && !paused && inView);

  return (
    <section
      ref={rootRef}
      id="problem"
      aria-labelledby="problem-heading"
      className="relative bg-ink text-white"
    >
      <div className="mx-auto w-full max-w-7xl px-6 pb-20 pt-20 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:pl-20">
          <h2
            id="problem-heading"
            className="font-display text-[clamp(2.25rem,4.2vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em]"
          >
            Same customer.
            <br />
            <span className="text-white/45">Same coffee.</span>
          </h2>
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="flex min-h-10 items-center gap-2 self-start rounded-full bg-white/8 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint lg:self-end"
            >
              {paused ? "Play" : "Pause"} animation
            </button>
          )}
        </div>

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-2">
          <Stage
            tone="problem"
            label="Without Jupa"
            caption="Switch network, bridge, buy gas, wait. The queue walks away."
          >
            <ProblemScene t={reduced ? 8200 : clock} />
          </Stage>
          <Stage tone="solution" label="With Jupa" caption="One tap from any chain. Paid in seconds.">
            <SolutionScene t={reduced ? 8800 : clock} />
          </Stage>
        </div>
      </div>
    </section>
  );
}

function Stage({
  tone,
  label,
  caption,
  children,
}: {
  tone: "problem" | "solution";
  label: string;
  caption: string;
  children: ReactNode;
}) {
  const solution = tone === "solution";
  return (
    <figure
      className={`reveal flex flex-col rounded-3xl p-3 ring-1 ${
        solution ? "bg-ink-soft ring-mint/30" : "bg-ink-soft ring-white/10"
      }`}
    >
      <div className="flex items-center gap-2 px-3 pb-3 pt-2 text-sm font-semibold">
        <span className={`size-2 rounded-full ${solution ? "bg-mint-strong" : "bg-coral"}`} />
        {label}
      </div>
      <div aria-hidden="true" className="relative aspect-[14/9] overflow-hidden rounded-2xl bg-ink">
        {children}
      </div>
      <figcaption className="px-3 pb-2 pt-4 text-white/65">{caption}</figcaption>
    </figure>
  );
}

/* ---------- problem: one payment, four hurdles, sale lost ---------- */

const HURDLES: { at: Pt; label: string; chip: Pt }[] = [
  { at: { x: 180, y: 82 }, label: "Switch network", chip: { x: 180, y: 46 } },
  { at: { x: 262, y: 262 }, label: "Find a bridge", chip: { x: 262, y: 300 } },
  { at: { x: 344, y: 82 }, label: "Buy gas", chip: { x: 344, y: 46 } },
  { at: { x: 418, y: 222 }, label: "Wait ~15 min", chip: { x: 418, y: 262 } },
];
const PROBLEM_START: Pt = { x: 108, y: 165 };
const PROBLEM_PATH = [PROBLEM_START, ...HURDLES.map((h) => h.at)];
// [leave, arrive] for each leg; the coin then sits at that hurdle until the next leave.
const LEGS = [
  [600, 1100],
  [2000, 2500],
  [3400, 3900],
  [4800, 5300],
] as const;
const LOST_AT = 7200;

function ProblemScene({ t }: { t: number }) {
  // Where the coin is: travelling a leg, or parked at the last hurdle reached.
  let coin = PROBLEM_START;
  let reached = -1;
  LEGS.forEach(([leave, arrive], i) => {
    if (t >= arrive) {
      coin = PROBLEM_PATH[i + 1];
      reached = i;
    } else if (t >= leave) {
      coin = lerp(PROBLEM_PATH[i], PROBLEM_PATH[i + 1], easeInOut((t - leave) / (arrive - leave)));
    }
  });
  const lost = t >= LOST_AT;
  const waiting = reached === HURDLES.length - 1 && !lost;
  const secs = 872 * clamp01(t / LOST_AT) ** 1.6;
  const queue = Math.min(5, 1 + Math.floor(t / 1400));
  const travelled = PROBLEM_PATH.slice(0, reached + 2).map((p, i) => (i === reached + 1 ? coin : p));

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
        <polyline
          points={PROBLEM_PATH.map((p) => `${p.x},${p.y}`).join(" ") + ` ${MERCHANT.x - 40},${MERCHANT.y}`}
          fill="none"
          stroke="white"
          strokeOpacity="0.14"
          strokeWidth="2"
          strokeDasharray="5 7"
          strokeLinejoin="round"
        />
        <polyline
          points={travelled.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      <Clock value={mmss(secs)} tone={lost ? "bad" : "neutral"} />

      {HURDLES.map((h, i) => {
        const shown = i <= reached;
        const active = i === reached && !lost;
        return (
          <Chip key={h.label} at={h.chip} shown={shown} active={active}>
            {i === 3 && waiting ? <Spinner /> : null}
            {h.label}
          </Chip>
        );
      })}

      <Customer label="USDC on Base" />
      <Queue count={queue} leaving={lost} />
      <Coin at={coin} tone={lost ? "dead" : "plain"} />
      <Till state={lost ? "lost" : "waiting"} note="Accepts Arc only" />
    </>
  );
}

/* ---------- solution: three customers, three chains, three sales ---------- */

const SOURCES = ["Base", "Solana", "Ethereum"];
const CYCLE = LOOP / SOURCES.length;
const SOLUTION_START: Pt = { x: 108, y: 165 };
const SOLUTION_END: Pt = { x: MERCHANT.x - 40, y: MERCHANT.y };

function SolutionScene({ t }: { t: number }) {
  const c = Math.min(SOURCES.length - 1, Math.floor(t / CYCLE));
  const u = t - c * CYCLE;
  const pressing = u > 150 && u < 600;
  const f = easeInOut(clamp01((u - 550) / 800));
  const travelling = u >= 550 && u < 1350;
  const paid = u >= 1350 && u < 2800;
  const sales = c + (u >= 1350 ? 1 : 0);
  // A gentle arc instead of a straight line.
  const coin = { ...lerp(SOLUTION_START, SOLUTION_END, f), y: SOLUTION_START.y - Math.sin(f * Math.PI) * 34 };
  const secs = u < 550 ? 0 : Math.min(4, Math.ceil((u - 550) / 200));

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
        <path
          d={`M${SOLUTION_START.x} ${SOLUTION_START.y} Q ${(SOLUTION_START.x + SOLUTION_END.x) / 2} ${SOLUTION_START.y - 68} ${SOLUTION_END.x} ${SOLUTION_END.y}`}
          fill="none"
          stroke="#bde7c3"
          strokeOpacity={travelling || paid ? 0.55 : 0.18}
          strokeWidth="2"
          className="transition-[stroke-opacity] duration-300"
        />
      </svg>

      <Clock value={mmss(secs)} tone={paid ? "good" : "neutral"} />

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/80"
        style={pos({ x: MERCHANT.x, y: 268 })}
      >
        {sales} {sales === 1 ? "sale" : "sales"}
      </div>

      <Customer key={c} label={`USDC on ${SOURCES[c]}`} pay pressing={pressing} enter />
      <Queue count={Math.max(0, SOURCES.length - 1 - c)} />
      {(travelling || (u >= 550 && u < 1500)) && <Coin at={coin} tone="good" />}
      <Till state={paid ? "paid" : "waiting"} note="Paid in USDC on Arc" />
    </>
  );
}

/* ---------- pieces ---------- */

function Customer({ label, pay, pressing, enter }: { label: string; pay?: boolean; pressing?: boolean; enter?: boolean }) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${enter ? "demo-enter" : ""}`} style={pos(CUSTOMER)}>
      <div className="relative flex flex-col items-center">
        <div className="grid size-14 place-items-center rounded-full bg-lilac text-ink ring-4 ring-ink sm:size-16">
          <PersonIcon />
        </div>
        <span className="mt-2 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80 sm:text-[11px]">
          {label}
        </span>
        {pay && (
          <span
            className={`absolute -top-9 whitespace-nowrap rounded-lg bg-white px-3 py-1 text-[11px] font-bold text-ink transition-all duration-150 ${
              pressing ? "scale-90 ring-4 ring-mint/60" : ""
            }`}
          >
            Pay $4.50
          </span>
        )}
      </div>
    </div>
  );
}

function Queue({ count, leaving }: { count: number; leaving?: boolean }) {
  return (
    <div
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 gap-1.5 transition-all duration-700 ${
        leaving ? "-ml-6 opacity-0" : "opacity-100"
      }`}
      style={pos({ x: CUSTOMER.x, y: 268 })}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`size-3.5 rounded-full bg-lilac/50 transition-all duration-500 sm:size-4 ${
            i < count ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

function Coin({ at, tone }: { at: Pt; tone: "plain" | "good" | "dead" }) {
  const cls =
    tone === "good"
      ? "bg-mint text-mint-ink shadow-[0_0_24px_4px_rgb(189_231_195_/_0.55)]"
      : tone === "dead"
        ? "bg-white/20 text-white/40"
        : "bg-white text-ink";
  return (
    <span
      className={`absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-extrabold transition-colors duration-500 ${cls}`}
      style={pos(at)}
    >
      $
    </span>
  );
}

function Till({ state, note }: { state: "waiting" | "paid" | "lost"; note: string }) {
  const screen =
    state === "paid"
      ? "bg-mint-strong text-mint-ink"
      : state === "lost"
        ? "bg-coral text-ink"
        : "bg-ink-soft text-white";
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pos(MERCHANT)}>
      <div className="flex flex-col items-center">
        <div className="w-[4.5rem] rounded-xl bg-white/10 p-1.5 sm:w-20">
          <div className={`flex h-16 flex-col items-center justify-center rounded-lg transition-colors duration-300 sm:h-[4.5rem] ${screen}`}>
            {state === "paid" ? (
              <span className="demo-pop text-sm font-extrabold">Paid</span>
            ) : state === "lost" ? (
              <span className="demo-pop text-center text-[11px] font-extrabold leading-tight">
                Sale
                <br />
                lost
              </span>
            ) : (
              <>
                <span className="text-sm font-bold tabular-nums">$4.50</span>
                <span className="mt-0.5 text-[9px] text-white/50">Waiting…</span>
              </>
            )}
          </div>
        </div>
        <span className="mt-2 flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-white/55 sm:text-[11px]">
          <LogoMark className="size-2.5" />
          {note}
        </span>
      </div>
    </div>
  );
}

function Chip({ at, shown, active, children }: { at: Pt; shown: boolean; active: boolean; children: ReactNode }) {
  return (
    <span
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all duration-300 sm:text-[11px] ${
        shown ? "scale-100 opacity-100" : "scale-75 opacity-0"
      } ${active ? "bg-coral text-ink" : "bg-white/8 text-white/45 line-through decoration-white/30"}`}
      style={pos(at)}
    >
      {children}
    </span>
  );
}

function Clock({ value, tone }: { value: string; tone: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-mint" : tone === "bad" ? "text-coral" : "text-white/70";
  return (
    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5">
      <Sparkle className={`size-2.5 ${color}`} />
      <span className={`font-display text-sm font-bold tabular-nums transition-colors ${color}`}>{value}</span>
    </div>
  );
}

function Spinner() {
  return <span className="demo-spin inline-block size-2.5 rounded-full border-[1.5px] border-ink/30 border-t-ink" />;
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}
