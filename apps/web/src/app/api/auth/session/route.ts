import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq, merchants } from "@jupa/db";
import { CircleNotConfigured, verifyUserToken } from "@/lib/circle";
import { db } from "@/lib/db";
import { publicId } from "@/lib/ids";
import { createSession } from "@/lib/session";

/**
 * Step 2 of sign-in: after Circle verifies the code in the browser, exchange the Circle
 * userToken for a Jupa session. Identity is the Circle user id that Circle itself confirms.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { userToken?: string } | null;
  if (!body?.userToken) return NextResponse.json({ error: "Sign-in expired. Start again." }, { status: 400 });

  let circleUserId: string | null;
  try {
    circleUserId = await verifyUserToken(body.userToken);
  } catch (err) {
    if (err instanceof CircleNotConfigured) {
      return NextResponse.json({ error: "Sign-in isn't set up on this server yet." }, { status: 503 });
    }
    throw err;
  }
  if (!circleUserId) return NextResponse.json({ error: "Sign-in expired. Start again." }, { status: 401 });

  const jar = await cookies();
  const email = jar.get("jupa_login_email")?.value ?? null;
  jar.delete("jupa_login_email");

  const [merchant] = await db
    .insert(merchants)
    .values({ id: publicId(16), circleUserId, email })
    .onConflictDoUpdate({ target: merchants.circleUserId, set: email ? { email } : { circleUserId } })
    .returning();

  await createSession(merchant.id);
  const store = await db.query.stores.findFirst({ where: (s) => eq(s.merchantId, merchant.id) });
  return NextResponse.json({ merchantId: merchant.id, hasStore: Boolean(store) });
}
