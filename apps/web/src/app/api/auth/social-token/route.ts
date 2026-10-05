import { NextResponse, type NextRequest } from "next/server";
import { circle, CircleNotConfigured, circleErrorCode } from "@/lib/circle";

/** Create the device-bound credentials Circle's Web SDK needs before social OAuth. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { deviceId?: string } | null;
  if (!body?.deviceId) {
    return NextResponse.json({ error: "Sign-in isn't ready yet. Reload the page and try again." }, { status: 400 });
  }

  try {
    const res = await circle().createDeviceTokenForSocialLogin({ deviceId: body.deviceId });
    const { deviceToken, deviceEncryptionKey } = res.data ?? {};
    if (!deviceToken || !deviceEncryptionKey) throw new Error("Incomplete response from Circle");
    return NextResponse.json({ deviceToken, deviceEncryptionKey });
  } catch (err) {
    if (err instanceof CircleNotConfigured) {
      return NextResponse.json({ error: "Sign-in isn't set up on this server yet." }, { status: 503 });
    }
    console.error("[auth] social token failed", circleErrorCode(err) ?? (err as Error).message);
    return NextResponse.json({ error: "Social sign-in couldn't start. Try again." }, { status: 502 });
  }
}
