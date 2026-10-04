import type { ReactNode } from "react";
import { LogoMark, Sparkle, octagon } from "@/components/art";
import { MiniQR } from "./mini-qr";

const STEPS = [
  {
    n: "01",
    role: "Merchant",
    title: "Set up once",
    body: "Sign in with email, name your store and add the address you want to be paid at. Print the QR. About two minutes.",
    art: <SetupArt />,
  },
  {
    n: "02",
    role: "Cashier",
    title: "Type the amount",
    body: "Open the till on any phone. Type the price, tap Charge and turn the screen to the customer.",
    art: <ChargeArt />,
  },
  {
    n: "03",
    role: "Customer",
    title: "Scan and tap Pay",
    body: "They pay from the wallet they already use. When the payment is final, the till turns green.",
    art: <PaidArt />,
  },
];

const SOURCES = ["Base", "Ethereum", "Arbitrum", "Solana", "Arc"];

const FACTS = [
  { title: "Never held by Jupa", body: "Payments go straight from the customer's wallet to your address." },
  { title: "No gas token", body: "On Arc, fees are paid in USDC. You only ever hold one asset." },
  { title: "A receipt for every sale", body: "Amount, time and a public link to the final transfer." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="relative isolate overflow-hidden bg-ink text-white">
      <BackdropRings />

      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-20 lg:px-12 lg:pb-32 lg:pt-28">
        <div className="reveal flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:pl-20">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-mint">
              <Sparkle className="size-3.5" />
              How it works
            </p>
            <h2
              id="how-heading"
              className="mt-5 font-display text-[clamp(2.25rem,4.2vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em] text-balance"
            >
              From QR to Paid
              <br />
              in three taps
            </h2>
          </div>
          <p className="max-w-sm text-lg text-white/65 text-pretty lg:pb-2">
            No app to install and no chain to pick. The cashier sees one number, the customer sees one button.
          </p>
        </div>

        <ol className="mt-16 grid gap-5 md:grid-cols-3 lg:mt-20">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="reveal group flex flex-col rounded-3xl bg-ink-soft p-3 ring-1 ring-white/10 transition-colors duration-300 hover:ring-mint/40"
            >
              <div className="relative grid h-56 place-items-center overflow-hidden rounded-2xl bg-ink">
                {step.art}
              </div>
              <div className="flex flex-1 flex-col px-3 pb-4 pt-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/75">{step.role}</span>
                  <span className="font-display text-sm font-bold text-white/40 tabular-nums">{step.n}</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-white/65 text-pretty">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="reveal mt-5 overflow-hidden rounded-3xl bg-surface p-6 text-ink sm:p-8 lg:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            <div>
              <h3 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Whatever chain it starts on, you get USDC on Arc
              </h3>
              <p className="mt-3 max-w-md text-muted text-pretty">
                Jupa picks the fastest balance the customer has and shows the wait before they tap Pay.
              </p>
            </div>

            <RouteDiagram />

            <div className="flex items-center justify-between gap-6 rounded-2xl bg-mint px-6 py-5 text-mint-ink lg:ml-auto lg:w-72">
              <div>
                <p className="text-sm font-semibold opacity-80">Your balance on Arc</p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">$1,284.50</p>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-mint">
                <LogoMark className="size-5" />
              </span>
            </div>
          </div>

          <ul className="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
            {FACTS.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-mint">
                  <CheckIcon />
                </span>
                <div>
                  <p className="font-bold">{f.title}</p>
                  <p className="mt-1 text-sm text-muted text-pretty">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- illustrations (decorative) ---------- */

function SetupArt() {
  return (
    <ArtFrame>
      <div className="relative w-56 rotate-[-4deg] rounded-2xl bg-ink-soft p-4 ring-1 ring-white/10 transition-transform duration-500 ease-out group-hover:rotate-0">
        <div className="flex items-center justify-between">
          <LogoMark className="size-5" />
          <div className="flex -space-x-1.5">
            <span className="size-4 rounded-full bg-mint" />
            <span className="size-4 rounded-full bg-lilac/90" />
          </div>
        </div>
        <p className="mt-7 text-sm font-bold uppercase tracking-wide">Kola Coffee</p>
        <p className="mt-1 text-xs tracking-[0.18em] text-white/60">0x7A3F…E91C</p>
      </div>
      <div className="absolute bottom-5 right-6 rotate-[6deg] rounded-xl bg-surface p-2 shadow-float transition-transform duration-500 ease-out group-hover:rotate-0">
        <MiniQR value="https://jupa.app/s/kola-coffee" size={64} />
      </div>
    </ArtFrame>
  );
}

function ChargeArt() {
  return (
    <ArtFrame>
      <div className="flex flex-col items-center">
        <p className="text-xs text-white/50">Charge amount · USD</p>
        <p className="mt-1 font-display text-5xl font-bold tracking-tight tabular-nums">$4.50</p>
        <div className="mt-5 grid grid-cols-3 gap-1.5">
          {["1", "2", "3", "4", "5", "6"].map((k) => (
            <span
              key={k}
              className={`grid h-8 w-12 place-items-center rounded-lg text-sm font-semibold ${
                k === "4" ? "bg-mint text-mint-ink" : "bg-white/8 text-white/70"
              }`}
            >
              {k}
            </span>
          ))}
        </div>
      </div>
    </ArtFrame>
  );
}

function PaidArt() {
  return (
    <ArtFrame>
      <div className="flex w-52 flex-col items-center rounded-2xl bg-mint-strong px-5 py-6 text-mint-ink transition-transform duration-500 ease-out group-hover:scale-[1.03]">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-mint">
          <CheckIcon className="size-5" />
        </span>
        <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">Paid</p>
        <p className="text-lg font-bold tabular-nums">$4.50</p>
        <p className="mt-1 text-xs font-semibold opacity-75">Kola Coffee · just now</p>
      </div>
    </ArtFrame>
  );
}

function ArtFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <svg viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        {[40, 70, 100, 130, 160].map((r, i) => (
          <polygon key={r} points={octagon(150, 110, r)} fill="none" stroke="#bde7c3" strokeOpacity={0.14 - i * 0.02} />
        ))}
      </svg>
      <div aria-hidden="true" className="relative grid size-full place-items-center">
        {children}
      </div>
    </>
  );
}

function RouteDiagram() {
  return (
    <div aria-label={`Payments from ${SOURCES.join(", ")} all settle as USDC on Arc`} role="img" className="flex items-center gap-4">
      <ul className="flex flex-col gap-1.5">
        {SOURCES.map((s) => (
          <li
            key={s}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              s === "Arc" ? "bg-ink text-white" : "bg-canvas text-ink"
            }`}
          >
            {s}
          </li>
        ))}
      </ul>
      <svg viewBox="0 0 120 160" className="h-40 w-24 shrink-0 text-ink" fill="none" aria-hidden="true">
        {[16, 48, 80, 112, 144].map((y) => (
          <path key={y} d={`M0 ${y} C 60 ${y}, 60 80, 112 80`} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        ))}
        <path d="M104 74l8 6-8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function BackdropRings() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_bottom,transparent,black_35%)]"
      aria-hidden="true"
    >
      <g fill="none" stroke="#ffffff">
        {Array.from({ length: 7 }, (_, i) => (
          <polygon key={i} points={octagon(1380, 120, 140 + i * 110)} strokeOpacity={0.035 - i * 0.004} strokeWidth="14" />
        ))}
      </g>
    </svg>
  );
}

function CheckIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}
