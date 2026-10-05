import { arc as arcMainnet, arcTestnet } from "viem/chains";
import type { Address, Chain } from "viem";

export type ArcNetwork = "testnet" | "mainnet";

export interface ArcConfig {
  network: ArcNetwork;
  chain: Chain;
  /** USDC ERC-20 view (6 decimals). Use this for every balance, transfer and display. */
  usdc: Address;
  /** CCTP domain id for Arc. */
  cctpDomain: number;
  /** CCTP contracts on Arc (destination side of a Base -> Arc payment). */
  cctp: { tokenMessenger: Address; messageTransmitter: Address };
  explorerUrl: string;
}

// Values from docs.arc.io (RPC endpoints, contract addresses); chain ids and USDC decimals
// checked against the live RPCs on 2026-10-05.

const testnet: ArcConfig = {
  network: "testnet",
  chain: arcTestnet,
  usdc: "0x3600000000000000000000000000000000000000",
  cctpDomain: 26,
  cctp: {
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
  explorerUrl: "https://explorer.testnet.arc.io",
};

const mainnet: ArcConfig = {
  network: "mainnet",
  chain: arcMainnet, // chain id 5042, rpc.mainnet.arc.io
  usdc: "0x3600000000000000000000000000000000000000",
  cctpDomain: 26,
  cctp: {
    tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
    messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
  },
  explorerUrl: "https://explorer.arc.io",
};

export function getArcConfig(network: ArcNetwork = "testnet"): ArcConfig {
  return network === "mainnet" ? mainnet : testnet;
}

export function arcTxUrl(config: ArcConfig, hash: string) {
  return `${config.explorerUrl}/tx/${hash}`;
}
