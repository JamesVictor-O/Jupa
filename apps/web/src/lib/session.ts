import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gte, merchants, sessions, type Merchant } from "@jupa/db";
import { db } from "./db";

const COOKIE = "jupa_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Start a session for a merchant. Call only from a Route Handler or Server Function. */
export async function createSession(merchantId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    tokenHash: hash(token),
    merchantId,
    expiresAt: new Date(Date.now() + MAX_AGE_S * 1000),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

/** The signed-in merchant, or null. Safe to call from Server Components. */
export async function currentMerchant(): Promise<Merchant | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ merchant: merchants })
    .from(sessions)
    .innerJoin(merchants, eq(sessions.merchantId, merchants.id))
    .where(and(eq(sessions.tokenHash, hash(token)), gte(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.merchant ?? null;
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hash(token)));
  store.delete(COOKIE);
}
