/** Charge lifecycle from the PRD: Created -> Paying -> Paid, with Expired / Needs attention side paths. */
export const CHARGE_STATUSES = ["created", "paying", "paid", "expired", "needs_attention"] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const DEFAULT_CHARGE_TTL_MS = 10 * 60 * 1000;

export type SourceChain = "arc" | "base" | "ethereum" | "arbitrum" | "solana";

const transitions: Record<ChargeStatus, ChargeStatus[]> = {
  created: ["paying", "paid", "expired"],
  paying: ["paid", "needs_attention"],
  needs_attention: ["paid"],
  // A payment that lands after expiry still credits the charge (flagged late).
  expired: ["paid"],
  paid: [],
};

export function canTransition(from: ChargeStatus, to: ChargeStatus) {
  return transitions[from].includes(to);
}

export interface PaymentFlags {
  late: boolean;
  overpaid: boolean;
}

/**
 * Settlement rule: Paid only when a final Arc transfer of at least the charged amount
 * reached the registered payout address. Underpayment does not settle.
 */
export function evaluatePayment(
  charged: bigint,
  received: bigint,
  finalizedAt: Date,
  expiresAt: Date,
): { settles: boolean; flags: PaymentFlags } {
  return {
    settles: received >= charged,
    flags: { late: finalizedAt > expiresAt, overpaid: received > charged },
  };
}
