/** ABI for contracts/src/StoreRegistry.sol. Keep in sync when the contract changes. */
export const storeRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "storeId", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "payout", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPayout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "storeId", type: "bytes32" },
      { name: "payout", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "payoutOf",
    stateMutability: "view",
    inputs: [{ name: "storeId", type: "bytes32" }],
    outputs: [{ name: "payout", type: "address" }],
  },
  {
    type: "function",
    name: "pay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "storeId", type: "bytes32" },
      { name: "chargeRef", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "ChargePaid",
    inputs: [
      { name: "storeId", type: "bytes32", indexed: true },
      { name: "chargeRef", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "payout", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
