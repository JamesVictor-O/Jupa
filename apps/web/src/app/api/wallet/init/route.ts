import { NextResponse, type NextRequest } from "next/server";
import { circle, circleArcChain, circleErrorCode, verifyUserToken } from "@/lib/circle";
import { currentMerchant } from "@/lib/session";

/**
 * Start creating the merchant's Arc wallet. Returns a Circle challenge the browser executes
 * (the merchant approves in Circle's UI), or `existing: true` if they already have one.
 */
export async function POST(req: NextRequest) {
  const merchant = await currentMerchant();
  if (!merchant) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { userToken?: string } | null;
  if (!body?.userToken || (await verifyUserToken(body.userToken)) !== merchant.circleUserId) {
    return NextResponse.json({ error: "Your sign-in expired. Sign in again to create a wallet." }, { status: 401 });
  }

  try {
    const res = await circle().createUserPinWithWallets({
      userToken: body.userToken,
      blockchains: [circleArcChain()],
      accountType: "EOA",
    });
    return NextResponse.json({ challengeId: res.data?.challengeId });
  } catch (err) {
    if (circleErrorCode(err) === 155106) return NextResponse.json({ existing: true });
    console.error("[wallet] init failed", circleErrorCode(err) ?? (err as Error).message);
    return NextResponse.json({ error: "We couldn't start your wallet. Try again, or paste an address you already have." }, { status: 502 });
  }
}
