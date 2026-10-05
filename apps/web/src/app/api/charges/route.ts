import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, charges, eq, stores } from "@jupa/db";
import { DEFAULT_CHARGE_TTL_MS, parseUsd } from "@jupa/shared";
import { db } from "@/lib/db";
import { currentMerchant } from "@/lib/session";

/** F3: the till creates a charge from a typed USD amount. */
export async function POST(req: NextRequest) {
  const merchant = await currentMerchant();
  if (!merchant) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { storeId?: string; amount?: string } | null;
  if (!body?.storeId || !body.amount) {
    return NextResponse.json({ error: "Enter an amount to charge." }, { status: 400 });
  }

  let amount: bigint;
  try {
    amount = parseUsd(body.amount);
  } catch {
    return NextResponse.json({ error: "That amount isn't valid. Use dollars and cents, like 12.50." }, { status: 400 });
  }
  if (amount <= 0n) return NextResponse.json({ error: "Amount must be more than zero." }, { status: 400 });

  const store = await db.query.stores.findFirst({ where: and(eq(stores.id, body.storeId), eq(stores.merchantId, merchant.id)) });
  if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });
  if (store.registryStatus !== "registered") {
    return NextResponse.json({ error: "Finish setting up payments before creating a charge." }, { status: 409 });
  }

  const [charge] = await db
    .insert(charges)
    .values({
      id: randomBytes(16).toString("base64url"),
      storeId: store.id,
      reference: `0x${randomBytes(32).toString("hex")}`,
      amount,
      expiresAt: new Date(Date.now() + DEFAULT_CHARGE_TTL_MS),
    })
    .returning();

  return NextResponse.json({ ...charge, amount: charge.amount.toString() }, { status: 201 });
}
