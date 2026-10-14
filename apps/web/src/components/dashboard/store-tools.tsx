"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";

const noopSubscribe = () => () => {};

export function StoreTools({ storeId, storeName, registryStatus }: { storeId: string; storeName: string; registryStatus: "pending" | "registered" | "failed" }) {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const paymentUrl = `${origin}/s/${storeId}`;
  const ready = registryStatus === "registered";

  async function copyLink() {
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <aside className="space-y-4" aria-label="Store tools">
      {!ready && (
        <div className="rounded-2xl bg-coral/20 p-4 text-sm">
          <p className="font-bold">Payments aren&apos;t ready yet</p>
          <p className="mt-1 text-muted">Finish the onchain setup before sharing your payment page.</p>
          <Link href="/onboard" className="mt-3 inline-flex min-h-10 items-center font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Finish setup</Link>
        </div>
      )}

      <div id="print-poster" className="rounded-3xl bg-surface p-6 text-center shadow-pill">
        <div className="flex items-center justify-between text-left">
          <div><h2 className="font-bold">Get paid</h2><p className="mt-1 text-sm text-muted">Customers scan, enter an amount and pay.</p></div>
          <span className={`size-2.5 rounded-full ${ready ? "bg-mint-strong" : "bg-coral"}`} title={ready ? "Ready" : "Setup required"} />
        </div>
        <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3 ring-1 ring-line">
          {origin ? <QRCodeSVG value={paymentUrl} size={176} fgColor="#0e0e12" marginSize={1} title={`Pay ${storeName}`} /> : <div className="size-44 animate-pulse rounded-xl bg-canvas" />}
        </div>
        <p className="mt-4 text-lg font-bold">{storeName}</p>
        <p className="mt-1 text-sm text-muted">Scan to pay in USDC</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xl bg-surface px-4 text-sm font-bold shadow-pill transition-colors hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Print QR</button>
        <button type="button" onClick={copyLink} disabled={!origin} className="min-h-11 rounded-xl bg-surface px-4 text-sm font-bold shadow-pill transition-colors hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-50">
          <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
        </button>
      </div>
    </aside>
  );
}
