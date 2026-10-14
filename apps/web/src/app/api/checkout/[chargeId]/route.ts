import { NextResponse, type NextRequest } from "next/server";
import { charges, eq, stores } from "@jupa/db";
import { formatUsd } from "@jupa/shared";
import { createPublicClient, erc20Abi, http, isAddress, type Address } from "viem";
import { circle, circleArcChain, verifyUserToken } from "@/lib/circle";
import { crosschainReceiver } from "@/lib/crosschain";
import { db } from "@/lib/db";
import { arc, arcNetwork as network } from "@/lib/env";

async function checkout(chargeId: string) {
  const [record] = await db
    .select({
      id: charges.id,
      reference: charges.reference,
      amount: charges.amount,
      status: charges.status,
      expiresAt: charges.expiresAt,
      storeName: stores.name,
      registryId: stores.registryId,
      payoutAddress: stores.payoutAddress,
      registryStatus: stores.registryStatus,
    })
    .from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .where(eq(charges.id, chargeId))
    .limit(1);
  return record;
}

async function publicCharge(record: NonNullable<Awaited<ReturnType<typeof checkout>>>) {
  const receiver = await crosschainReceiver(record.registryId as `0x${string}`, record.reference as `0x${string}`);
  return {
    id: record.id,
    amount: record.amount.toString(),
    amountLabel: formatUsd(record.amount),
    status: record.status,
    expiresAt: record.expiresAt.toISOString(),
    storeName: record.storeName,
    network: network === "mainnet" ? "Arc" : "Arc testnet",
    token: "USDC",
    payoutAddress: record.payoutAddress,
    crosschainRecipient: receiver,
  };
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/checkout/[chargeId]">) {
  const { chargeId } = await ctx.params;
  const record = await checkout(chargeId);
  if (!record) return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  return NextResponse.json({ charge: await publicCharge(record) });
}

async function handlePost(req: NextRequest, ctx: RouteContext<"/api/checkout/[chargeId]">) {
  const { chargeId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { userToken?: string; action?: "wallet" | "wallet-status" | "approve" | "pay" }
    | null;
  if (!body?.userToken || !(await verifyUserToken(body.userToken))) {
    return NextResponse.json({ error: "Your sign-in expired. Sign in again." }, { status: 401 });
  }
  if (body.action !== "wallet" && body.action !== "wallet-status" && body.action !== "approve" && body.action !== "pay") {
    return NextResponse.json({ error: "Unknown checkout action." }, { status: 400 });
  }

  const record = await checkout(chargeId);
  if (!record) return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  if (record.registryStatus !== "registered") {
    return NextResponse.json({ error: "This store is not ready to receive payments." }, { status: 409 });
  }
  if (record.status === "paid") return NextResponse.json({ paid: true });
  if (record.status === "expired" || record.expiresAt <= new Date()) {
    await db.update(charges).set({ status: "expired" }).where(eq(charges.id, record.id));
    return NextResponse.json({ error: "This payment request has expired." }, { status: 410 });
  }

  const registry = process.env.STORE_REGISTRY_ADDRESS;
  if (!registry || !isAddress(registry)) {
    return NextResponse.json({ error: "Payments are not configured on this server." }, { status: 503 });
  }

  const wallets = await circle().listWallets({ userToken: body.userToken, blockchain: circleArcChain() });
  const wallet = wallets.data?.wallets?.find((item) => item.blockchain === circleArcChain() && item.address);
  if (body.action === "wallet-status") {
    return NextResponse.json({ walletReady: Boolean(wallet?.id && wallet.address) });
  }
  if (body.action === "wallet") {
    if (wallet?.id && wallet.address) return NextResponse.json({ walletReady: true });
    const user = await circle().getUserStatus({ userToken: body.userToken });
    const result = user.data?.pinStatus === "UNSET"
      ? await circle().createUserPinWithWallets({
          userToken: body.userToken,
          blockchains: [circleArcChain()],
          accountType: "EOA",
        })
      : await circle().createWallet({
          userToken: body.userToken,
          blockchains: [circleArcChain()],
          accountType: "EOA",
        });
    const challengeId = result.data?.challengeId;
    if (!challengeId) return NextResponse.json({ error: "Circle did not create a wallet challenge." }, { status: 502 });
    return NextResponse.json({ challengeId });
  }
  if (!wallet?.id || !wallet.address || !isAddress(wallet.address)) {
    return NextResponse.json({ error: "No Arc wallet was found for this account." }, { status: 409 });
  }

  const publicClient = createPublicClient({
    chain: arc.chain,
    transport: http(process.env.ARC_RPC_URL ?? arc.chain.rpcUrls.default.http[0]),
  });
  const allowance = await publicClient.readContract({
    address: arc.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [wallet.address as Address, registry],
  });

  if (body.action === "approve") {
    if (allowance >= record.amount) return NextResponse.json({ approved: true });
    const result = await circle().createUserTransactionContractExecutionChallenge({
      userToken: body.userToken,
      walletId: wallet.id,
      contractAddress: arc.usdc,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [registry, record.amount.toString()],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      refId: `approve:${record.id}`,
    });
    const challengeId = result.data?.challengeId;
    if (!challengeId) return NextResponse.json({ error: "Circle did not create an approval challenge." }, { status: 502 });
    return NextResponse.json({ challengeId });
  }

  if (allowance < record.amount) {
    return NextResponse.json({ error: "USDC approval is still confirming. Try again in a moment." }, { status: 409 });
  }
  const result = await circle().createUserTransactionContractExecutionChallenge({
    userToken: body.userToken,
    walletId: wallet.id,
    contractAddress: registry,
    abiFunctionSignature: "pay(bytes32,bytes32,uint256)",
    abiParameters: [record.registryId, record.reference, record.amount.toString()],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    refId: `pay:${record.id}`,
  });
  const challengeId = result.data?.challengeId;
  if (!challengeId) return NextResponse.json({ error: "Circle did not create a payment challenge." }, { status: 502 });
  await db.update(charges).set({ status: "paying" }).where(eq(charges.id, record.id));
  return NextResponse.json({ challengeId });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/checkout/[chargeId]">) {
  try {
    return await handlePost(req, ctx);
  } catch (error) {
    console.error("[checkout] action failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The wallet service could not complete that step. Try again." }, { status: 502 });
  }
}
