import { NextResponse, type NextRequest } from "next/server";
import { eq, stores } from "@jupa/db";
import { db } from "@/lib/db";
import { publicId, registryIdFor } from "@/lib/ids";
import { currentMerchant } from "@/lib/session";
import { parseStoreInput, publicStore, registerStore } from "@/lib/stores";

/** F1 + F2: create the merchant's store and register its payout address on Arc. */
export async function POST(req: NextRequest) {
  const merchant = await currentMerchant();
  if (!merchant) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const existing = await db.query.stores.findFirst({ where: (s) => eq(s.merchantId, merchant.id) });
  if (existing) return NextResponse.json({ store: publicStore(existing) }, { status: 200 });

  const parsed = parseStoreInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  const id = publicId();
  const [created] = await db
    .insert(stores)
    .values({
      id,
      registryId: registryIdFor(id),
      merchantId: merchant.id,
      name: parsed.value.name,
      logoUrl: parsed.value.logo,
      payoutAddress: parsed.value.payout,
    })
    .returning();

  const store = await registerStore(created);
  return NextResponse.json({ store: publicStore(store) }, { status: 201 });
}
