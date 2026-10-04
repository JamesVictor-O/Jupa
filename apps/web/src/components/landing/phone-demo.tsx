"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";
import { QRCodeSVG } from "qrcode.react";
import { LogoMark, Sparkle, octagon } from "@/components/art";

/**
 * Self-playing demo of the whole Jupa flow inside a phone:
 * merchant creates a store -> cashier charges -> customer pays -> till shows Paid.
 * Purely illustrative: nothing inside the screen is interactive.
 */

const STORE = "Kola Coffee";
const PAYOUT = "0x7A3F…E91C";
const AMOUNT_KEYS = ["4", ".", "5", "0"];
const AMOUNT = "$4.50";

type SceneKey = "setup" | "store" | "till" | "waiting" | "checkout" | "paying" | "paid";

const SCENES: { key: SceneKey; step: 1 | 2 | 3; title: string; ms: number }[] = [
  { key: "setup", step: 1, title: "New store", ms: 4600 },
  { key: "store", step: 1, title: "Your store", ms: 2800 },
  { key: "till", step: 2, title: "Till", ms: 3800 },
  { key: "waiting", step: 2, title: "Till", ms: 3000 },
  { key: "checkout", step: 3, title: "Checkout", ms: 3400 },
  { key: "paying", step: 3, title: "Checkout", ms: 3800 },
  { key: "paid", step: 3, title: "Till", ms: 3800 },
];

const ROLES = [
  { step: 1, label: "Merchant", caption: "Creates a store in minutes" },
  { step: 2, label: "Cashier", caption: "Types an amount, shows a QR" },
  { step: 3, label: "Customer", caption: "Scans and taps Pay" },
] as const;

const TICK = 80;
const STARTS = SCENES.reduce<number[]>((acc, _scene, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].ms], []);
const LOOP_MS = STARTS[STARTS.length - 1] + SCENES[SCENES.length - 1].ms;

/** Map a position on the looping timeline to the scene and time within it. */
function locate(clock: number) {
  const pos = clock % LOOP_MS;
  let index = 0;
  while (index < SCENES.length - 1 && pos >= STARTS[index + 1]) index++;
  return { index, elapsed: pos - STARTS[index] };
}

