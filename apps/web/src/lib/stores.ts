import "server-only";
import { getAddress, isAddress, zeroAddress, type Address, type Hex } from "viem";
import { eq, stores, type Store } from "@jupa/db";
import { db } from "./db";
import { RegistryNotConfigured, registerStoreOnchain } from "./registry";

const LOGO_MAX_BYTES = 150_000;
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export type StoreInput = { name: string; logo: string | null; payout: Address };

/** Validate the setup form. Returns the clean input, or one kind sentence per bad field. */
export function parseStoreInput(body: unknown): { ok: true; value: StoreInput } | { ok: false; errors: Record<string, string> } {
  const b = (body ?? {}) as { name?: unknown; logo?: unknown; payoutAddress?: unknown };
  const errors: Record<string, string> = {};

  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) errors.name = "Give your store a name.";
  else if (name.length > 60) errors.name = "Keep the name under 60 characters.";

  let logo: string | null = null;
  if (typeof b.logo === "string" && b.logo) {
    if (!LOGO_DATA_URL.test(b.logo)) errors.logo = "Use a PNG, JPG or WebP image.";
    else if (b.logo.length * 0.75 > LOGO_MAX_BYTES) errors.logo = "That logo is too large. Try a smaller image.";
    else logo = b.logo;
  }

  const raw = typeof b.payoutAddress === "string" ? b.payoutAddress.trim() : "";
  let payout: Address | null = null;
  if (!isAddress(raw, { strict: false })) errors.payoutAddress = "That isn't a valid address. It starts with 0x and has 42 characters.";
  else if (getAddress(raw) === zeroAddress) errors.payoutAddress = "That address can't receive payments.";
  else payout = getAddress(raw);

  if (Object.keys(errors).length || !payout) return { ok: false, errors };
  return { ok: true, value: { name, logo, payout } };
}

/** Register (or retry registering) a store onchain and record the outcome. */
export async function registerStore(store: Store): Promise<Store> {
  try {
    const hash = await registerStoreOnchain(store.registryId as Hex, store.payoutAddress as Address);
    const [updated] = await db
      .update(stores)
      .set({ registryStatus: "registered", registryTxHash: hash, registryError: null })
      .where(eq(stores.id, store.id))
      .returning();
    return updated;
  } catch (err) {
    // Not configured yet: leave it pending so it can be registered once the relayer is set up.
    const pending = err instanceof RegistryNotConfigured;
    console.error("[registry]", pending ? (err as Error).message : err);
    const [updated] = await db
      .update(stores)
      .set({
        registryStatus: pending ? "pending" : "failed",
        registryError: pending ? "Onchain registration isn't set up on this server yet." : "Registration didn't go through.",
      })
      .where(eq(stores.id, store.id))
      .returning();
    return updated;
  }
}

/** What the client needs about a store. Never includes merchant identity. */
export function publicStore(s: Store) {
  return {
    id: s.id,
    name: s.name,
    logoUrl: s.logoUrl,
    payoutAddress: s.payoutAddress,
    registryStatus: s.registryStatus,
    registryTxHash: s.registryTxHash,
    registryError: s.registryError,
  };
}
export type PublicStore = ReturnType<typeof publicStore>;
