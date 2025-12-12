import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { pulsechainV4, baseSepolia, pulsechain, base } from "wagmi/chains";

// Wallet configuration for via-bridge
const viaBridgeConnectors = connectorsForWallets(
  [
    {
      groupName: "Suggested",
      wallets: [
        metaMaskWallet,
        phantomWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: "RainbowKit Via Bridge", projectId: "YOUR_PROJECT_ID" }
);

export const viaBridgeConfig = getDefaultConfig({
  appName: "Emplseal Via Bridge",
  projectId: "YOUR_PROJECT_ID",
  chains: [baseSepolia, pulsechainV4, pulsechain, base],
  ssr: true,
  connectors: viaBridgeConnectors,
});
