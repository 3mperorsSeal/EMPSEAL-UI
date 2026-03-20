import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http } from 'wagmi';
import { pulsechain, sonic, rootstock} from 'wagmi/chains';
import { defineChain, fallback } from 'viem';

export const ethw = defineChain({
  id: 10001,
  name: 'EthereumPoW',
  nativeCurrency: {
    name: 'EthereumPoW',
    symbol: 'ETHW',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.ethereumpow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/ethereum-pow',
    },
  },
} as const);

export const base = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: {
    name: "Base Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://base.drpc.org"],
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://basescan.org",
    },
  },
} as const);

export const bsc = defineChain({
  id: 56,
  name: "BSC",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://bsc-rpc.publicnode.com"],
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: "https://bscscan.com",
    },
  },
} as const);

export const sei = defineChain({
  id: 1329,
  name: "Sei Network",
  nativeCurrency: {
    name: "Sei",
    symbol: "SEI",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sei.api.pocket.network"],
      // https://evm-rpc.sei-apis.com
      // https://sei.drpc.org
      // https://sei-evm-rpc.stakeme.pro
      // https://sei-evm-rpc.publicnode.com
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  blockExplorers: {
    default: {
      name: "seitrace",
      url: "https://seitrace.com/",
    },
  },
} as const);

export const berachain = defineChain({
  id: 80094,
  name: "Berachain",
  nativeCurrency: {
    name: "Bera",
    symbol: "BERA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://berachain.drpc.org"],
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
  blockExplorers: {
    default: {
      name: "Berascan",
      url: "https://berascan.org",
    },
  },
} as const);

// Wallet configuration for swap
const swapConnectors = connectorsForWallets(
  [
    {
      groupName: 'Suggested',
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: 'RainbowKit Swap', projectId: 'YOUR_PROJECT_ID' },
);

const fallbackTransport = (urls: string[]) =>
  fallback(
    urls.map((url) =>
      http(url, {
        timeout: 30_000,
        retryCount: 1,
        retryDelay: 2500,
      }),
    ),
    { rank: false },
  );

export const config = getDefaultConfig({
  appName: 'Empseal Swap',
  projectId: 'YOUR_PROJECT_ID',
  // Note: ethw and sonic are temporarily disabled (not up to date)
  // To re-enable, change to: chains: [pulsechain, ethw, sonic],
  chains: [pulsechain, sonic, base, sei, berachain, rootstock, ethw, bsc],
  transports: {
    [pulsechain.id]: http(),
    [sonic.id]: http(),
    [base.id]: fallbackTransport([
      "https://base.drpc.org",
      "https://base-rpc.publicnode.com",
    ]),
    [sei.id]: fallbackTransport([
      "https://evm-rpc.sei-apis.com",
      "https://sei.api.pocket.network",
      "https://sei.drpc.org",
      "https://sei-evm-rpc.publicnode.com",
    ]),
    [berachain.id]: http(),
    [rootstock.id]: http(),
    [ethw.id]: http(),
    [bsc.id]: http(),
  },
  ssr: true,
  connectors: swapConnectors,
});