export function PhoneDemo() {
  const reduced = usePrefersReducedMotion();
  const [clock, setClock] = useState(0);
  const [focusWithin, setFocusWithin] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const playing = !reduced && !focusWithin && !userPaused && visible;
  const { index, elapsed } = locate(clock);
  const scene = SCENES[index];
  // Reduced motion: show each scene in its finished state, advanced only by the controls.
  const t = reduced ? scene.ms : elapsed;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    // Advance by real elapsed time so throttled timers don't slow the story down; cap jumps
    // (e.g. after the laptop sleeps) so no scene gets skipped entirely.
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 1000);
      last = now;
      setClock((c) => (c + delta) % LOOP_MS);
    }, TICK);
    return () => window.clearInterval(id);
  }, [playing]);

  function jumpTo(step: number) {
    setClock(STARTS[SCENES.findIndex((s) => s.step === step)]);
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-col items-center gap-6 lg:h-full lg:min-h-0 lg:gap-4"
    >
      <p className="sr-only">
        Demo: a merchant creates {STORE}, the cashier charges {AMOUNT}, and the customer scans the QR and taps Pay.
        The till turns green and shows Paid.
      </p>

      <FitToHeight>
        <Phone>
        {scene.key === "paid" ? (
          <PaidScreen key={index} t={t} />
        ) : (
          <div key={index} className="flex h-full flex-col">
            <ScreenHeader title={scene.title} step={scene.step} />
            {scene.key === "setup" && <SetupScene t={t} ms={scene.ms} />}
            {scene.key === "store" && <StoreScene t={t} />}
            {scene.key === "till" && <TillScene t={t} ms={scene.ms} />}
            {scene.key === "waiting" && <WaitingScene t={t} />}
            {scene.key === "checkout" && <CheckoutScene t={t} ms={scene.ms} />}
            {scene.key === "paying" && <PayingScene t={t} />}
          </div>
        )}
        </Phone>
      </FitToHeight>

      <div className="flex items-center gap-2" onFocus={() => setFocusWithin(true)} onBlur={() => setFocusWithin(false)}>
        <div role="group" aria-label="Jump to a step in the demo" className="flex rounded-full bg-surface p-1 shadow-pill">
          {ROLES.map((role) => {
            const active = scene.step === role.step;
            return (
              <button
                key={role.step}
                type="button"
                aria-pressed={active}
                title={role.caption}
                onClick={() => jumpTo(role.step)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  active ? "bg-ink text-white" : "text-muted hover:text-ink"
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? "Play demo" : "Pause demo"}
            className="grid size-10 place-items-center rounded-full bg-surface text-ink shadow-pill transition-colors hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {userPaused ? <PlayIcon /> : <PauseIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- device ---------- */

/** Screen (600) + bezel padding (2 × 11), matching <Phone>. */
const PHONE_HEIGHT = 622;

/**
 * On desktop the hero is exactly one viewport tall, so shrink the phone to whatever height
 * is left. `zoom` (unlike transform) also shrinks the layout box, so nothing overflows.
 * Below lg the hero stacks and scrolls, so the phone stays full size.
 */
function FitToHeight({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const fit = () => {
      if (!desktop.matches) return setScale(1);
      setScale(Math.min(1, Math.max(0.6, box.clientHeight / PHONE_HEIGHT)));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    desktop.addEventListener("change", fit);
    fit();
    return () => {
      ro.disconnect();
      desktop.removeEventListener("change", fit);
    };
  }, []);

  return (
    <div ref={boxRef} className="flex justify-center lg:min-h-0 lg:flex-1 lg:items-center">
      <div style={{ zoom: scale }}>
        {children}
      </div>
    </div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  // Fixed device dimensions: this is an illustration of a ~390pt-wide phone, scaled down.
  return (
    <div className="relative rounded-[52px] bg-ink p-[11px] shadow-float ring-1 ring-black/40">
      <div className="pointer-events-none absolute -left-[3px] top-28 h-10 w-[3px] rounded-l bg-ink-soft" />
      <div className="pointer-events-none absolute -left-[3px] top-44 h-16 w-[3px] rounded-l bg-ink-soft" />
      <div className="pointer-events-none absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-ink-soft" />
      <div
        aria-hidden="true"
        className="relative h-[600px] w-[282px] overflow-hidden rounded-[42px] bg-surface select-none"
      >
        <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        {children}
        <div className="absolute bottom-2 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-ink/80" />
      </div>
    </div>
  );
}

function ScreenHeader({ title, step }: { title: string; step: number }) {
  return (
    <div className="flex items-center justify-between bg-ink px-5 pb-3 pt-12 text-white">
      <div>
        <p className="text-[15px] font-bold">{title}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-white/55">
          {step}/3 <span className="inline-block h-px w-6 bg-white/55" />
        </p>
      </div>
      <div className="grid size-10 place-items-center rounded-full bg-lilac text-ink ring-2 ring-white/10">
        {step === 3 ? <Sparkle className="size-4" /> : <LogoMark className="size-4" />}
      </div>
    </div>
  );
}

/* ---------- scenes ---------- */

function SetupScene({ t, ms }: { t: number; ms: number }) {
  const typed = STORE.slice(0, Math.max(0, Math.floor((t - 300) / 95)));
  const typingName = typed.length < STORE.length;
  const pasted = t > 1900;
  const pressing = t > ms - 700;

  return (
    <>
      <div className="bg-ink px-5 pb-6">
        <StoreCard name={typed || "Store name"} dim={!typed} footer={pasted ? PAYOUT : "Payout address"} />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pt-5">
        <Field label="Store name" active={typingName}>
          {typed}
          {typingName && <Caret />}
        </Field>
        <Field label="Payout address" active={!typingName && !pasted}>
          {pasted ? <span className="demo-enter inline-block">{PAYOUT}</span> : !typingName && <Caret />}
        </Field>
        <p className="text-[11px] text-muted">Money goes straight to this address. Jupa never holds it.</p>
        <FakeButton pressed={pressing} className="mt-auto mb-8">
          Create store
        </FakeButton>
      </div>
    </>
  );
}

function StoreScene({ t }: { t: number }) {
  return (
    <>
      <div className="flex justify-center bg-ink px-5 pb-6">
        <div className="demo-pop rounded-2xl bg-surface p-3">
          <QRCodeSVG value="https://jupa.app/s/kola-coffee" size={128} fgColor="#0e0e12" />
        </div>
      </div>
      <MintBand label="Your store is live" value={STORE} action={<FakeChip pressed={t > 2100}>Open till</FakeChip>} />
      <ListArea title="Today">
        <p className="mt-6 text-center text-xs text-muted">No payments yet. Print the QR to start.</p>
      </ListArea>
    </>
  );
}

function TillScene({ t, ms }: { t: number; ms: number }) {
  const pressedCount = AMOUNT_KEYS.filter((_, i) => t > 500 + i * 480).length;
  const current = pressedCount > 0 && t < 500 + (pressedCount - 1) * 480 + 220 ? AMOUNT_KEYS[pressedCount - 1] : null;
  const entered = AMOUNT_KEYS.slice(0, pressedCount).join("");
  const charging = t > ms - 800;

  return (
    <>
      <div className="bg-ink px-5 pb-6 text-white">
        <p className="text-xs text-white/55">Charge amount · USD</p>
        <p className="mt-1 text-[40px] font-bold leading-none tracking-tight tabular-nums">
          ${entered || "0"}
          {pressedCount < AMOUNT_KEYS.length && <Caret />}
        </p>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2 px-5 pt-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
          <div
            key={k}
            className={`grid h-11 place-items-center rounded-xl text-lg font-semibold transition-all duration-150 ${
              current === k ? "scale-95 bg-mint text-mint-ink" : "bg-canvas text-ink"
            }`}
          >
            {k}
          </div>
        ))}
      </div>
      <div className="px-5 pb-8 pt-3">
        <FakeButton pressed={charging}>Charge {pressedCount === AMOUNT_KEYS.length ? AMOUNT : ""}</FakeButton>
      </div>
    </>
  );
}

function WaitingScene({ t }: { t: number }) {
  const secondsLeft = 600 - Math.floor(t / 1000) - 2;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <>
      <div className="flex justify-center bg-ink px-5 pb-6">
        <div className="demo-pop relative overflow-hidden rounded-2xl bg-surface p-3">
          <QRCodeSVG value="https://jupa.app/pay/ch_8fK2qLx" size={150} fgColor="#0e0e12" />
          <div className="demo-scan absolute inset-x-2 top-3 h-0.5 rounded-full bg-mint-strong shadow-[0_0_12px_2px_rgb(143_211_155_/_0.8)]" />
        </div>
      </div>
      <MintBand label="Scan to pay" value={AMOUNT} action={<span className="text-sm font-bold tabular-nums">{mm}:{ss}</span>} />
      <ListArea title="Status">
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-canvas px-3 py-3 text-sm font-semibold">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-mint-strong motion-reduce:animate-none" />
            <span className="relative size-2.5 rounded-full bg-mint-strong" />
          </span>
          Waiting for payment
        </div>
      </ListArea>
    </>
  );
}

function CheckoutScene({ t, ms }: { t: number; ms: number }) {
  const connected = t > 900;
  const pressing = t > ms - 700;
  return (
    <>
      <div className="bg-ink px-5 pb-6">
        <StoreCard name={STORE} footer="Flat white × 1" />
      </div>
      <MintBand label="Total" value={AMOUNT} />
      <div className="flex flex-1 flex-col px-5 pt-4">
        <div className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-3">
          <div className="size-8 rounded-full bg-gradient-to-br from-lilac to-mint" />
          <div className="text-xs">
            <p className="font-semibold">{connected ? "Wallet connected" : "Connecting wallet…"}</p>
            <p className="text-muted">{connected ? "0x91…4B2" : "Approve in your wallet"}</p>
          </div>
        </div>
        <div className="mt-auto mb-8">
          <FakeButton pressed={pressing} disabled={!connected}>
            Pay {AMOUNT}
          </FakeButton>
          <p className="mt-2 text-center text-[11px] text-muted">From your Base balance · about 20 sec</p>
        </div>
      </div>
    </>
  );
}

function PayingScene({ t }: { t: number }) {
  const steps = [
    { label: "Approved in your wallet", done: t > 300 },
    { label: `Sending to ${STORE}`, done: t > 1700 },
    { label: "Confirming payment", done: t > 3300 },
  ];
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <>
      <div className="flex justify-center bg-ink px-5 pb-6">
        <div className="relative grid size-24 place-items-center">
          <svg viewBox="0 0 96 96" className="absolute inset-0 -rotate-90">
            <circle cx="48" cy="48" r="42" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="6" />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="#bde7c3"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * Math.min(t, 3600)) / 3600}
              className="transition-[stroke-dashoffset] duration-100"
            />
          </svg>
          <LogoMark className="size-8 text-white" />
        </div>
      </div>
      <MintBand label="Paying" value={AMOUNT} />
      <ListArea title="Progress">
        <ol className="mt-2 flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5 text-xs font-semibold">
              {s.done ? (
                <span className="demo-pop grid size-5 place-items-center rounded-full bg-mint-strong text-mint-ink">
                  <CheckIcon className="size-3" />
                </span>
              ) : i === activeIdx ? (
                <span className="demo-spin size-5 rounded-full border-2 border-line border-t-ink" />
              ) : (
                <span className="size-5 rounded-full border-2 border-line" />
              )}
              <span className={s.done || i === activeIdx ? "text-ink" : "text-muted"}>{s.label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-center text-[11px] text-muted">Keep this page open until it says Paid.</p>
      </ListArea>
    </>
  );
}

