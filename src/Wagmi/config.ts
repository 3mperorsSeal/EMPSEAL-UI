import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  phantomWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http, createConfig } from 'wagmi';
import { pulsechain, bsc,arbitrum, avalanche, polygon, sei, mainnet, base, polygonZkEvm, moonriver, fantom, aurora, optimism, cronos, gnosis, linea, scroll, blast, fuse, moonbeam, celo, boba, mantle,manta, zetachain,telos, kava, zksync, arbitrumNova, tron,metis, bahamut, mode, rootstock, merlin, zkLinkNova, taiko, fraxtal, gravity,morph,sonic } from 'wagmi/chains';

import { defineChain } from 'viem';

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

// Wallet configuration
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Suggested',
      wallets: [
        metaMaskWallet,
        phantomWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: 'RainbowKit App', projectId: 'YOUR_PROJECT_ID' },
);

export const config = getDefaultConfig({
  appName: 'Emplseal',
  projectId: 'YOUR_PROJECT_ID',
  chains: [pulsechain,ethw, mainnet, bsc, arbitrum, avalanche, polygon, optimism, cronos, base, sei, polygonZkEvm, moonriver, fantom, aurora, gnosis, linea, scroll, blast, fuse, moonbeam, celo, boba, mantle,manta, zetachain,telos, kava, zksync, arbitrumNova, tron,metis, bahamut, mode, rootstock, merlin, zkLinkNova, taiko, fraxtal, gravity,morph,sonic],
  ssr: true, 
  connectors,
});
