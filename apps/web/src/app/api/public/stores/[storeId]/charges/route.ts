import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { charges, eq, stores } from "@jupa/db";
import { DEFAULT_CHARGE_TTL_MS, parseUsd } from "@jupa/shared";
import { db } from "@/lib/db";

/** Creates a single-use charge from a store's permanent public payment page. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/public/stores/[storeId]/charges">) {
  const { storeId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { amount?: string } | null;
  if (!body?.amount) return NextResponse.json({ error: "Enter an amount to pay." }, { status: 400 });

  let amount: bigint;
  try {
    amount = parseUsd(body.amount);
  } catch {
    return NextResponse.json({ error: "Enter a valid amount, such as 12.50 or 0.021." }, { status: 400 });
  }
  if (amount <= 0n) return NextResponse.json({ error: "Amount must be more than zero." }, { status: 400 });

  const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });
  if (!store) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });
  if (store.registryStatus !== "registered") {
    return NextResponse.json({ error: "This merchant is not ready to receive payments yet." }, { status: 409 });
  }

  const [charge] = await db.insert(charges).values({
    id: randomBytes(16).toString("base64url"),
    storeId: store.id,
    reference: `0x${randomBytes(32).toString("hex")}`,
    amount,
    expiresAt: new Date(Date.now() + DEFAULT_CHARGE_TTL_MS),
  }).returning({ id: charges.id, expiresAt: charges.expiresAt });

  return NextResponse.json({ id: charge.id, expiresAt: charge.expiresAt.toISOString() }, { status: 201 });
}
