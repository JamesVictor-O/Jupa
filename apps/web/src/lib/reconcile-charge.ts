import "server-only";
import { bridgeAttempts, charges, eq, paymentEvents, payments, sql, stores } from "@jupa/db";
import { crosschainPaymentFactoryAbi, evaluatePayment, getArcConfig, resolveArcNetwork, storeRegistryAbi } from "@jupa/shared";
import { createPublicClient, createWalletClient, decodeEventLog, erc20Abi, http, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "./db";

const running = new Map<string, Promise<void>>();

/**
 * Recover one browser-reported cross-chain payment while checkout is polling.
 * The factory is permissionless and can only forward to StoreRegistry's payout.
 */
export async function reconcileCrosschainCharge(chargeId: string) {
  const active = running.get(chargeId);
  if (active) return active;
  const task = reconcile(chargeId).finally(() => running.delete(chargeId));
  running.set(chargeId, task);
  return task;
}

async function reconcile(chargeId: string) {
  const factory = process.env.CROSSCHAIN_PAYMENT_FACTORY_ADDRESS;
  const registry = process.env.STORE_REGISTRY_ADDRESS;
  const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!factory || !registry || !relayerKey || !isAddress(factory) || !isAddress(registry)) return;

  const [record] = await db
    .select({
      id: charges.id,
      charged: charges.amount,
      expiresAt: charges.expiresAt,
      status: charges.status,
      reference: charges.reference,
      registryId: stores.registryId,
      bridgeStatus: bridgeAttempts.status,
    })
    .from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .leftJoin(bridgeAttempts, eq(bridgeAttempts.chargeId, charges.id))
    .where(eq(charges.id, chargeId))
    .limit(1);
  if (!record || record.status !== "paying" || record.bridgeStatus !== "success") return;

  const arc = getArcConfig(resolveArcNetwork(process.env.ARC_NETWORK ?? process.env.NEXT_PUBLIC_ARC_NETWORK, process.env.NODE_ENV));
  const transport = http(process.env.ARC_RPC_URL ?? arc.chain.rpcUrls.default.http[0]);
  const client = createPublicClient({ chain: arc.chain, transport });
  const storeId = record.registryId as Hex;
  const chargeRef = record.reference as Hex;
  const receiver = await client.readContract({ address: factory, abi: crosschainPaymentFactoryAbi, functionName: "receiverOf", args: [storeId, chargeRef] });
  const balance = await client.readContract({ address: arc.usdc, abi: erc20Abi, functionName: "balanceOf", args: [receiver] });
  if (balance === 0n) return;

  const account = privateKeyToAccount(relayerKey);
  const wallet = createWalletClient({ account, chain: arc.chain, transport });
  let hash: Hex;
  try {
    hash = await wallet.writeContract({ address: factory, abi: crosschainPaymentFactoryAbi, functionName: "settle", args: [storeId, chargeRef] });
  } catch {
    // Another request or the standalone indexer may have won the settlement race.
    return;
  }
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") return;

  const parsed = receipt.logs.flatMap((log) => {
    try {
      const event = decodeEventLog({ abi: crosschainPaymentFactoryAbi, data: log.data, topics: log.topics });
      return event.eventName === "CrosschainChargePaid" ? [{ ...event.args, logIndex: log.logIndex }] : [];
    } catch {
      return [];
    }
  })[0];
  if (!parsed || parsed.storeId !== storeId || parsed.chargeRef !== chargeRef) return;

  const registeredPayout = await client.readContract({ address: registry, abi: storeRegistryAbi, functionName: "payoutOf", args: [storeId] });
  if (registeredPayout.toLowerCase() !== (parsed.payout as Address).toLowerCase()) return;

  const finalizedAt = new Date();
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(paymentEvents).values({
      id: `${hash}:${parsed.logIndex}`,
      chargeId: record.id,
      txHash: hash,
      logIndex: BigInt(parsed.logIndex),
      amount: parsed.amount,
    }).onConflictDoNothing().returning({ id: paymentEvents.id });
    if (inserted.length === 0) return;

    const [payment] = await tx.insert(payments).values({
      chargeId: record.id,
      arcTxHash: hash,
      amountReceived: parsed.amount,
      finalizedAt,
    }).onConflictDoUpdate({
      target: payments.chargeId,
      set: { amountReceived: sql`coalesce(${payments.amountReceived}, 0) + ${parsed.amount}`, arcTxHash: hash, finalizedAt },
    }).returning({ amountReceived: payments.amountReceived });
    const result = evaluatePayment(record.charged, payment.amountReceived ?? 0n, finalizedAt, record.expiresAt);
    await tx.update(charges).set(result.settles
      ? { status: "paid", late: result.flags.late, overpaid: result.flags.overpaid }
      : { status: "needs_attention" }).where(eq(charges.id, record.id));
    await tx.update(bridgeAttempts).set({ arcSettledAt: finalizedAt }).where(eq(bridgeAttempts.chargeId, record.id));
  });
}
