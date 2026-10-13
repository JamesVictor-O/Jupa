import { NextResponse, type NextRequest } from "next/server";
import { bridgeAttempts, charges, eq, payments, stores } from "@jupa/db";
import { parseUsdc } from "@jupa/shared";
import { crosschainReceiver } from "@/lib/crosschain";
import { db } from "@/lib/db";

const TX_HASH = /^0x[0-9a-fA-F]{64}$|^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

type AttemptBody = {
  provider?: string;
  sourceChain?: string;
  sourceWallet?: string;
  destinationAddress?: string;
  amount?: string;
  token?: string;
  state?: "pending" | "success" | "error";
  burnTxHash?: string | null;
  mintTxHash?: string | null;
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

/**
 * Save recovery metadata reported by App Kit. Settlement never trusts this
 * endpoint: the Arc indexer remains the only component that marks a charge paid.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/checkout/[chargeId]/bridge-attempt">) {
  const { chargeId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as AttemptBody | null;
  const provider = cleanText(body?.provider, 80);
  const sourceChain = cleanText(body?.sourceChain, 80);
  const sourceWallet = cleanText(body?.sourceWallet, 100);
  const destinationAddress = cleanText(body?.destinationAddress, 42);
  const amount = cleanText(body?.amount, 40);
  const token = cleanText(body?.token, 20);
  const state = body?.state;
  const burnTxHash = body?.burnTxHash ?? null;
  const mintTxHash = body?.mintTxHash ?? null;

  if (!provider || !sourceChain || !sourceWallet || !destinationAddress || !amount || token !== "USDC" || !state) {
    return NextResponse.json({ error: "Incomplete bridge attempt." }, { status: 400 });
  }
  if (!EVM_ADDRESS.test(destinationAddress) || (burnTxHash && !TX_HASH.test(burnTxHash)) || (mintTxHash && !TX_HASH.test(mintTxHash))) {
    return NextResponse.json({ error: "Invalid bridge transaction data." }, { status: 400 });
  }

  const [record] = await db
    .select({
      id: charges.id,
      amount: charges.amount,
      status: charges.status,
      registryId: stores.registryId,
      reference: charges.reference,
      settledSourceChain: payments.sourceChain,
      finalizedAt: payments.finalizedAt,
    })
    .from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .leftJoin(payments, eq(payments.chargeId, charges.id))
    .where(eq(charges.id, chargeId))
    .limit(1);
  if (!record) return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  if (record.settledSourceChain === "arc") {
    return NextResponse.json({ error: "This charge was paid directly on Arc." }, { status: 409 });
  }

  const expectedReceiver = await crosschainReceiver(record.registryId as `0x${string}`, record.reference as `0x${string}`);
  let reportedAmount: bigint;
  try {
    reportedAmount = parseUsdc(amount);
  } catch {
    return NextResponse.json({ error: "Invalid bridge amount." }, { status: 400 });
  }
  if (!expectedReceiver || destinationAddress.toLowerCase() !== expectedReceiver.toLowerCase() || reportedAmount !== record.amount) {
    return NextResponse.json({ error: "Bridge attempt does not match this charge." }, { status: 409 });
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(bridgeAttempts)
      .values({ chargeId, provider, sourceChain, sourceWallet, burnTxHash, mintTxHash, status: state, reportedAt: new Date(), arcSettledAt: record.finalizedAt })
      .onConflictDoUpdate({
        target: bridgeAttempts.chargeId,
        set: {
          provider,
          sourceChain,
          sourceWallet,
          burnTxHash,
          mintTxHash,
          status: state,
          reportedAt: new Date(),
          ...(record.finalizedAt ? { arcSettledAt: record.finalizedAt } : {}),
        },
      });
    if (record.status === "created" && burnTxHash) {
      await tx.update(charges).set({ status: "paying" }).where(eq(charges.id, chargeId));
    }
  });

  return NextResponse.json({ recorded: true });
}
