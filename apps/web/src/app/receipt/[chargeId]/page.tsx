import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bridgeAttempts, charges, eq, payments, stores } from "@jupa/db";
import { arcTxUrl, formatUsd } from "@jupa/shared";
import { db } from "@/lib/db";
import { arc } from "@/lib/env";

export const metadata: Metadata = { title: "Payment receipt · Jupa" };

export default async function ReceiptPage(props: PageProps<"/receipt/[chargeId]">) {
  const { chargeId } = await props.params;
  const [record] = await db
    .select({
      id: charges.id,
      charged: charges.amount,
      status: charges.status,
      createdAt: charges.createdAt,
      late: charges.late,
      overpaid: charges.overpaid,
      storeName: stores.name,
      amountReceived: payments.amountReceived,
      finalizedAt: payments.finalizedAt,
      sourceChain: payments.sourceChain,
      reportedSourceChain: bridgeAttempts.sourceChain,
      routeProvider: bridgeAttempts.provider,
      sourceTxHash: bridgeAttempts.burnTxHash,
      arcTxHash: payments.arcTxHash,
    })
    .from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .leftJoin(payments, eq(payments.chargeId, charges.id))
    .leftJoin(bridgeAttempts, eq(bridgeAttempts.chargeId, charges.id))
    .where(eq(charges.id, chargeId))
    .limit(1);
  if (!record) notFound();

  const paid = record.status === "paid";
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <section className="rounded-[2rem] bg-white p-8 shadow-float sm:p-10">
        <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${paid ? "bg-mint text-mint-ink" : "bg-coral/25"}`}>
          {paid ? "Payment complete" : record.status === "needs_attention" ? "Payment needs attention" : "Payment pending"}
        </div>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em]">
          {formatUsd(record.amountReceived ?? record.charged)}
        </h1>
        <p className="mt-2 text-lg text-muted">{record.storeName}</p>

        <dl className="mt-8 divide-y divide-line rounded-2xl bg-canvas px-5 text-sm">
          <div className="flex justify-between gap-4 py-4"><dt className="text-muted">Status</dt><dd className="font-semibold capitalize">{record.status.replace("_", " ")}</dd></div>
          <div className="flex justify-between gap-4 py-4"><dt className="text-muted">Asset</dt><dd className="font-semibold">USDC</dd></div>
          <div className="flex justify-between gap-4 py-4"><dt className="text-muted">{record.sourceChain === "arc" ? "Paid from" : "Reported source"}</dt><dd className="font-semibold">{record.sourceChain === "arc" ? (arc.network === "mainnet" ? "Arc" : "Arc testnet") : record.reportedSourceChain?.replaceAll("_", " ") ?? "—"}</dd></div>
          {record.routeProvider && <div className="flex justify-between gap-4 py-4"><dt className="text-muted">Route</dt><dd className="max-w-52 truncate font-semibold">{record.routeProvider}</dd></div>}
          <div className="flex justify-between gap-4 py-4"><dt className="text-muted">Time</dt><dd className="font-semibold">{(record.finalizedAt ?? record.createdAt).toLocaleString()}</dd></div>
          <div className="flex justify-between gap-4 py-4"><dt className="text-muted">Reference</dt><dd className="font-mono text-xs">{record.id}</dd></div>
        </dl>

        {(record.late || record.overpaid) && <p className="mt-5 rounded-2xl bg-coral/20 p-4 text-sm">{record.late ? "This payment arrived after the request expired. " : ""}{record.overpaid ? "The amount received was greater than requested." : ""}</p>}
        {record.arcTxHash && (
          <a href={arcTxUrl(arc, record.arcTxHash)} target="_blank" rel="noreferrer" className="mt-6 block w-full rounded-2xl border border-line px-5 py-4 text-center font-semibold">View on Arc explorer ↗</a>
        )}
        {!paid && record.status !== "needs_attention" && <Link href={`/pay/${record.id}`} className="mt-4 block text-center text-sm font-semibold underline">Return to payment</Link>}
      </section>
    </main>
  );
}
