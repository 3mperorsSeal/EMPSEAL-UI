import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { defineChain } from 'viem';

// Define custom chains with logo support
const pulsechain = {
  id: 369,
  name: 'PulseChain',
  network: 'pulsechain',
  nativeCurrency: {
    name: 'Pulse',
    symbol: 'PLS',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.pulsechain.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PulseScan',
      url: 'https://oldscan.gopulse.com/#/',
    },
  },
  iconUrl: 'src/assets/chains/pulsechain.svg',
  iconBackground: '#000000',
};

const sonic = {
  id: 146,
  name: 'Sonic',
  network: 'sonic',
  nativeCurrency: {
    name: 'SONIC',
    symbol: 'S',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SonicScan',
      url: 'https://sonicscan.org',
    },
  },
  iconUrl: 'src/assets/chains/sonic.svg',
  iconBackground: '#111',
};

const ethw = {
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
  iconUrl: 'src/assets/chains/ethereumpow.svg',
  iconBackground: '#222',
};

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

export const config = getDefaultConfig({
  appName: 'Empseal Swap',
  projectId: 'YOUR_PROJECT_ID',
  chains: [pulsechain, sonic, ethw, base],
  ssr: true,
});
