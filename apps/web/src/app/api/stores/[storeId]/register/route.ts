import { NextResponse, type NextRequest } from "next/server";
import { and, eq, stores } from "@jupa/db";
import { db } from "@/lib/db";
import { currentMerchant } from "@/lib/session";
import { publicStore, registerStore } from "@/lib/stores";

/** Retry onchain registration for a store that is pending or failed. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/stores/[storeId]/register">) {
  const merchant = await currentMerchant();
  if (!merchant) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { storeId } = await ctx.params;
  const store = await db.query.stores.findFirst({
    where: and(eq(stores.id, storeId), eq(stores.merchantId, merchant.id)),
  });
  if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });
  if (store.registryStatus === "registered") return NextResponse.json({ store: publicStore(store) });

  return NextResponse.json({ store: publicStore(await registerStore(store)) });
}
