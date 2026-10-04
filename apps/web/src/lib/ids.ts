import { randomBytes } from "node:crypto";
import { keccak256, stringToHex } from "viem";

// No look-alike characters (0/O, 1/l/I), so IDs survive being read aloud or retyped.
const ALPHABET = "23456789abcdefghijkmnopqrstuvwxyz";

export function publicId(length = 10) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** The bytes32 key a store uses in StoreRegistry. */
export function registryIdFor(storeId: string) {
  return keccak256(stringToHex(storeId));
}
