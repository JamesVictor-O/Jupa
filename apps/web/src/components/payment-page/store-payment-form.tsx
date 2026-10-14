"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function StorePaymentForm({ storeId, ready }: { storeId: string; ready: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!ready) return setError("This merchant is not ready to receive payments yet.");

    setBusy(true);
    try {
      const response = await fetch(`/api/public/stores/${storeId}/charges`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "We couldn't start this payment.");
      router.push(`/pay/${data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't start this payment. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={continueToPayment} className="mt-8 text-left" noValidate>
      <label htmlFor="customer-amount" className="text-sm font-bold">Amount to pay</label>
      <div className="mt-2 flex items-center rounded-2xl border border-line bg-white px-5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
        <span className="text-2xl font-bold" aria-hidden="true">$</span>
        <input
          id="customer-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          required
          value={amount}
          onChange={(event) => { setAmount(event.target.value); setError(null); }}
          placeholder="0.00"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "customer-amount-error" : "customer-amount-hint"}
          className="min-h-16 min-w-0 flex-1 bg-transparent px-3 text-3xl font-bold tabular-nums outline-none placeholder:text-muted/50"
        />
        <span className="text-sm font-bold text-muted">USDC</span>
      </div>
      <p id="customer-amount-hint" className="mt-2 text-xs leading-5 text-muted">Enter the amount shown on your bill. You will review the network and fees before paying.</p>
      {error && <p id="customer-amount-error" role="alert" className="mt-3 rounded-xl bg-coral/20 px-4 py-3 text-sm font-semibold">{error}</p>}
      <button type="submit" disabled={busy || !ready || !amount.trim()} aria-busy={busy || undefined} className="mt-5 min-h-14 w-full rounded-2xl bg-ink px-6 text-lg font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-45">
        {busy ? "Preparing payment…" : "Continue to payment"}
      </button>
    </form>
  );
}
