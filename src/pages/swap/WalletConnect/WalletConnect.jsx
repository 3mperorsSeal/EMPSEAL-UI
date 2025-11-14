import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import ChainPopup from "./Chainpopup";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChains,
} from "wagmi";
import AddressCard from "./AddressCard";
// import Dis from "../../../assets/images/dis.png";
// import Copy from "../../../assets/images/copy.png";
// import Sbg from "../../../assets/images/sbg.png";

export default function WalletConnect({ onChainChange }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();
  const availableChains = useChains();
  const { connect, connectors } = useConnect();

  const [showPopup, setShowPopup] = useState(false);
  const [showChainPopup, setShowChainPopup] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  useEffect(() => {
    if (address && !sessionStorage.getItem("walletReloaded")) {
      sessionStorage.setItem("walletReloaded", "true");
      window.location.reload();
    }
  }, [address]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account && chain;

        useEffect(() => {
          if (onChainChange) onChainChange(chain?.iconUrl, chain?.name);
        }, [chain, onChainChange]);

        useEffect(() => {
          if (chain?.unsupported && chains?.length > 0) {
            switchChain({ chainId: chains[0].id });
          }
        }, [chain, chains, switchChain]);

        if (!ready) return null;
        if (!connected) {
          return (
            <>
              <button
                className="wallet-bg-bridge1 text-[#FF9900] text-center"
                onClick={() => setShowConnectPopup(true)}
                type="button"
              >
                Connect
              </button>
              <button
                className="wallet-bg-bridge1 text-[#FF9900] text-center"
                onClick={() => setShowChainPopup(true)}
                type="button"
              >
                Select Chain
              </button>
              {showChainPopup && (
                <ChainPopup
                  setShowChainPopup={setShowChainPopup}
                  availableChains={availableChains}
                  chain={chain}
                  switchChain={switchChain}
                />
              )}
              {showConnectPopup && (
                <div
                  className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget)
                      setShowConnectPopup(false);
                  }}
                >
                  <div className="relative text-white md:p-8 p-6 rounded-2xl md:max-w-[520px] w-full clip-bg roboto">
                    <svg
                      onClick={() => setShowConnectPopup(false)}
                      className="absolute cursor-pointer md:right-10 right-4 md:top-11 top-4 hover:scale-110 transition-transform"
                      width={18}
                      height={19}
                      viewBox="0 0 18 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
                        stroke="#ffffff"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <h2 className="md:text-2xl text-xl font-bold text-white mb-2 text-center">
                      Connect a Wallet
                    </h2>
                    <p className="text-gray-400 text-sm text-left mt-12 mb-6">
                      Popular
                    </p>

                    {/* Wallet options */}
                    <div className="grid md:grid-cols-3 grid-cols-2 gap-x-2 gap-y-6 mt-2">
                      {connectors.slice(0, 6).map((connector) => (
                        <div
                          key={connector.uid}
                          className="flex items-center justify-start gap-2 cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => {
                            connect({ connector });
                            setShowConnectPopup(false);
                          }}
                        >
                          <div className="relative">
                            {/* <img
                              src={Sbg}
                              alt="sbg"
                              className="absolute z-0 left-[-1.5px] top-0 bottom-0 my-auto min-w-[20px] h-[20px]"
                            /> */}
                            <img
                              src={
                                connector.name.includes("MetaMask")
                                  ? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ymr3UNKopfI0NmUY95Dr-0589vG-91KuAA&s"
                                  : // "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
                                  connector.name.includes("WalletConnect")
                                  ? "https://avatars.githubusercontent.com/u/37784886?s=200&v=4"
                                  : connector.name.includes("Coinbase")
                                  ? "https://avatars.githubusercontent.com/u/18060234?s=200&v=4"
                                  : "https://rainbowkit.com/icons/wallet.svg"
                              }
                              alt={connector.name}
                              className="w-4 h-4 relative z-10 flex flex-shrink-0 object-contain rounded-full"
                            />
                          </div>
                          <p className="md:text-[13px] text-[10px] text-white">
                            {connector.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#444444] w-full h-[1px] mb-4 mt-10"></div>
                    <div className="text-gray-400 text-sm mt-4 flex justify-between items-center gap-2 roboto font-medium">
                      New to Ethereum Wallets?{" "}
                      <span className="text-[#FF9900] cursor-pointer hover:underline text-xs roboto font-bold">
                        Learn More
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        }
        if (chain.unsupported) {
          return (
            <button
              className="wallet-bg-bridge1 text-[#FF494A]"
              onClick={() => setShowChainPopup(true)}
              type="button"
            >
              Wrong Network
            </button>
          );
        }
        return (
          <>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                className="wallet-bg-bridge1 text-[#FF9900] text-center"
                onClick={() => setShowPopup(true)}
                type="button"
              >
                Disconnect
              </button>
            </div>

            <button
              className="wallet-bg-bridge1 text-[#FF9900] text-center"
              onClick={() => setShowChainPopup(true)}
              type="button"
            >
              Select Chain
            </button>

            {/* Address popup */}
            {showPopup && (
              <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
                <AddressCard
                  address={address || ""}
                  onCopy={() => navigator.clipboard.writeText(address || "")}
                  onDisconnect={() => {
                    disconnect();
                    setShowPopup(false);
                  }}
                  onClose={() => setShowPopup(false)}
                />
              </div>
            )}

            {/* Chain popup */}
            {showChainPopup && (
              <ChainPopup
                setShowChainPopup={setShowChainPopup}
                availableChains={availableChains}
                chain={chain}
                switchChain={switchChain}
              />
            )}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}
