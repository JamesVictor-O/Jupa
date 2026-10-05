"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";

type ChargeStatus = "created" | "paying" | "paid" | "expired" | "needs_attention";
type Charge = { id: string; amount: string; status: ChargeStatus; expiresAt: string };
const noopSubscribe = () => () => {};

export function Till({ storeId, storeName, ready }: { storeId: string; storeName: string; ready: boolean }) {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [digits, setDigits] = useState("");
  const [charge, setCharge] = useState<Charge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const cents = BigInt(digits || "0");
  const displayAmount = formatCents(cents);
  const amountForApi = `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (!charge || charge.status === "paid" || charge.status === "expired") return;
    const timer = window.setInterval(async () => {
      setNow(Date.now());
      try {
        const response = await fetch(`/api/charges/${charge.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as Charge;
        setCharge(next);
      } catch {
        // A temporary polling failure should not discard an active charge.
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [charge]);

  function press(key: string) {
    setError(null);
    if (key === "back") return setDigits((value) => value.slice(0, -1));
    if (digits.length >= 9) return;
    setDigits((value) => `${value}${key}`.replace(/^0+/, "").slice(0, 9));
  }

  async function createCharge(event: FormEvent) {
    event.preventDefault();
    if (cents === 0n) return setError("Enter an amount greater than zero.");
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/charges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId, amount: amountForApi }),
      });
      const data = (await response.json()) as Charge & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We couldn't create that charge.");
      setCharge(data);
      setNow(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't create that charge. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCharge(null);
    setDigits("");
    setError(null);
  }

  async function cancelCharge() {
    if (!charge) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/charges/${charge.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We couldn't cancel that charge.");
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't cancel that charge.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <section className="mx-auto mt-24 max-w-lg rounded-3xl bg-surface p-8 text-center shadow-pill">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-coral/20"><AlertIcon /></span>
        <h1 className="mt-5 text-2xl font-bold">Finish payment setup</h1>
        <p className="mt-2 text-sm text-muted">Your payout address must be registered before this till can create charges.</p>
        <Link href="/onboard" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-ink px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Finish setup</Link>
      </section>
    );
  }

  if (charge?.status === "paid") return <PaidState amount={BigInt(charge.amount)} onNext={reset} />;

  if (charge) {
    const seconds = Math.max(0, Math.ceil((new Date(charge.expiresAt).getTime() - now) / 1000));
    const expired = charge.status === "expired" || seconds === 0;
    const checkoutUrl = `${origin}/pay/${charge.id}`;
    return (
      <section className="mx-auto mt-10 grid max-w-4xl items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:mt-20">
        <div>
          <p className="text-sm font-semibold text-muted">Charge total</p>
          <h1 className="mt-2 text-5xl font-bold tracking-[-0.05em] tabular-nums sm:text-6xl">{formatMicroUsd(BigInt(charge.amount))}</h1>
          <div role="status" className={`mt-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${expired ? "bg-coral/20" : "bg-mint text-mint-ink"}`}>
            <span className={`size-2 rounded-full ${expired ? "bg-coral" : "bg-mint-ink"}`} />
            {expired ? "Charge expired" : charge.status === "paying" ? "Payment processing" : `Waiting · ${formatCountdown(seconds)}`}
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted">{expired ? "No payment was confirmed in time. Create a fresh charge for the customer." : "Ask the customer to scan this QR. This screen updates automatically when payment is confirmed."}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {expired ? <button type="button" onClick={reset} className="min-h-12 rounded-xl bg-ink px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">New charge</button> : <button type="button" onClick={cancelCharge} disabled={busy || charge.status !== "created"} className="min-h-12 rounded-xl bg-surface px-5 font-bold shadow-pill focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-50">{busy ? "Cancelling…" : "Cancel charge"}</button>}
            <a href={`/pay/${charge.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-xl px-4 text-sm font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Open checkout<span className="sr-only"> (opens in a new tab)</span></a>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-coral/20 px-4 py-3 text-sm font-semibold">{error}</p>}
        </div>
        <div className={`rounded-3xl bg-surface p-7 text-center shadow-float ${expired ? "opacity-50" : ""}`}>
          <p className="font-bold">Pay {storeName}</p>
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4 ring-1 ring-line">
            {origin ? <QRCodeSVG value={checkoutUrl} size={248} fgColor="#0e0e12" marginSize={1} title={`Pay ${formatMicroUsd(BigInt(charge.amount))} to ${storeName}`} /> : <div className="size-62 animate-pulse rounded-xl bg-canvas" />}
          </div>
          <p className="mt-5 text-sm text-muted">USDC from any supported wallet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-8 grid max-w-5xl items-center gap-8 lg:mt-14 lg:grid-cols-[1fr_420px]">
      <div className="px-2 text-center lg:text-left">
        <p className="text-sm font-semibold text-muted">New charge</p>
        <h1 className="mt-4 text-6xl font-bold tracking-[-0.06em] tabular-nums sm:text-7xl">{displayAmount}</h1>
        <p className="mt-4 text-sm text-muted">Enter what the customer owes, then create a payment QR.</p>
      </div>
      <form onSubmit={createCharge} className="rounded-3xl bg-surface p-4 shadow-float sm:p-5">
        <label htmlFor="charge-amount" className="sr-only">Charge amount in US dollars</label>
        <input id="charge-amount" value={amountForApi} readOnly inputMode="decimal" aria-invalid={Boolean(error)} aria-describedby={error ? "charge-error" : "charge-hint"} className="sr-only" />
        <div className="grid grid-cols-3 gap-3" aria-label="Amount keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"].map((key) => <Key key={key} onClick={() => press(key)}>{key}</Key>)}
          <Key onClick={() => press("back")} label="Delete last digit"><BackspaceIcon /></Key>
        </div>
        <p id="charge-hint" className="sr-only">Amount is entered in dollars and cents.</p>
        {error && <p id="charge-error" role="alert" className="mt-4 rounded-xl bg-coral/20 px-4 py-3 text-sm font-semibold">{error}</p>}
        <button type="submit" disabled={busy || cents === 0n} aria-busy={busy || undefined} className="mt-4 min-h-14 w-full rounded-2xl bg-ink px-5 text-lg font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:translate-y-0 disabled:opacity-40">
          {busy ? "Creating charge…" : `Charge ${displayAmount}`}
        </button>
      </form>
    </section>
  );
}

function Key({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} aria-label={label} className="grid min-h-16 place-items-center rounded-2xl bg-canvas text-xl font-bold transition-colors hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{children}</button>;
}

function PaidState({ amount, onNext }: { amount: bigint; onNext: () => void }) {
  return (
    <section className="mx-auto mt-16 max-w-xl rounded-3xl bg-mint p-8 text-center text-mint-ink shadow-float sm:mt-24 sm:p-12" role="status">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint-ink text-white"><CheckIcon /></span>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em]">Payment received</p>
      <h1 className="mt-3 text-5xl font-bold tracking-[-0.05em] tabular-nums">{formatMicroUsd(amount)}</h1>
      <p className="mt-3 text-sm">The payment is confirmed and recorded.</p>
      <button type="button" onClick={onNext} className="mt-8 min-h-12 rounded-xl bg-ink px-6 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Next customer</button>
    </section>
  );
}

function formatCents(cents: bigint) { return `$${(cents / 100n).toLocaleString("en-US")}.${(cents % 100n).toString().padStart(2, "0")}`; }
function formatMicroUsd(amount: bigint) { return formatCents(amount / 10_000n); }
function formatCountdown(seconds: number) { return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`; }
function BackspaceIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-2"><path d="M21 6H9l-6 6 6 6h12Z"/><path d="m13 10 4 4m0-4-4 4"/></svg>; }
function AlertIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2"><path d="M12 9v4m0 4h.01M10 3h4l8 16H2Z"/></svg>; }
function CheckIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8 fill-none stroke-current stroke-[2.5]"><path d="m5 12 4 4L19 6"/></svg>; }
