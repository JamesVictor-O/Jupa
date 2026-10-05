import "server-only";
import { crosschainPaymentFactoryAbi, getArcConfig, type ArcNetwork } from "@jupa/shared";
import { createPublicClient, http, isAddress, type Address, type Hex } from "viem";

export async function crosschainReceiver(storeId: Hex, chargeRef: Hex): Promise<Address | null> {
  const factory = process.env.CROSSCHAIN_PAYMENT_FACTORY_ADDRESS;
  if (!factory || !isAddress(factory)) return null;
  const arc = getArcConfig((process.env.NEXT_PUBLIC_ARC_NETWORK as ArcNetwork | undefined) ?? "testnet");
  const client = createPublicClient({
    chain: arc.chain,
    transport: http(process.env.ARC_RPC_URL ?? arc.chain.rpcUrls.default.http[0]),
  });
  try {
    return await client.readContract({
      address: factory,
      abi: crosschainPaymentFactoryAbi,
      functionName: "receiverOf",
      args: [storeId, chargeRef],
    });
  } catch (error) {
    console.error("[crosschain] receiver lookup failed", error instanceof Error ? error.message : error);
    return null;
  }
}
