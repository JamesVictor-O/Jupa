import { describe, expect, it } from "vitest";
import { resolveArcNetwork } from "./arc";

describe("resolveArcNetwork", () => {
  it("uses an explicit network", () => {
    expect(resolveArcNetwork("mainnet", "development")).toBe("mainnet");
    expect(resolveArcNetwork("testnet", "production")).toBe("testnet");
  });

  it("defaults production to mainnet and development to testnet", () => {
    expect(resolveArcNetwork(undefined, "production")).toBe("mainnet");
    expect(resolveArcNetwork(undefined, "development")).toBe("testnet");
  });

  it("rejects invalid network names", () => {
    expect(() => resolveArcNetwork("sepolia", "production")).toThrow("Invalid Arc network");
  });
});
