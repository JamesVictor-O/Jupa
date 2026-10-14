import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, stores } from "@jupa/db";
import { LogoMark } from "@/components/art";
import { StorePaymentForm } from "@/components/payment-page/store-payment-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Pay · Jupa" };
export const dynamic = "force-dynamic";

/**
 * Permanent target of a store's printed QR. The customer enters an amount and
 * receives a new single-use checkout without waiting for the merchant's till.
 */
export default async function StoreQrPage(props: PageProps<"/s/[storeId]">) {
  const { storeId } = await props.params;
  const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });
  if (!store) notFound();

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-[2rem] bg-surface p-6 text-center shadow-float sm:p-9">
      {store.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- stored data URL
        <img src={store.logoUrl} alt="" className="size-16 rounded-2xl object-cover" />
      ) : (
        <span className="grid size-16 place-items-center rounded-2xl bg-ink text-white">
          <LogoMark className="size-7" />
        </span>
      )}
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">{store.name}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Pay this merchant in USDC. Enter your amount to create a secure, single-use checkout.</p>
      <StorePaymentForm storeId={store.id} ready={store.registryStatus === "registered"} />
      <p className="mt-5 text-xs leading-5 text-muted">Funds settle to the merchant&apos;s registered payout address on Arc.</p>
      </section>
    </main>
  );
}
