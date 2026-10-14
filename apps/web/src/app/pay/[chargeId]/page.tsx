import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { charges, eq, stores } from "@jupa/db";
import { formatUsd, type ArcNetwork } from "@jupa/shared";
import { Checkout } from "@/components/checkout/checkout";
import { crosschainReceiver } from "@/lib/crosschain";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Pay · Jupa" };

export default async function CheckoutPage(props: PageProps<"/pay/[chargeId]">) {
  const { chargeId } = await props.params;
  const [record] = await db
    .select({
      id: charges.id,
      amount: charges.amount,
      status: charges.status,
      expiresAt: charges.expiresAt,
      storeName: stores.name,
      payoutAddress: stores.payoutAddress,
      registryId: stores.registryId,
      reference: charges.reference,
    })
    .from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .where(eq(charges.id, chargeId))
    .limit(1);
  if (!record) notFound();
  const network = ((process.env.NEXT_PUBLIC_ARC_NETWORK as ArcNetwork | undefined) ?? "testnet") === "mainnet" ? "Arc" : "Arc testnet";
  const crosschainRecipient = await crosschainReceiver(record.registryId as `0x${string}`, record.reference as `0x${string}`);

  return <Checkout charge={{ id: record.id, status: record.status, storeName: record.storeName, payoutAddress: record.payoutAddress, amountLabel: formatUsd(record.amount), amount: record.amount.toString(), expiresAt: record.expiresAt.toISOString(), network, crosschainRecipient }} arcNetwork={(process.env.NEXT_PUBLIC_ARC_NETWORK as ArcNetwork | undefined) ?? "testnet"} circleAppId={process.env.CIRCLE_APP_ID} googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID} />;
}
