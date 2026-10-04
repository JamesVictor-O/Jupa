import "server-only";
import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";

let client: ReturnType<typeof initiateUserControlledWalletsClient> | null = null;

/** Server-side Circle client. The API key never leaves the server. */
export function circle() {
  if (!client) {
    const apiKey = process.env.CIRCLE_API_KEY;
    if (!apiKey) throw new CircleNotConfigured();
    client = initiateUserControlledWalletsClient({ apiKey });
  }
  return client;
}

export class CircleNotConfigured extends Error {
  constructor() {
    super("CIRCLE_API_KEY is not set");
  }
}

/** Circle's Arc blockchain id for the active network. */
export function circleArcChain() {
  return process.env.NEXT_PUBLIC_ARC_NETWORK === "mainnet" ? "ARC" : "ARC-TESTNET";
}

/** Circle API errors carry a numeric code on response.data; pull it out if present. */
export function circleErrorCode(err: unknown): number | undefined {
  const e = err as { response?: { data?: { code?: number } }; code?: number };
  return e?.response?.data?.code ?? (typeof e?.code === "number" ? e.code : undefined);
}

/**
 * Verify a Circle userToken by asking Circle who it belongs to.
 * Returns the Circle user id, or null if the token is invalid or expired.
 */
export async function verifyUserToken(userToken: string): Promise<string | null> {
  try {
    const res = await circle().getUserStatus({ userToken });
    return res.data?.id ?? null;
  } catch (err) {
    if (err instanceof CircleNotConfigured) throw err;
    return null;
  }
}
