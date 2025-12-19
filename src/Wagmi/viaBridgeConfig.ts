import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { pulsechain, base, arbitrum } from "wagmi/chains";

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
  chains: [pulsechain, base, arbitrum],
  ssr: true,
  connectors: viaBridgeConnectors,
});
