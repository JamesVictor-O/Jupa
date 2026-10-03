/**
 * Arc payment watcher (F7). Marks a charge Paid only on a final Arc transfer to the
 * registered payout address that references that charge.
 *
 * Arc has deterministic finality, so an included block is final.
 * Subscribes via watchContractEvent and falls back to polling (viem `poll`).
 */
import { createPublicClient, http, type Address } from "viem";
import { getArcConfig, storeRegistryAbi, type ArcNetwork } from "@jupa/shared";

const arc = getArcConfig((process.env.ARC_NETWORK as ArcNetwork) ?? "testnet");
const registry = process.env.STORE_REGISTRY_ADDRESS as Address | undefined;
if (!registry) throw new Error("STORE_REGISTRY_ADDRESS is not set");

const client = createPublicClient({
  chain: arc.chain,
  transport: http(process.env.ARC_RPC_URL ?? arc.chain.rpcUrls.default.http[0]),
});

console.log(`[indexer] watching ${registry} on Arc ${arc.network}`);

client.watchContractEvent({
  address: registry,
  abi: storeRegistryAbi,
  eventName: "ChargePaid",
  poll: true,
  pollingInterval: 1_000,
  onLogs: async (logs) => {
    for (const log of logs) {
      const { storeId, chargeRef, payout, amount } = log.args;
      console.log("[indexer] ChargePaid", { storeId, chargeRef, payout, amount, tx: log.transactionHash });
      // TODO(F7): look up charge by reference, verify payout === registry payout for storeId,
      // apply evaluatePayment(), write payment row, transition status, push update to till.
    }
  },
  onError: (err) => console.error("[indexer] watch error", err),
});

// TODO(F6): cross-chain path. Watch USDC Transfer logs into payout addresses for CCTP
// mints, matched by per-charge amount tag or forwarded hook data (PRD open question).
