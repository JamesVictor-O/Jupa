import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { circle, CircleNotConfigured, circleErrorDetails } from "@/lib/circle";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Step 1 of sign-in: Circle emails a one-time code. Returns the tokens Circle's web SDK needs to verify it. */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const body = (await req.json().catch(() => null)) as { email?: string; deviceId?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !EMAIL.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!body?.deviceId) {
    return NextResponse.json({ error: "Sign-in isn't ready yet. Reload the page and try again." }, { status: 400 });
  }

  try {
    const res = await circle().createDeviceTokenForEmailLogin({
      deviceId: body.deviceId,
      email,
      xRequestId: requestId,
    });
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
    const details = circleErrorDetails(err);
    console.error("[auth] email code failed", { requestId, ...details });
    if (details.status === 429) {
      return NextResponse.json(
        { error: "Too many code requests. Wait a few minutes and try again.", requestId },
        { status: 429 },
      );
    }
    if (details.status === 401 || details.status === 403) {
      return NextResponse.json(
        { error: "The sign-in service rejected the server configuration.", requestId },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't send a code. Check the email and try again.", requestId },
      { status: 502 },
    );
  }
}
