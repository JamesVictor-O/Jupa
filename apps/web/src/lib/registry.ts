import "server-only";
import { createPublicClient, createWalletClient, http, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { storeRegistryAbi } from "@jupa/shared";
import { arc } from "./env";

/**
 * Jupa's relayer pays the gas (USDC on Arc) to register stores, so merchants need no wallet
 * funds to sign up. The merchant's payout address becomes the store owner, so after this
 * transaction only the merchant can change where their money goes.
 */
export class RegistryNotConfigured extends Error {
  constructor(missing: string) {
    super(`${missing} is not set`);
  }
}

function config() {
  const registry = process.env.STORE_REGISTRY_ADDRESS;
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!registry || !isAddress(registry)) throw new RegistryNotConfigured("STORE_REGISTRY_ADDRESS");
  if (!key) throw new RegistryNotConfigured("RELAYER_PRIVATE_KEY");
  const transport = http(process.env.ARC_RPC_URL || arc.chain.rpcUrls.default.http[0]);
  return {
    registry: registry as Address,
    publicClient: createPublicClient({ chain: arc.chain, transport }),
    walletClient: createWalletClient({ chain: arc.chain, transport, account: privateKeyToAccount(key as Hex) }),
  };
}

export function registryConfigured() {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

/** Register a store onchain and wait for the receipt (Arc finalizes in about a block). */
export async function registerStoreOnchain(registryId: Hex, payout: Address): Promise<Hex> {
  const { registry, publicClient, walletClient } = config();
  const { request } = await publicClient.simulateContract({
    address: registry,
    abi: storeRegistryAbi,
    functionName: "register",
    args: [registryId, payout, payout],
    account: walletClient.account,
  });
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") throw new Error(`register() reverted in ${hash}`);
  return hash;
}

/** The payout address the registry holds for a store: the source of truth for checkout. */
export async function payoutFromRegistry(registryId: Hex): Promise<Address> {
  const { registry, publicClient } = config();
  return publicClient.readContract({ address: registry, abi: storeRegistryAbi, functionName: "payoutOf", args: [registryId] });
}
