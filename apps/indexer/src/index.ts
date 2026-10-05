/**
 * Arc payment watcher (F7). Marks a charge Paid only on a final Arc transfer to the
 * registered payout address that references that charge.
 *
 * Arc has deterministic finality, so an included block is final.
 * Subscribes via watchContractEvent and falls back to polling (viem `poll`).
 */
import { createPublicClient, createWalletClient, erc20Abi, http, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { charges, createDb, desc, eq, notInArray, payments, stores } from "@jupa/db";
import { crosschainPaymentFactoryAbi, evaluatePayment, getArcConfig, storeRegistryAbi, type ArcNetwork } from "@jupa/shared";

const arc = getArcConfig((process.env.ARC_NETWORK as ArcNetwork) ?? "testnet");
const configuredRegistry = process.env.STORE_REGISTRY_ADDRESS as Address | undefined;
if (!configuredRegistry) throw new Error("STORE_REGISTRY_ADDRESS is not set");
const registry: Address = configuredRegistry;

const client = createPublicClient({
  chain: arc.chain,
  transport: http(process.env.ARC_RPC_URL ?? arc.chain.rpcUrls.default.http[0]),
});
const db = createDb();
const configuredFactory = process.env.CROSSCHAIN_PAYMENT_FACTORY_ADDRESS;
const factory = configuredFactory && isAddress(configuredFactory) ? configuredFactory : null;

async function indexPayment(log: {
  args: {
    storeId?: `0x${string}`;
    chargeRef?: `0x${string}`;
    payout?: Address;
    amount?: bigint;
  };
  transactionHash?: `0x${string}` | null;
  blockNumber?: bigint | null;
}) {
  const { storeId, chargeRef, payout, amount } = log.args;
  const txHash = log.transactionHash;
  if (!storeId || !chargeRef || !payout || amount === undefined || !txHash) {
    console.warn("[indexer] ignored incomplete ChargePaid log", { txHash, blockNumber: log.blockNumber });
    return;
  }

  const [record] = await db
    .select({
      chargeId: charges.id,
      charged: charges.amount,
      expiresAt: charges.expiresAt,
      registryId: stores.registryId,
    })
    .from(charges)
    .innerJoin(stores, eq(stores.id, charges.storeId))
    .where(eq(charges.reference, chargeRef))
    .limit(1);
  if (!record || record.registryId.toLowerCase() !== storeId.toLowerCase()) {
    console.warn("[indexer] ignored unmatched ChargePaid log", { storeId, chargeRef, txHash });
    return;
  }

  const registeredPayout = await client.readContract({
    address: registry,
    abi: storeRegistryAbi,
    functionName: "payoutOf",
    args: [storeId],
  });
  if (registeredPayout.toLowerCase() !== payout.toLowerCase()) {
    console.error("[indexer] payout mismatch", { storeId, payout, registeredPayout, txHash });
    return;
  }

  const finalizedAt = new Date();
  const result = evaluatePayment(record.charged, amount, finalizedAt, record.expiresAt);
  await db.transaction(async (tx) => {
    await tx
      .insert(payments)
      .values({
        chargeId: record.chargeId,
        sourceChain: "arc",
        sourceTxHash: txHash,
        arcTxHash: txHash,
        amountReceived: amount,
        finalizedAt,
      })
      .onConflictDoNothing();

    await tx
      .update(charges)
      .set(
        result.settles
          ? { status: "paid", late: result.flags.late, overpaid: result.flags.overpaid }
          : { status: "needs_attention" },
      )
      .where(eq(charges.id, record.chargeId));
  });

  console.log(`[indexer] ${result.settles ? "settled" : "flagged"} charge ${record.chargeId}`, {
    amount: amount.toString(),
    txHash,
  });
}

console.log(`[indexer] watching ${registry} on Arc ${arc.network}`);

async function processLogs(logs: Parameters<typeof indexPayment>[0][]) {
  for (const log of logs) {
    const { storeId, chargeRef, payout, amount } = log.args;
    console.log("[indexer] ChargePaid", { storeId, chargeRef, payout, amount, tx: log.transactionHash });
    try {
      await indexPayment(log);
    } catch (error) {
      console.error("[indexer] failed to index ChargePaid", { tx: log.transactionHash, error });
    }
  }
}

client.watchContractEvent({
  address: registry,
  abi: storeRegistryAbi,
  eventName: "ChargePaid",
  poll: true,
  pollingInterval: 1_000,
  onLogs: processLogs,
  onError: (err) => console.error("[indexer] watch error", err),
});

if (factory) {
  client.watchContractEvent({
    address: factory,
    abi: crosschainPaymentFactoryAbi,
    eventName: "CrosschainChargePaid",
    poll: true,
    pollingInterval: 1_000,
    onLogs: processLogs,
    onError: (err) => console.error("[indexer] crosschain watch error", err),
  });
}

// Replay historical logs after every restart. Writes are idempotent, and starting the
// live watcher first closes the gap between the replay's head block and new events.
const head = await client.getBlockNumber();
const configuredStart = process.env.STORE_REGISTRY_DEPLOYMENT_BLOCK;
const fromBlock = configuredStart ? BigInt(configuredStart) : head > 10_000n ? head - 10_000n : 0n;
try {
  const historical = await client.getContractEvents({
    address: registry,
    abi: storeRegistryAbi,
    eventName: "ChargePaid",
    fromBlock,
    toBlock: head,
  });
  await processLogs(historical);
  console.log(`[indexer] replayed ${historical.length} payment event(s) from block ${fromBlock}`);
} catch (error) {
  console.error("[indexer] historical replay failed; live watcher remains active", error);
}

if (factory) {
  const crosschainHead = await client.getBlockNumber();
  const crosschainStart = process.env.CROSSCHAIN_FACTORY_DEPLOYMENT_BLOCK;
  const crosschainFrom = crosschainStart ? BigInt(crosschainStart) : crosschainHead > 10_000n ? crosschainHead - 10_000n : 0n;
  try {
    const historical = await client.getContractEvents({
      address: factory,
      abi: crosschainPaymentFactoryAbi,
      eventName: "CrosschainChargePaid",
      fromBlock: crosschainFrom,
      toBlock: crosschainHead,
    });
    await processLogs(historical);
    console.log(`[indexer] replayed ${historical.length} crosschain event(s) from block ${crosschainFrom}`);
  } catch (error) {
    console.error("[indexer] crosschain replay failed; live watcher remains active", error);
  }
}

const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
if (factory && relayerKey) {
  const account = privateKeyToAccount(relayerKey);
  const wallet = createWalletClient({ account, chain: arc.chain, transport: http(process.env.ARC_RPC_URL ?? arc.chain.rpcUrls.default.http[0]) });
  let settling = false;
  let settlementOffset = 0;
  const settleFundedReceivers = async () => {
    if (settling) return;
    settling = true;
    try {
      const open = await db
        .select({ id: charges.id, reference: charges.reference, registryId: stores.registryId })
        .from(charges)
        .innerJoin(stores, eq(stores.id, charges.storeId))
        .where(notInArray(charges.status, ["paid", "needs_attention"]))
        .orderBy(desc(charges.createdAt))
        .limit(100)
        .offset(settlementOffset);
      settlementOffset = open.length < 100 ? 0 : settlementOffset + open.length;
      for (const charge of open) {
        const receiver = await client.readContract({
          address: factory,
          abi: crosschainPaymentFactoryAbi,
          functionName: "receiverOf",
          args: [charge.registryId as Hex, charge.reference as Hex],
        });
        const balance = await client.readContract({ address: arc.usdc, abi: erc20Abi, functionName: "balanceOf", args: [receiver] });
        if (balance === 0n) continue;
        console.log("[indexer] settling funded crosschain receiver", { chargeId: charge.id, receiver, amount: balance.toString() });
        const hash = await wallet.writeContract({
          address: factory,
          abi: crosschainPaymentFactoryAbi,
          functionName: "settle",
          args: [charge.registryId as Hex, charge.reference as Hex],
        });
        await client.waitForTransactionReceipt({ hash });
      }
    } catch (error) {
      console.error("[indexer] receiver settlement pass failed", error);
    } finally {
      settling = false;
    }
  };
  await settleFundedReceivers();
  setInterval(settleFundedReceivers, 2_000);
} else if (factory) {
  console.warn("[indexer] crosschain receiver settlement disabled: RELAYER_PRIVATE_KEY is not set");
}
