import { arcTestnet } from "viem/chains";
import type { Address, Chain } from "viem";

export type ArcNetwork = "testnet" | "mainnet";

export interface ArcConfig {
  network: ArcNetwork;
  chain: Chain;
  /** USDC ERC-20 view (6 decimals). Use this for every balance, transfer and display. */
  usdc: Address;
  /** CCTP domain id for Arc. */
  cctpDomain: number;
  explorerUrl: string;
}

const testnet: ArcConfig = {
  network: "testnet",
  chain: arcTestnet,
  usdc: "0x3600000000000000000000000000000000000000",
  cctpDomain: 26,
  explorerUrl: "https://testnet.arcscan.app",
};

/**
 * Arc mainnet values are not confirmed yet (PRD open question, day 1-2).
 * Fill these in from https://docs.arc.network before the live sale.
 */
const mainnet: ArcConfig | null = null;

export function getArcConfig(network: ArcNetwork = "testnet"): ArcConfig {
  if (network === "mainnet") {
    if (!mainnet) throw new Error("Arc mainnet config is not set yet: see packages/shared/src/arc.ts");
    return mainnet;
  }
  return testnet;
}

export function arcTxUrl(config: ArcConfig, hash: string) {
  return `${config.explorerUrl}/tx/${hash}`;
}
