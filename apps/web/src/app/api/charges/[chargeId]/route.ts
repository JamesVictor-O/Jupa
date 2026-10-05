import { NextResponse, type NextRequest } from "next/server";
import { and, charges, eq, stores } from "@jupa/db";
import { db } from "@/lib/db";
import { currentMerchant } from "@/lib/session";

/** Till and checkout poll this; a dropped connection just reloads status from here. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/charges/[chargeId]">) {
  const { chargeId } = await ctx.params;
  let charge = await db.query.charges.findFirst({ where: eq(charges.id, chargeId) });
  if (!charge) return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  if (charge.status === "created" && charge.expiresAt <= new Date()) {
    [charge] = await db.update(charges).set({ status: "expired" }).where(eq(charges.id, charge.id)).returning();
  }
  return NextResponse.json({ ...charge, amount: charge.amount.toString() });
}

/** A cashier can close an unpaid charge before its timer runs out. */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/charges/[chargeId]">) {
  const merchant = await currentMerchant();
  if (!merchant) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { chargeId } = await ctx.params;
  const [owned] = await db.select({ id: charges.id, status: charges.status }).from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .where(and(eq(charges.id, chargeId), eq(stores.merchantId, merchant.id))).limit(1);
  if (!owned) return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  if (owned.status !== "created") return NextResponse.json({ error: "This charge can no longer be cancelled." }, { status: 409 });

  await db.update(charges).set({ status: "expired" }).where(eq(charges.id, chargeId));
  return NextResponse.json({ ok: true });
}
