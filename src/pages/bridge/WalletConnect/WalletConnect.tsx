// "use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import React, { useEffect } from "react";
import ChainImg from "../../../assets/images/select_chain.svg";
import { useAccount } from "wagmi";

export default function WalletConnect({
  icon,
  onChainChange,
}: {
  icon?: React.ReactNode;
  onChainChange?: (iconUrl: string | undefined, chainName: string | undefined) => void;
}) {
  const { address, isConnected } = useAccount();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        // Notify parent about chain changes
        useEffect(() => {
          if (onChainChange) {
            onChainChange(chain?.iconUrl, chain?.name);
          }
        }, [chain, onChainChange]);

        if (!ready) {
          return (
            <div
              aria-hidden="true"
              style={{
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          );
        }

        if (!connected) {
          return (
            <button
              className="flex items-center justify-center bg-[#FF9900] text-black text-sm py-2 px-6 rounded-md font-normal w-full font-orbitron"
              onClick={openConnectModal}
              type="button"
            >
              <span className="ps-3">Connect</span>
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              className="bg-[#FF494A] px-4 py-2 rounded text-white flex items-center gap-2 font-orbitron"
              onClick={openChainModal}
              type="button"
            >
              Wrong Network
            </button>
          );
        }

        return (
          <div className="flex flex-col justify-center items-center gap-4">
            <button
              className="px-4 xl:ps-8 xl:pe-4 py-2 text-white rounded-full shadow-sm cursor-pointer bg-secondary font-normal flex items-center font-orbitron justify-center"
              onClick={openAccountModal}
              type="button"
            >
              <span className="ps-3">Disconnect</span>
            </button>
            <button
              className="px-4 py-2 text-white bg-primary rounded-full font-normal flex items-center font-orbitron justify-center"
              onClick={openChainModal}
              type="button"
            >
             <span className="ps-3">Select Chain</span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
