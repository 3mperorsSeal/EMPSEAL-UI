export const BRIDGE_CONFIG = {
  943: {
    id: 943,
    name: "PulseChain Testnet",
    bridge: "0x47D85e748519CAa2F5f217782eB5A291A53A359a",
    abiType: "collateral",
    usdcAddress: "0xa0179a4Aa2818ff63Ee6e40b5C27A33BD59e4815",
    wrappedGasTokenAddress: "0xBDc1fCaC4c4615b4FbBE8C401BEd6e29D900fDB0",
    tokens: [
      {
        address: "0xc16131616B78346eb58bfF11Fafc9895a7180d93",
        symbol: "ROB",
        name: "ROB Token",
      },
      // Add more tokens for PulseChain Testnet here
    ],
    explorer: "https://scan.v4.testnet.pulsechain.com",
    rpcUrl: "https://rpc.v4.testnet.pulsechain.com",
  },
  // --- PulseChain Mainnet ---
  369: {
    id: "369",
    name: "PulseChain Mainnet",
    bridge: "0x12b42e964294dCF79f44E11FB4A9c23698f475d4",
    abiType: "collateral",
    usdcAddress: "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07",
    wrappedGasTokenAddress: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    tokens: [
      {
        address: "0x40b49a9e5B8E3CC137E9CA57A5F4382D1B3dF6FE",
        symbol: "COCK",
        name: "The rise of Cock",
      },
    ],
    explorer: "https://oldscan.gopulse.com/#",
    rpcUrl: "https://369.rpc.vialabs.io/",
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    bridge: "0x49f6BF1E6597d8d1FCDC74FdBBE0AAb0369E0146",
    abiType: "synthetic",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    wrappedGasTokenAddress: "0x32D9c1DA01F221aa0eab4A0771Aaa8E2344ECd35",
    tokens: [
      {
        address: "0x49f6BF1E6597d8d1FCDC74FdBBE0AAb0369E0146",
        symbol: "sROB",
        name: "Synthetic ROB",
      },
      // Add more tokens for Base Sepolia here
    ],
    explorer: "https://sepolia.basescan.org",
    rpcUrl: "https://sepolia.base.org",
  },
  // --- Base Mainnet ---
  8453: {
    id: "8453",
    name: "Base Mainnet",
    bridge: "0xAB6A40DdCf0b81eC64c6d7a5b49306D7D7b19210",
    abiType: "synthetic",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    wrappedGasTokenAddress: "0x4200000000000000000000000000000000000006",
    tokens: [
      {
        address: "0xAB6A40DdCf0b81eC64c6d7a5b49306D7D7b19210",
        symbol: "De-cock",
        name: "De-COCK",
      },
    ],
    explorer: "https://basescan.org/",
    rpcUrl: "https://8453.rpc.vialabs.io/",
  },
};
