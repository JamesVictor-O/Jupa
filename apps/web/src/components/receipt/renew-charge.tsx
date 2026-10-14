"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";

const noopSubscribe = () => () => {};

type FreshCharge = { id: string; expiresAt: string };

export function RenewCharge({ storeId, storeName, amount, amountLabel }: { storeId: string; storeName: string; amount: string; amountLabel: string }) {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [fresh, setFresh] = useState<FreshCharge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createFreshCharge() {
    setBusy(true);
    setError(null);
    try {
      const baseUnits = BigInt(amount);
      const dollars = baseUnits / 1_000_000n;
      const fraction = (baseUnits % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
      const response = await fetch("/api/charges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId, amount: fraction ? `${dollars}.${fraction}` : dollars.toString() }),
      });
      const data = (await response.json()) as FreshCharge & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We couldn't create a fresh charge.");
      setFresh(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't create a fresh charge. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (fresh) {
    const checkoutUrl = `${origin}/pay/${fresh.id}`;
    return (
      <section className="mt-6 rounded-2xl bg-canvas p-5 text-center" aria-labelledby="fresh-charge-heading">
        <p id="fresh-charge-heading" className="font-bold">Fresh QR ready</p>
        <p className="mt-1 text-sm text-muted">Ask the customer to scan this new code for {amountLabel}.</p>
        <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 ring-1 ring-line">
          {origin ? <QRCodeSVG value={checkoutUrl} size={220} fgColor="#0e0e12" marginSize={1} title={`Pay ${amountLabel} to ${storeName}`} /> : <div className="size-[220px] animate-pulse rounded-xl bg-canvas" />}
        </div>
        <p className="mt-4 text-xs text-muted">Expires {new Date(fresh.expiresAt).toLocaleTimeString()}</p>
        <Link href={`/pay/${fresh.id}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          Open new checkout<span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl bg-coral/20 p-5" aria-labelledby="expired-charge-heading">
      <h2 id="expired-charge-heading" className="font-bold">This QR has expired</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Create a fresh single-use QR for the same {amountLabel} charge.</p>
      <button type="button" onClick={createFreshCharge} disabled={busy} aria-busy={busy || undefined} className="mt-4 min-h-12 w-full rounded-xl bg-ink px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-60">
        {busy ? "Creating fresh QR…" : "Create fresh QR"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm font-semibold">{error}</p>}
    </section>
  );
}
