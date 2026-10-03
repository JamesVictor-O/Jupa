import { getArcConfig, type ArcNetwork } from "@jupa/shared";

export const arc = getArcConfig((process.env.NEXT_PUBLIC_ARC_NETWORK as ArcNetwork) ?? "testnet");
