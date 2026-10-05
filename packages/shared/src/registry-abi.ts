/** ABI for contracts/src/StoreRegistry.sol. Keep in sync when the contract changes. */
export const storeRegistryAbi = [
  {
    type: "function",
    name: "admin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "pendingAdmin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "registrars",
    stateMutability: "view",
    inputs: [{ name: "registrar", type: "address" }],
    outputs: [{ name: "allowed", type: "bool" }],
  },
  {
    type: "function",
    name: "setRegistrar",
    stateMutability: "nonpayable",
    inputs: [
      { name: "registrar", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "transferAdmin",
    stateMutability: "nonpayable",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptAdmin",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
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
    name: "transferOwnership",
    stateMutability: "nonpayable",
    inputs: [
      { name: "storeId", type: "bytes32" },
      { name: "newOwner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptOwnership",
    stateMutability: "nonpayable",
    inputs: [{ name: "storeId", type: "bytes32" }],
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
    type: "function",
    name: "paidCharges",
    stateMutability: "view",
    inputs: [
      { name: "storeId", type: "bytes32" },
      { name: "chargeRef", type: "bytes32" },
    ],
    outputs: [{ name: "paid", type: "bool" }],
  },
  {
    type: "event",
    name: "RegistrarUpdated",
    inputs: [
      { name: "registrar", type: "address", indexed: true },
      { name: "allowed", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StoreRegistered",
    inputs: [
      { name: "storeId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "payout", type: "address", indexed: false },
    ],
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
