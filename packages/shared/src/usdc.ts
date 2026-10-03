/** USDC uses 6 decimals in its ERC-20 view on every chain Jupa touches. */
export const USDC_DECIMALS = 6;

/** Parse a cashier-typed USD string ("12.5") into USDC base units, rejecting sub-cent input. */
export function parseUsd(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error(`Invalid amount: ${input}`);
  const [whole, frac = ""] = trimmed.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(frac.padEnd(6, "0"));
}

/** Format USDC base units as "$12.50". */
export function formatUsd(amount: bigint): string {
  const cents = amount / 10_000n;
  const dollars = cents / 100n;
  const rem = (cents % 100n).toString().padStart(2, "0");
  return `$${dollars.toLocaleString("en-US")}.${rem}`;
}
