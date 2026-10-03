import { NextResponse, type NextRequest } from "next/server";
import { charges, eq } from "@jupa/db";
import { db } from "@/lib/db";

/** Till and checkout poll this; a dropped connection just reloads status from here. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/charges/[chargeId]">) {
  const { chargeId } = await ctx.params;
  const charge = await db.query.charges.findFirst({ where: eq(charges.id, chargeId) });
  if (!charge) return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  return NextResponse.json({ ...charge, amount: charge.amount.toString() });
}
