/** USDC uses 6 decimals in its ERC-20 view on every chain Jupa touches. */
export const USDC_DECIMALS = 6;

/** Parse an exact onchain USDC amount with up to 6 fractional digits. */
export function parseUsdc(input: string): bigint {
  const trimmed = input.trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(trimmed);
  if (!match) throw new Error(`Invalid USDC amount: ${input}`);
  return BigInt(match[1]) * 1_000_000n + BigInt((match[2] ?? "").padEnd(6, "0"));
}

/**
 * Parse a typed amount ("12.5", "0.021", "$1,234.50") into USDC base units.
 * Accepts USDC's full 6-decimal precision; extra precision is rejected, never rounded.
 */
export function parseUsd(input: string): bigint {
  const typed = input.trim().replace(/^\$/, "").replace(/,/g, "");
  // Forgive phone-keypad habits (".5", "05.00") before the strict onchain parser.
  const normalized = typed.replace(/^\./, "0.").replace(/^0+(?=\d)/, "");
  return parseUsdc(normalized);
}

/**
 * Format USDC base units for display: always at least cents ("$12.50"), and every
 * significant digit beyond that ("$0.021"), so a label never rounds what is charged.
 */
export function formatUsd(amount: bigint): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const whole = abs / 1_000_000n;
  const fraction = (abs % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${negative ? "-" : ""}$${whole.toLocaleString("en-US")}.${fraction}`;
}
