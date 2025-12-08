export const BRIDGE_CONFIG = {
  943: {
    id: 943,
    name: "PulseChain Testnet",
    bridge: "0x47D85e748519CAa2F5f217782eB5A291A53A359a",
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
  84532: {
    id: 84532,
    name: "Base Sepolia",
    bridge: "0x49f6BF1E6597d8d1FCDC74FdBBE0AAb0369E0146",
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
};