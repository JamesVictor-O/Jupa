import { NextResponse, type NextRequest } from "next/server";
import { circle, circleArcChain, verifyUserToken } from "@/lib/circle";
import { currentMerchant } from "@/lib/session";

/** The merchant's Circle wallet address on Arc, once created. 404 while Circle is still indexing it. */
export async function POST(req: NextRequest) {
  const merchant = await currentMerchant();
  if (!merchant) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { userToken?: string } | null;
  if (!body?.userToken || (await verifyUserToken(body.userToken)) !== merchant.circleUserId) {
    return NextResponse.json({ error: "Your sign-in expired. Sign in again." }, { status: 401 });
  }

  const res = await circle().listWallets({ userToken: body.userToken, blockchain: circleArcChain() });
  const wallet = res.data?.wallets?.find((w) => w.blockchain === circleArcChain());
  if (!wallet?.address) return NextResponse.json({ pending: true }, { status: 404 });
  return NextResponse.json({ address: wallet.address });
}
