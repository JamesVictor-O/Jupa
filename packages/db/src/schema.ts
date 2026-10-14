import { bigint, boolean, index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { CHARGE_STATUSES } from "@jupa/shared";

export const chargeStatus = pgEnum("charge_status", CHARGE_STATUSES);
export const registryStatus = pgEnum("registry_status", ["pending", "registered", "failed"]);
export const sourceChain = pgEnum("source_chain", ["arc", "base", "ethereum", "arbitrum", "solana"]);
export const bridgeAttemptStatus = pgEnum("bridge_attempt_status", ["pending", "success", "error"]);

/**
 * A merchant account. Identity is the Circle user id, verified server-side from a Circle
 * userToken. Email is what they typed at sign-in, kept for display only (Circle doesn't return it).
 */
export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  circleUserId: text("circle_user_id").notNull().unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Opaque session cookies; only the SHA-256 of the token is stored. */
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  merchantId: text("merchant_id")
    .notNull()
    .references(() => merchants.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Mirror of the onchain registry plus offchain profile. payoutAddress is a cache; the registry is the truth. */
export const stores = pgTable("stores", {
  id: text("id").primaryKey(), // short public id used in URLs and QR codes
  /** keccak256 of the public id; the key in StoreRegistry. */
  registryId: text("registry_id").notNull().unique(),
  merchantId: text("merchant_id")
    .notNull()
    .unique() // one store per merchant in v1
    .references(() => merchants.id),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  payoutAddress: text("payout_address").notNull(),
  registryStatus: registryStatus("registry_status").notNull().default("pending"),
  registryTxHash: text("registry_tx_hash"),
  registryError: text("registry_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Where a charge came from: the merchant's counter screen, or a customer on the public payment page. */
export const chargeOrigin = pgEnum("charge_origin", ["counter", "customer"]);

export const charges = pgTable(
  "charges",
  {
    id: text("id").primaryKey(), // random, single-use
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    /** Unique reference carried with the payment, used by the indexer to match. */
    reference: text("reference").notNull().unique(),
    amount: bigint("amount", { mode: "bigint" }).notNull(), // USDC, 6 decimals
    status: chargeStatus("status").notNull().default("created"),
    origin: chargeOrigin("origin").notNull().default("counter"),
    late: boolean("late").notNull().default(false),
    overpaid: boolean("overpaid").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("charges_store_created_idx").on(t.storeId, t.createdAt)],
);

/** Only what the receipt needs: no customer names or emails. */
export const payments = pgTable("payments", {
  chargeId: text("charge_id")
    .primaryKey()
    .references(() => charges.id),
  /** Null until a trusted source-chain observer correlates a cross-chain payment. */
  sourceChain: sourceChain("source_chain"),
  sourceTxHash: text("source_tx_hash"),
  arcTxHash: text("arc_tx_hash").unique(),
  amountReceived: bigint("amount_received", { mode: "bigint" }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});

/** Deduplicates Arc logs so historical replay cannot credit the same settlement twice. */
export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(), // `${transactionHash}:${logIndex}`
  chargeId: text("charge_id")
    .notNull()
    .references(() => charges.id, { onDelete: "cascade" }),
  txHash: text("tx_hash").notNull(),
  logIndex: bigint("log_index", { mode: "bigint" }).notNull(),
  amount: bigint("amount", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Browser-reported bridge evidence used for recovery and reconciliation. None of
 * these fields prove payment; only the final Arc event indexed into `payments`
 * settles a charge.
 */
export const bridgeAttempts = pgTable("bridge_attempts", {
  chargeId: text("charge_id")
    .primaryKey()
    .references(() => charges.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  sourceChain: text("source_chain").notNull(),
  sourceWallet: text("source_wallet").notNull(),
  burnTxHash: text("burn_tx_hash"),
  mintTxHash: text("mint_tx_hash"),
  status: bridgeAttemptStatus("status").notNull(),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  arcSettledAt: timestamp("arc_settled_at", { withTimezone: true }),
});

export type Merchant = typeof merchants.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type BridgeAttempt = typeof bridgeAttempts.$inferSelect;
