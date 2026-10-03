import { bigint, boolean, index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { CHARGE_STATUSES } from "@jupa/shared";

export const chargeStatus = pgEnum("charge_status", CHARGE_STATUSES);
export const sourceChain = pgEnum("source_chain", ["arc", "base", "ethereum", "arbitrum", "solana"]);

/** Mirror of the onchain registry plus offchain profile. payoutAddress is a cache; the registry is the truth. */
export const stores = pgTable("stores", {
  id: text("id").primaryKey(), // bytes32 hex, matches registry storeId
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  ownerEmail: text("owner_email").notNull(),
  payoutAddress: text("payout_address").notNull(),
  registryTxHash: text("registry_tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  sourceChain: sourceChain("source_chain").notNull(),
  sourceTxHash: text("source_tx_hash"),
  arcTxHash: text("arc_tx_hash").unique(),
  amountReceived: bigint("amount_received", { mode: "bigint" }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});

export type Store = typeof stores.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type Payment = typeof payments.$inferSelect;
