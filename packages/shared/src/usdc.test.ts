import { describe, expect, it } from "vitest";
import { formatUsd, parseUsd } from "./usdc";
import { canTransition, evaluatePayment } from "./charge";

describe("usdc amounts", () => {
  it("parses and formats", () => {
    expect(parseUsd("12.5")).toBe(12_500_000n);
    expect(formatUsd(1_234_500_000n)).toBe("$1,234.50");
  });
  it("rejects sub-cent and junk input", () => {
    expect(() => parseUsd("1.234")).toThrow();
    expect(() => parseUsd("abc")).toThrow();
  });
});

describe("charge rules", () => {
  it("credits late payments and flags them", () => {
    expect(canTransition("expired", "paid")).toBe(true);
    const r = evaluatePayment(5n, 6n, new Date(2), new Date(1));
    expect(r).toEqual({ settles: true, flags: { late: true, overpaid: true } });
  });
  it("does not settle underpayment", () => {
    expect(evaluatePayment(5n, 4n, new Date(1), new Date(2)).settles).toBe(false);
  });
});
