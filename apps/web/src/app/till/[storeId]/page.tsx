import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq, stores } from "@jupa/db";
import { Till } from "@/components/till/till";
import { MerchantShell } from "@/components/dashboard/merchant-shell";
import { db } from "@/lib/db";
import { currentMerchant } from "@/lib/session";

export const metadata: Metadata = { title: "Counter · Jupa" };

export default async function TillPage(props: PageProps<"/till/[storeId]">) {
  const merchant = await currentMerchant();
  if (!merchant) redirect("/onboard");

  const { storeId } = await props.params;
  const store = await db.query.stores.findFirst({ where: and(eq(stores.id, storeId), eq(stores.merchantId, merchant.id)) });
  if (!store) notFound();

  return (
    <MerchantShell store={store} active="till">
      <main className="min-h-screen bg-canvas px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-muted">Point of sale</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em]">Counter</h1>
        </div>
        <Till storeId={store.id} storeName={store.name} ready={store.registryStatus === "registered"} />
      </main>
    </MerchantShell>
  );
}
