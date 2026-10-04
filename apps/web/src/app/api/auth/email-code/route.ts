import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { circle, CircleNotConfigured, circleErrorCode } from "@/lib/circle";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Step 1 of sign-in: Circle emails a one-time code. Returns the tokens Circle's web SDK needs to verify it. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; deviceId?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !EMAIL.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!body?.deviceId) {
    return NextResponse.json({ error: "Sign-in isn't ready yet. Reload the page and try again." }, { status: 400 });
  }

  try {
    const res = await circle().createDeviceTokenForEmailLogin({ deviceId: body.deviceId, email });
    const { deviceToken, deviceEncryptionKey, otpToken } = res.data ?? {};
    if (!deviceToken || !deviceEncryptionKey || !otpToken) throw new Error("Incomplete response from Circle");

    // Remember which email is signing in, so the account can show it. Display only.
    (await cookies()).set("jupa_login_email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    return NextResponse.json({ deviceToken, deviceEncryptionKey, otpToken });
  } catch (err) {
    if (err instanceof CircleNotConfigured) {
      return NextResponse.json({ error: "Sign-in isn't set up on this server yet." }, { status: 503 });
    }
    console.error("[auth] email code failed", circleErrorCode(err) ?? (err as Error).message);
    return NextResponse.json({ error: "We couldn't send a code. Check the email and try again." }, { status: 502 });
  }
}
