import { getArcConfig, resolveArcNetwork } from "@jupa/shared";

export const arcNetwork = resolveArcNetwork(process.env.NEXT_PUBLIC_ARC_NETWORK, process.env.NODE_ENV);
export const arc = getArcConfig(arcNetwork);
