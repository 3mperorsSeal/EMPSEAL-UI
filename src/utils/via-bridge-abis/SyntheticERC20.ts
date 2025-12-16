const SYNTHETIC_BRIDGE_ABI = [
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_destChainId",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "bridge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default SYNTHETIC_BRIDGE_ABI;
