"use client";

import type { CSSProperties, ReactNode } from "react";
import { LogoMark, Sparkle } from "@/components/art";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * The PRD's architecture ("money never touches Jupa") as a living diagram:
 * USDC flows wallet -> Circle -> merchant on Arc; Jupa only watches and tells the till.
 * Animation is SVG SMIL on one shared 6s loop so every dot stays in sync without JS timers.
 */

const W = 1120;
const H = 520;
const LOOP = "6s";
const pos = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

// Connector paths in stage coordinates. Node centres: left x=150, middle x=560, right x=960.
const PATHS = {
  pay: "M260 250 C 360 250, 350 300, 450 300", // wallet -> Circle
  settle: "M670 300 C 760 300, 760 330, 850 330", // Circle -> merchant on Arc
  route: "M260 120 C 350 120, 360 170, 450 170", // checkout -> App Kit
  rails: "M560 205 L560 265", // App Kit -> CCTP / Gateway
  registry: "M850 130 C 660 50, 420 50, 262 108", // registry -> checkout (payout address)
  watch: "M960 365 C 960 450, 780 460, 670 460", // merchant transfer -> Jupa indexer
  paid: "M450 460 C 360 460, 350 390, 260 390", // Jupa -> till
};

export function Infrastructure() {
  return (
    <section id="infrastructure" aria-labelledby="infra-heading" className="relative isolate overflow-hidden bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-24 lg:px-12 lg:pb-32 lg:pt-32">
        <div className="reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:pl-20">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Sparkle className="size-3.5 text-ink" />
              Infrastructure
            </p>
            <h2
              id="infra-heading"
              className="mt-5 font-display text-[clamp(2.25rem,4.2vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em] text-balance"
            >
              Money never
              <br />
              touches Jupa
            </h2>
          </div>
          <p className="max-w-sm text-lg text-muted text-pretty lg:pb-2">
            Circle moves the USDC. Arc settles it. Jupa only watches, and tells the till.
          </p>
        </div>

        <ArchitectureStage />
        <ArchitectureList />

        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Tile kicker="Settlement" title="Arc" body="Final in about a block. USDC is the gas." tone="mint" />
          <Tile kicker="Cross-chain" title="Circle CCTP" body="App Kit and Gateway bring USDC onto Arc." />
          <Tile kicker="Payout address" title="Onchain" body="Read from the store registry, never the browser." />
          <Tile kicker="Funds held by Jupa" title="$0" body="No custody, no keys, no pooled balances." tone="ink" />
        </ul>
      </div>
    </section>
  );
}

/* ---------- desktop stage ---------- */