function PaidScreen({ t }: { t: number }) {
  return (
    <div className="flex h-full flex-col items-center bg-mint-strong px-6 pb-10 pt-24 text-mint-ink">
      <div className="demo-pop grid size-20 place-items-center rounded-full bg-ink text-mint">
        <CheckIcon className="size-9" />
      </div>
      <p className="demo-enter mt-6 text-5xl font-extrabold tracking-tight">Paid</p>
      <p className="demo-enter mt-2 text-3xl font-bold tabular-nums">{AMOUNT}</p>
      <p className="mt-3 text-xs font-semibold opacity-80">{STORE} · just now</p>
      <div className="mt-6 rounded-full bg-white/50 px-3 py-1.5 text-[11px] font-semibold">Receipt ready ↗</div>
      <FakeButton pressed={t > 3200} className="mt-auto">
        New charge
      </FakeButton>
    </div>
  );
}

/* ---------- small pieces ---------- */

function StoreCard({ name, footer, dim }: { name: string; footer: string; dim?: boolean }) {
  return (
    <div className="relative h-36 overflow-hidden rounded-2xl bg-ink-soft p-4 text-white ring-1 ring-white/10">
      <svg viewBox="0 0 200 140" className="absolute -right-8 -top-6 h-48 opacity-60" aria-hidden="true">
        {[20, 34, 48, 62, 76].map((r) => (
          <polygon
            key={r}
            points={octagon(100, 70, r)}
            fill="none"
            stroke="#bde7c3"
            strokeOpacity={0.5 - r / 200}
          />
        ))}
      </svg>
      <div className="relative flex items-center justify-between">
        <LogoMark className="size-5" />
        <div className="flex -space-x-1.5">
          <span className="size-4 rounded-full bg-mint" />
          <span className="size-4 rounded-full bg-lilac/90" />
        </div>
      </div>
      <p className={`relative mt-8 text-sm font-bold uppercase tracking-wide ${dim ? "text-white/35" : ""}`}>{name}</p>
      <p className="relative mt-1 text-xs tracking-[0.18em] text-white/70 tabular-nums">{footer}</p>
    </div>
  );
}

function MintBand({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-mint px-5 py-4 text-mint-ink">
      <div>
        <p className="text-xs font-semibold opacity-80">{label}</p>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      </div>
      {action}
    </div>
  );
}

function ListArea({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex-1 px-5 pt-4">
      <p className="text-sm font-bold">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, active, children }: { label: string; active?: boolean; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-muted">{label}</p>
      <div
        className={`flex h-10 items-center rounded-xl border bg-canvas px-3 text-sm font-semibold transition-colors ${
          active ? "border-ink" : "border-transparent"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function FakeButton({
  pressed,
  disabled,
  className = "",
  children,
}: {
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid h-12 w-full place-items-center rounded-xl bg-ink text-sm font-bold text-white transition-all duration-150 ${
        pressed ? "scale-[0.96] bg-ink-soft ring-4 ring-mint/60" : ""
      } ${disabled ? "opacity-40" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

function FakeChip({ pressed, children }: { pressed?: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-lg bg-ink px-4 py-2.5 text-xs font-bold text-white transition-transform duration-150 ${
        pressed ? "scale-95 ring-4 ring-white/50" : ""
      }`}
    >
      {children}
    </div>
  );
}

function Caret() {
  return <span className="demo-caret ml-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 bg-current" />;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  );
}
