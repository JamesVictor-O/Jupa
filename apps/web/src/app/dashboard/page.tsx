import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, charges, desc, eq, gte, payments, stores } from "@jupa/db";
import { formatUsd } from "@jupa/shared";
import { StoreTools } from "@/components/dashboard/store-tools";
import { MerchantShell } from "@/components/dashboard/merchant-shell";
import { db } from "@/lib/db";
import { arc } from "@/lib/env";
import { currentMerchant } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard · Jupa" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const merchant = await currentMerchant();
  if (!merchant) redirect("/onboard");

  const store = await db.query.stores.findFirst({ where: eq(stores.merchantId, merchant.id) });
  if (!store) redirect("/onboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayRows, recentRows] = await Promise.all([
    db.select({ status: charges.status, amountReceived: payments.amountReceived }).from(charges)
      .leftJoin(payments, eq(payments.chargeId, charges.id))
      .where(and(eq(charges.storeId, store.id), gte(charges.createdAt, today))),
    db.select({ id: charges.id, amount: charges.amount, status: charges.status, createdAt: charges.createdAt, late: charges.late, overpaid: charges.overpaid, amountReceived: payments.amountReceived, arcTxHash: payments.arcTxHash })
      .from(charges).leftJoin(payments, eq(payments.chargeId, charges.id))
      .where(eq(charges.storeId, store.id)).orderBy(desc(charges.createdAt)).limit(8),
  ]);

  const successful = todayRows.filter((row) => row.status === "paid");
  const collected = successful.reduce((sum, row) => sum + (row.amountReceived ?? 0n), 0n);
  const awaiting = todayRows.filter((row) => row.status === "created" || row.status === "paying").length;
  const average = successful.length ? collected / BigInt(successful.length) : 0n;

  return (
    <MerchantShell store={store} active="home">
      <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-semibold text-muted">{greeting()}, {store.name}</p><h1 className="mt-1 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Here&apos;s today.</h1></div>
            <Link href={`/till/${store.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"><PlusIcon /> New charge</Link>
          </header>

          <section aria-label="Today's performance" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Collected" value={formatUsd(collected)} detail="Settled today" strong />
            <Metric label="Payments" value={successful.length.toLocaleString()} detail="Successful today" />
            <Metric label="Awaiting" value={awaiting.toLocaleString()} detail={awaiting ? "Open or processing" : "Nothing needs attention"} />
            <Metric label="Average payment" value={formatUsd(average)} detail="Across successful payments" />
          </section>

          <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-3xl bg-surface shadow-pill" aria-labelledby="activity-heading">
              <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-6">
                <div><h2 id="activity-heading" className="text-lg font-bold">Recent activity</h2><p className="mt-1 text-sm text-muted">Your latest payment attempts and settlements.</p></div>
                <span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-muted">Latest 8</span>
              </div>
              {recentRows.length ? (
                <div className="divide-y divide-line">
                  {recentRows.map((row) => (
                    <article key={row.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                      <StatusMark status={row.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-bold">{statusLabel(row.status)}</p>{row.late && <Tag>Late</Tag>}{row.overpaid && <Tag>Overpaid</Tag>}</div>
                        <p className="mt-1 text-sm text-muted">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(row.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums">{formatUsd(row.amountReceived ?? row.amount)}</p>
                        {row.arcTxHash ? (
                          <a href={`${arc.explorerUrl}/tx/${row.arcTxHash}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">View transaction<span className="sr-only"> (opens in a new tab)</span></a>
                        ) : <Link href={`/receipt/${row.id}`} className="mt-1 inline-block text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink">View details</Link>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-14 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-canvas"><ReceiptIcon /></span>
                  <h3 className="mt-4 font-bold">No payments yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Open the till to create your first charge, or share your payment page with a customer.</p>
                  <Link href={`/till/${store.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-ink px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Create first charge</Link>
                </div>
              )}
            </section>
            <StoreTools storeId={store.id} storeName={store.name} registryStatus={store.registryStatus} />
          </div>
        </div>
      </main>
    </MerchantShell>
  );
}

function Metric({ label, value, detail, strong = false }: { label: string; value: string; detail: string; strong?: boolean }) {
  return <article className={`rounded-2xl p-5 ${strong ? "bg-ink text-white" : "bg-surface shadow-pill"}`}><p className={`text-sm font-semibold ${strong ? "text-white/60" : "text-muted"}`}>{label}</p><p className="mt-4 text-3xl font-bold tracking-[-0.04em] tabular-nums">{value}</p><p className={`mt-2 text-xs ${strong ? "text-white/55" : "text-muted"}`}>{detail}</p></article>;
}

function StatusMark({ status }: { status: string }) {
  const paid = status === "paid";
  const attention = status === "expired" || status === "needs_attention";
  return <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl ${paid ? "bg-mint text-mint-ink" : attention ? "bg-coral/25 text-ink" : "bg-canvas text-muted"}`}>{paid ? <CheckIcon /> : <ReceiptIcon />}</span>;
}

function Tag({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-coral/20 px-2 py-0.5 text-[11px] font-bold">{children}</span>; }
function statusLabel(status: string) { return ({ created: "Charge created", paying: "Payment processing", paid: "Payment received", expired: "Charge expired", needs_attention: "Needs attention" } as Record<string, string>)[status] ?? status; }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; }
function PlusIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2"><path d="M12 5v14M5 12h14"/></svg>; }
function CheckIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[2.5]"><path d="m5 12 4 4L19 6"/></svg>; }
function ReceiptIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></svg>; }
