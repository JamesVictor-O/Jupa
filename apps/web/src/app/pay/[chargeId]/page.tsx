import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { charges, eq, stores } from "@jupa/db";
import { formatUsd } from "@jupa/shared";
import { Checkout } from "@/components/checkout/checkout";
import { MerchantShell } from "@/components/dashboard/merchant-shell";
import { crosschainReceiver } from "@/lib/crosschain";
import { db } from "@/lib/db";
import { arcNetwork } from "@/lib/env";
import { currentMerchant } from "@/lib/session";

export const metadata: Metadata = { title: "Pay · Jupa" };

export default async function CheckoutPage(props: PageProps<"/pay/[chargeId]">) {
  const { chargeId } = await props.params;
  const [record] = await db
    .select({
      id: charges.id,
      amount: charges.amount,
      status: charges.status,
      expiresAt: charges.expiresAt,
      storeId: stores.id,
      merchantId: stores.merchantId,
      storeName: stores.name,
      logoUrl: stores.logoUrl,
      payoutAddress: stores.payoutAddress,
      registryId: stores.registryId,
      reference: charges.reference,
    })
    .from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .where(eq(charges.id, chargeId))
    .limit(1);
  if (!record) notFound();
  const network = arcNetwork === "mainnet" ? "Arc" : "Arc testnet";
  const crosschainRecipient = await crosschainReceiver(record.registryId as `0x${string}`, record.reference as `0x${string}`);
  const merchant = await currentMerchant();
  const merchantOwnsCharge = merchant?.id === record.merchantId;

  const checkout = <Checkout embedded={merchantOwnsCharge} charge={{ id: record.id, status: record.status, storeName: record.storeName, payoutAddress: record.payoutAddress, amountLabel: formatUsd(record.amount), amount: record.amount.toString(), expiresAt: record.expiresAt.toISOString(), network, crosschainRecipient }} arcNetwork={arcNetwork} circleAppId={process.env.CIRCLE_APP_ID} googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID} walletConnectProjectId={process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID} />;
  if (!merchantOwnsCharge) return checkout;
  return <MerchantShell store={{ id: record.storeId, name: record.storeName, logoUrl: record.logoUrl }} active="till">{checkout}</MerchantShell>;
}