function ArchitectureStage() {
  const reduced = usePrefersReducedMotion();

  return (
    <figure className="reveal mt-14 hidden rounded-3xl bg-surface p-4 shadow-pill lg:block">
      <div className="relative aspect-[1120/520]">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
          {/* Column panels */}
          <Panel x={30} y={30} w={240} h={410} label="Customer & cashier" />
          <Panel x={440} y={30} w={240} h={330} label="Circle" />
          <Panel x={850} y={30} w={240} h={410} label="Arc" accent />
          <Panel x={440} y={390} w={240} h={110} label="Jupa" dashed />

          {/* Information flows (dashed) */}
          <Wire d={PATHS.route} />
          <Wire d={PATHS.rails} />
          <Wire d={PATHS.registry} color="#a48ae8" label="payout address" lx={766} ly={60} />
          <Wire d={PATHS.watch} label="final transfer" lx={800} ly={478} />
          <Wire d={PATHS.paid} label="Paid" lx={338} ly={448} />

          {/* Money flow (solid) */}
          <path d={PATHS.pay} fill="none" stroke="#8fd39b" strokeWidth="3" strokeLinecap="round" />
          <path d={PATHS.settle} fill="none" stroke="#8fd39b" strokeWidth="3" strokeLinecap="round" />
          <WireLabel x={352} y={262}>USDC</WireLabel>
          <WireLabel x={760} y={296}>USDC</WireLabel>

          {!reduced && (
            <>
              <Pulse path={PATHS.registry} from={0} to={0.14} color="#a48ae8" r={5} />
              <Pulse path={PATHS.pay} from={0.18} to={0.36} color="#8fd39b" r={8} glow />
              <Pulse path={PATHS.settle} from={0.36} to={0.54} color="#8fd39b" r={8} glow />
              <Pulse path={PATHS.watch} from={0.58} to={0.7} color="#0e0e12" r={5} />
              <Pulse path={PATHS.paid} from={0.7} to={0.8} color="#0e0e12" r={5} />
            </>
          )}
        </svg>

        <Node x={150} y={120} title="Checkout" sub="Customer taps Pay" icon={<TapIcon />} />
        <Node x={150} y={250} title="Customer wallet" sub="Signs one approval" icon={<WalletIcon />} />
        <Node x={150} y={390} title="Till" sub="Shows Paid" icon={<TillIcon />} flash={!reduced} />

        <Node x={560} y={170} title="App Kit" sub="Picks the fastest route" icon={<RouteIcon />} />
        <Node x={560} y={300} title="CCTP + Gateway" sub="Moves USDC onto Arc" icon={<RailsIcon />} />

        <Node x={960} y={130} title="Store registry" sub="Store ID → payout address" icon={<LogoMark className="size-4" />} />
        <Node x={960} y={330} title="Merchant payout" sub="USDC lands here" icon={<CoinIcon />} tone="mint" />

        <Node x={560} y={460} title="Charges + indexer" sub="Watches Arc, holds no funds" icon={<EyeIcon />} tone="ink" />
      </div>
      <figcaption className="sr-only">
        The checkout reads the store&apos;s payout address from the registry on Arc. The customer&apos;s wallet signs one
        approval, Circle App Kit routes it, and CCTP or Gateway moves the USDC onto Arc straight to the merchant. Jupa&apos;s
        indexer only sees the final transfer and tells the till Paid.
      </figcaption>
    </figure>
  );
}

function Panel({
  x,
  y,
  w,
  h,
  label,
  accent,
  dashed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  accent?: boolean;
  dashed?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="22"
        fill={accent ? "#bde7c3" : "#f1f2ef"}
        fillOpacity={accent ? 0.35 : 1}
        stroke={dashed ? "#0e0e12" : "none"}
        strokeOpacity="0.25"
        strokeDasharray={dashed ? "6 6" : undefined}
      />
      <text x={x + 18} y={y + 28} fontSize="13" fontWeight="700" fill="#62665f">
        {label}
      </text>
    </g>
  );
}

function Wire({ d, color = "#0e0e12", label, lx, ly }: { d: string; color?: string; label?: string; lx?: number; ly?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="5 6" />
      {label && lx !== undefined && ly !== undefined && <WireLabel x={lx} y={ly}>{label}</WireLabel>}
    </>
  );
}

function WireLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize="12" fontWeight="600" fill="#62665f" textAnchor="middle">
      {children}
    </text>
  );
}

/** A dot that travels `path` during [from, to] of the shared loop and is hidden otherwise. */
function Pulse({ path, from, to, color, r, glow }: { path: string; from: number; to: number; color: string; r: number; glow?: boolean }) {
  const keyTimes = `0;${from};${to};1`;
  return (
    <g>
      {glow && (
        <circle r={r * 2.2} fill={color} opacity="0">
          <animateMotion dur={LOOP} repeatCount="indefinite" path={path} keyPoints="0;0;1;1" keyTimes={keyTimes} calcMode="linear" />
          <animate attributeName="opacity" dur={LOOP} repeatCount="indefinite" values="0;0;0.35;0.35;0;0" keyTimes={`0;${from};${from + 0.01};${to};${to + 0.01};1`} />
        </circle>
      )}
      <circle r={r} fill={color} opacity="0">
        <animateMotion dur={LOOP} repeatCount="indefinite" path={path} keyPoints="0;0;1;1" keyTimes={keyTimes} calcMode="linear" />
        <animate attributeName="opacity" dur={LOOP} repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes={`0;${from};${from + 0.01};${to};${to + 0.01};1`} />
      </circle>
    </g>
  );
}

