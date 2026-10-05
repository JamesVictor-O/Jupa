/** ABI for contracts/src/CrosschainPaymentFactory.sol. */
export const crosschainPaymentFactoryAbi = [
  {
    type: "function",
    name: "receiverOf",
    stateMutability: "view",
    inputs: [
      { name: "storeId", type: "bytes32" },
      { name: "chargeRef", type: "bytes32" },
    ],
    outputs: [{ name: "receiver", type: "address" }],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "storeId", type: "bytes32" },
      { name: "chargeRef", type: "bytes32" },
    ],
    outputs: [
      { name: "receiver", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "CrosschainChargePaid",
    inputs: [
      { name: "storeId", type: "bytes32", indexed: true },
      { name: "chargeRef", type: "bytes32", indexed: true },
      { name: "receiver", type: "address", indexed: true },
      { name: "payout", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
