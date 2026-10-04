"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Paste a receipt link or charge ID and jump to it. Also how a customer recovers a payment mid-route. */
export function ReceiptLookup({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get("receipt") ?? "").trim();
    const id = raw.split(/[/?#]/).filter(Boolean).at(-1);
    if (!id) {
      setError("Paste a receipt link or ID.");
      return;
    }
    setError(null);
    router.push(`/receipt/${encodeURIComponent(id)}`);
  }

  return (
    <form role="search" onSubmit={onSubmit} className={`relative ${className}`}>
      <label htmlFor="receipt-lookup" className="sr-only">
        Find a receipt
      </label>
      <SearchIcon />
      <input
        id="receipt-lookup"
        name="receipt"
        type="search"
        autoComplete="off"
        placeholder="Find a receipt"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "receipt-lookup-error" : undefined}
        className="h-14 w-full rounded-xl bg-surface pl-12 pr-4 text-sm font-medium text-ink shadow-pill placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      {error && (
        <p id="receipt-lookup-error" role="alert" className="absolute left-2 top-full mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}