function Node({
  x,
  y,
  title,
  sub,
  icon,
  tone = "plain",
  flash,
}: {
  x: number;
  y: number;
  title: string;
  sub: string;
  icon: ReactNode;
  tone?: "plain" | "mint" | "ink";
  flash?: boolean;
}) {
  const box =
    tone === "mint"
      ? "bg-mint text-mint-ink ring-mint-strong"
      : tone === "ink"
        ? "bg-ink text-white ring-ink"
        : "bg-surface text-ink ring-line";
  const badge = tone === "ink" ? "bg-white/10 text-mint" : tone === "mint" ? "bg-ink text-mint" : "bg-canvas text-ink";
  const subColor = tone === "ink" ? "text-white/60" : tone === "mint" ? "text-mint-ink/75" : "text-muted";
  return (
    <div
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-2xl px-3.5 py-3 shadow-pill ring-1 ${box} ${
        flash ? "till-flash" : ""
      }`}
      style={{ ...pos(x, y), width: `${(220 / W) * 100}%` }}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${badge}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{title}</span>
        <span className={`block truncate text-xs ${subColor}`}>{sub}</span>
      </span>
    </div>
  );
}

/* ---------- mobile: same story as a vertical sequence ---------- */

const STEPS = [
  { title: "Checkout", body: "Reads the store's payout address from the registry on Arc.", icon: <TapIcon /> },
  { title: "Customer wallet", body: "Signs one approval, labelled as a payment to the store.", icon: <WalletIcon /> },
  { title: "Circle", body: "App Kit picks the route; CCTP or Gateway moves the USDC onto Arc.", icon: <RailsIcon /> },
  { title: "Merchant payout", body: "USDC lands straight in the merchant's address on Arc.", icon: <CoinIcon />, money: true },
  { title: "Jupa", body: "Sees the final transfer and turns the till green. Holds nothing.", icon: <EyeIcon /> },
];

function ArchitectureList() {
  return (
    <ol className="reveal mt-12 flex flex-col rounded-3xl bg-surface p-5 shadow-pill lg:hidden">
      {STEPS.map((s, i) => (
        <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < STEPS.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute left-[1.1rem] top-10 h-[calc(100%-2.5rem)] w-0.5 ${
                i === 1 || i === 2 ? "bg-mint-strong" : "border-l-2 border-dashed border-line"
              }`}
            />
          )}
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${s.money ? "bg-mint text-mint-ink" : "bg-canvas text-ink"}`}
          >
            {s.icon}
          </span>
          <div className="pt-1">
            <p className="font-bold">{s.title}</p>
            <p className="mt-1 text-sm text-muted text-pretty">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Tile({ kicker, title, body, tone = "plain" }: { kicker: string; title: string; body: string; tone?: "plain" | "mint" | "ink" }) {
  const box = tone === "mint" ? "bg-mint text-mint-ink" : tone === "ink" ? "bg-ink text-white" : "bg-surface text-ink";
  const soft = tone === "ink" ? "text-white/60" : tone === "mint" ? "text-mint-ink/75" : "text-muted";
  return (
    <li className={`reveal flex flex-col rounded-3xl p-6 shadow-pill ${box}`}>
      <p className={`text-sm font-semibold ${soft}`}>{kicker}</p>
      <p className="mt-6 font-display text-4xl font-bold tracking-tight">{title}</p>
      <p className={`mt-2 text-sm text-pretty ${soft}`}>{body}</p>
    </li>
  );
}

/* ---------- icons (decorative) ---------- */

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
function TapIcon() {
  return (
    <Svg>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10 18h4" />
    </Svg>
  );
}
function WalletIcon() {
  return (
    <Svg>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5z" />
      <path d="M15 12h2" />
    </Svg>
  );
}
function TillIcon() {
  return (
    <Svg>
      <rect x="4" y="3" width="16" height="12" rx="2" />
      <path d="M8 21h8M12 15v6" />
    </Svg>
  );
}
function RouteIcon() {
  return (
    <Svg>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" />
    </Svg>
  );
}
function RailsIcon() {
  return (
    <Svg>
      <path d="M4 8h16M4 16h16M8 4v16M16 4v16" />
    </Svg>
  );
}
function CoinIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5V8M12 16v1.5" />
    </Svg>
  );
}
function EyeIcon() {
  return (
    <Svg>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}
