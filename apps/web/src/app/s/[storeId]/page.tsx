import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, charges, desc, eq, gte, stores } from "@jupa/db";
import { LogoMark } from "@/components/art";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Pay · Jupa" };
export const dynamic = "force-dynamic";

/**
 * Target of a store's printed QR. Sends the customer to the till's current open charge,
 * so one sticker on the counter works for every sale.
 */
export default async function StoreQrPage(props: PageProps<"/s/[storeId]">) {
  const { storeId } = await props.params;
  const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });
  if (!store) notFound();

  const [open] = await db
    .select({ id: charges.id })
    .from(charges)
    .where(and(eq(charges.storeId, store.id), eq(charges.status, "created"), gte(charges.expiresAt, new Date())))
    .orderBy(desc(charges.createdAt))
    .limit(1);
  if (open) redirect(`/pay/${open.id}`);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      {store.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- stored data URL
        <img src={store.logoUrl} alt="" className="size-16 rounded-2xl object-cover" />
      ) : (
        <span className="grid size-16 place-items-center rounded-2xl bg-ink text-white">
          <LogoMark className="size-7" />
        </span>
      )}
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">{store.name}</h1>
      <p className="mt-4 text-lg text-muted">Nothing to pay yet. Ask the cashier to enter your total, then scan again.</p>
      <Link href={`/s/${store.id}`} className="mt-8 grid min-h-12 place-items-center rounded-xl bg-ink px-6 font-bold text-white">
        Check again
      </Link>
    </main>
  );
}
