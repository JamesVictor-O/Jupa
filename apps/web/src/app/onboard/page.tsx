import type { Metadata } from "next";
import { eq } from "@jupa/db";
import { Onboarding } from "@/components/onboarding/onboarding";
import { db } from "@/lib/db";
import { arc } from "@/lib/env";
import { currentMerchant } from "@/lib/session";
import { publicStore } from "@/lib/stores";

export const metadata: Metadata = { title: "Set up your store · Jupa" };

/** F1 / Flow A. The server decides the step from the session; the client runs the flow. */
export default async function OnboardPage() {
  const merchant = await currentMerchant();
  const store = merchant ? await db.query.stores.findFirst({ where: (s) => eq(s.merchantId, merchant.id) }) : undefined;

  return (
    <Onboarding
      circleAppId={process.env.NEXT_PUBLIC_CIRCLE_APP_ID}
      signedIn={Boolean(merchant)}
      email={merchant?.email ?? null}
      store={store ? publicStore(store) : null}
      explorerUrl={arc.explorerUrl}
    />
  );
}
