import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther } from "viem";
import { toast } from "react-toastify";
import { ArrowDownUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import ChainSelector from "./components/ChainSelector";
import TokenSelector from "./components/TokenSelector";
import SelectionModal from "./components/SelectionModal";
import RecentTransactions from "../../components/RecentTransactions";
import { useRecentTransactions } from "../../hooks/useRecentTransactions";
import { BRIDGE_CONFIG } from "./config/bridgeConfig";
import UpDownAr from "../../assets/images/reverse.svg";
import Sellbox from "../../assets/images/sell-box.png";
import Buybox from "../../assets/images/buy-bg.png";
import Swapbutton from "../../assets/images/swap-button.svg";
import Rbox from "../../assets/images/r-d.png";
import CPatch from "../../assets/images/rec-token.svg";

// Import ABIs
import COLLATERAL_BRIDGE_ABI from "../../utils/via-bridge-abis/CollateralERC20";
import SYNTHETIC_BRIDGE_ABI from "../../utils/via-bridge-abis/SyntheticERC20";
import ERC20_ABI from "../../utils/via-bridge-abis/ERC20";

const BridgeInterface = () => {
  const { address, chain } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { transactions, addTransaction, clearTransactions } =
    useRecentTransactions();

  // State
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [step, setStep] = useState(2);

  const [fromChainId, setFromChainId] = useState(943);
  const [toChainId, setToChainId] = useState(84532);
  const [selectedToken, setSelectedToken] = useState(
    BRIDGE_CONFIG[fromChainId].tokens[0]
  );

  const [isFromChainModalOpen, setIsFromChainModalOpen] = useState(false);
  const [isToChainModalOpen, setIsToChainModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  // Determine source and destination
  const sourceChain = BRIDGE_CONFIG[fromChainId];
  const destChain = BRIDGE_CONFIG[toChainId];

  // Check if on correct chain
  const isCorrectChain = chain?.id === fromChainId;

  // Read token balance
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: selectedToken.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
  });

  // Read token allowance
  const { data: tokenAllowance, refetch: refetchTokenAllowance } =
    useReadContract({
      address: selectedToken.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, sourceChain.bridge],
      chainId: fromChainId,
    });

  // Write contracts
  const { writeContract: approveToken, data: tokenHash } = useWriteContract();
  const { writeContract: executeBridge, data: bridgeHash } = useWriteContract();

  // Transaction receipts
  const { isLoading: isTokenApproving, isSuccess: isTokenApproved } =
    useWaitForTransactionReceipt({ hash: tokenHash });
  const { isLoading: isBridging, isSuccess: isBridged } =
    useWaitForTransactionReceipt({ hash: bridgeHash });

  // Auto-set recipient to sender
  useEffect(() => {
    if (address) {
      setRecipient(address);
    }
  }, [address]);

  // Determine current step
  useEffect(() => {
    if (!amount || parseFloat(amount) === 0) {
      setStep(2);
      return;
    }

    const amountBigInt = parseEther(amount);
    const needsTokenApproval = !tokenAllowance || tokenAllowance < amountBigInt;

    if (needsTokenApproval) {
      setStep(2);
    } else {
      setStep(3);
    }
  }, [amount, tokenAllowance]);

  const handleApproveToken = async () => {
    try {
      const amountBigInt = parseEther(amount);
      approveToken({
        address: selectedToken.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [sourceChain.bridge, amountBigInt],
        chainId: fromChainId,
      });
      toast.info("Approving tokens...");
    } catch (error) {
      toast.error("Token approval failed");
      console.error(error);
    }
  };

  const handleBridge = async () => {
    try {
      const amountBigInt = parseEther(amount);

      if (fromChainId === 943) {
        executeBridge({
          address: sourceChain.bridge,
          abi: COLLATERAL_BRIDGE_ABI,
          functionName: "bridge",
          args: [toChainId, recipient, amountBigInt],
          chainId: fromChainId,
        });
      } else if (fromChainId === 84532) {
        executeBridge({
          address: sourceChain.bridge,
          abi: SYNTHETIC_BRIDGE_ABI,
          functionName: "bridge",
          args: [toChainId, recipient, amountBigInt],
          chainId: fromChainId,
        });
      }

      toast.info("Initiating bridge...");
    } catch (error) {
      toast.error("Bridge failed");
      console.error(error);
    }
  };

  const handleSwapDirection = () => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setAmount("");
    setSelectedToken(BRIDGE_CONFIG[toChainId].tokens[0]);
  };

  useEffect(() => {
    if (isTokenApproved) {
      toast.success("Tokens approved!");
      refetchTokenAllowance();
    }
  }, [isTokenApproved]);

  useEffect(() => {
    if (isBridged) {
      toast.success(
        "Bridge transaction submitted! Check VIA scanner for status."
      );
      addTransaction({
        hash: bridgeHash,
        timestamp: Date.now(),
        fromChainName: sourceChain.name,
        toChainName: destChain.name,
        explorerUrl: sourceChain.explorer,
      });
      setAmount("");
      refetchTokenBalance();
    }
  }, [isBridged, bridgeHash]);

  const renderButton = () => {
    if (!address) {
      return (
        <button onClick={openConnectModal} className="w-full">
          Connect Wallet
        </button>
      );
    }

    if (!isCorrectChain) {
      return (
        <button disabled className="w-full">
          Switch to {sourceChain.name}
        </button>
      );
    }

    if (isBridged) {
      return (
        <button disabled className="w-full">
          <CheckCircle2 className="w-5 h-5" />
          Bridged
        </button>
      );
    }

    if (step === 2) {
      return (
        <button
          onClick={handleApproveToken}
          disabled={isTokenApproving || !amount}
          className="w-full"
        >
          {isTokenApproving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Approving Tokens...
            </>
          ) : (
            "Approve Tokens"
          )}
        </button>
      );
    }

    if (step === 3) {
      return (
        <button
          onClick={handleBridge}
          disabled={isBridging || !amount || !recipient}
          className="w-full"
        >
          {isBridging ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Bridging...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Bridge Tokens
            </>
          )}
        </button>
      );
    }
    return null;
  };
  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const handlePercentageChange = (value) => {
    if (!tokenBalance) return;

    setSelectedPercentage(value);

    const bal = Number(formatEther(tokenBalance));
    const calculatedAmount = (bal * value) / 100;

    setAmount(calculatedAmount.toString());
  };

  return (
    <>
      <div className="md:max-w-[818px] mx-auto w-full md:px-4 px-2 justify-center xl:gap-4 gap-4 items-start 2xl:pt-2 py-2 mt-4 scales-b scales-top">
        {/* <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">Bridge</h2>
          <p className="text-sm text-gray-400">Transfer tokens across chains</p>
        </div> */}

        {!isCorrectChain && address && (
          <div className="mb-10 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF9900] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#FF9900]">
                Wrong Network
              </p>
              <p className="text-sm text-[#FF9900]">
                Please switch to {sourceChain.name}
              </p>
            </div>
          </div>
        )}
        <div className="w-full">
          <div className="relative">
            <img className="bg-sell" src={Sellbox} alt="sellbox" />
            <div className="flex justify-between gap-3 items-center lg:px-2">
              <div className="font-orbitron text-dark-400 ps-4 pt-4 text-2xl font-semibold leading-normal">
                From
              </div>
              <div className="text-center absolute -top-4 right-0 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 bg-[#FFE6C0] md:text-sm text-xs px-2 py-2">
                <span className="font-bold font-orbitron leading-normal">
                  BAL
                </span>
                <span className="font-bold font-orbitron leading-normal">
                  {" "}
                  :{" "}
                </span>

                <span className="font-bold font-orbitron leading-normal">
                  {tokenBalance ? formatEther(tokenBalance) : "0.00"}{" "}
                  {selectedToken.symbol}
                </span>
              </div>
            </div>
            <div className="flex w-full px-4 py-4 mt-2">
              <div className="flex md:w-1/2 w-[40%] md:me-3 justify-between rounded-2xl py-4 lg:px-8 px-3">
                <div className="flex justify-center gap-4 items-center cursor-pointer md:h-[56px] h-12 md:w-[170px] w-[100px] bg-[#FFE6C0] md:px-3 px-1 py-0 rounded-lg margin_left relative">
                  <ChainSelector
                    chain={sourceChain}
                    onClick={() => setIsFromChainModalOpen(true)}
                  />
                  <div className="absolute bg-black border border-white md:w-[75px] w-[55px] md:h-[55px] h-[50px] flex justify-center items-center rounded-lg md:right-[-90px] right-[-60px]">
                    <img
                      src={CPatch}
                      className="md:w-[25px] md:h-[65px] w-[12px] h-[40px] md:rotate-[60deg] rotate-[70deg] z-[-1] relative md:left-[-20px] left-[-10px]"
                    />
                    <TokenSelector
                      token={selectedToken}
                      onClick={() => setIsTokenModalOpen(true)}
                    />
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 w-full md:me-3">
                <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-20px] md:ml-0 ml-[-40px] justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2
                ${
                  selectedPercentage === value
                    ? " text-white bg-black"
                    : "bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                {/* <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-20px] md:ml-0 ml-[-40px] justify-end">
                  <span />
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    100%
                  </button>
                </div> */}

                <div className="relative md:pr-5 pr-5 flex-flex-col justify-end items-end">
                  {(() => {
                    const inputLength =
                      amount?.toString().replace(/\D/g, "").length || 0;

                    const fontSizeClass =
                      inputLength > 12
                        ? "md:text-[24px] text-xl !text-[#000000]"
                        : inputLength > 8
                        ? "md:text-[32px] text-2xl !text-[#000000]"
                        : "md:text-[40px] text-2xl !text-[#000000]";

                    return (
                      <>
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={
                            tokenBalance?.formatted === "0.000000"
                              ? "0"
                              : "0.00"
                          }
                          className={`text-[#000000] py-2 font-bold text-end w-full leading-7 outline-none border-none bg-transparent token_input px-1 font-orbitron placeholder-black transition-all duration-200 ease-in-out ${fontSizeClass}`}
                          style={{
                            fontSize: `${Math.max(
                              12,
                              40 - amount.toString().length * 1.5
                            )}px`,
                          }}
                        />
                        <button
                          onClick={() => {
                            if (tokenBalance) {
                              setAmount(formatEther(tokenBalance));
                              setSelectedPercentage(100);
                            }
                          }}
                          className="ml-auto py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[100px] w-[100px] px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                        >
                          MAX AMOUNT
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="cursor-pointer" onClick={handleSwapDirection}>
            <img
              src={UpDownAr}
              alt="Ar"
              className="mx-auto my-4 md:pt-7 pt-[44px] pb-5 md:w-[70px] w-12"
            />
          </div>
          <div className="relative">
            <img className="bg-sell" src={Sellbox} alt="sellbox" />
            <div className="flex justify-between gap-3 items-center lg:px-2">
              <div className="font-orbitron text-dark-400 ps-4 pt-4 text-2xl font-semibold leading-normal">
                To
              </div>
            </div>
            <div className="flex w-full px-4 py-4 mt-2">
              <div className="flex md:w-1/2 w-[40%] md:me-3 justify-between rounded-2xl py-4 lg:px-8 px-3">
                <div className="flex justify-center gap-4 items-center cursor-pointer md:h-[56px] h-12 md:w-[170px] w-[120px] bg-[#FFE6C0] md:px-3 px-1 py-0 rounded-lg margin_left relative">
                  <ChainSelector
                    chain={destChain}
                    onClick={() => setIsToChainModalOpen(true)}
                  />
                </div>
              </div>

              <div className="md:w-1/2 w-full md:me-3">
                <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-20px] md:ml-0 ml-[-40px] justify-end">
                  <span />
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className="py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                  >
                    100%
                  </button>
                </div>

                <div className="relative md:pr-5 pr-5 flex-flex-col justify-end items-end">
                  {(() => {
                    const inputLength =
                      amount?.toString().replace(/\D/g, "").length || 0;

                    const fontSizeClass =
                      inputLength > 12
                        ? "md:text-[24px] text-xl !text-[#000000]"
                        : inputLength > 8
                        ? "md:text-[32px] text-2xl !text-[#000000]"
                        : "md:text-[40px] text-2xl !text-[#000000]";

                    return (
                      <>
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={
                            tokenBalance?.formatted === "0.000000"
                              ? "0"
                              : "0.00"
                          }
                          className={`text-[#000000] py-2 font-bold text-end w-full leading-7 outline-none border-none bg-transparent token_input px-1 font-orbitron placeholder-black transition-all duration-200 ease-in-out ${fontSizeClass}`}
                          style={{
                            fontSize: `${Math.max(
                              12,
                              40 - amount.toString().length * 1.5
                            )}px`,
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-20 mb-20 relative">
          <label className="block md:text-2xl text-sm font-medium text-gray-300 mb-6 roboto">
            Recipient Address
          </label>
          <div className="relative w-full h-[120px]">
            <img className="bg-rb" src={Rbox} alt="Rbox" />
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="absolute inset-0 top-0 bottom-0 my-auto w-full h-full pl-10 pr-4 py-3 bg-transparent text-white roboto md:text-2xl text-sm truncate outline-none
      "
            />
          </div>
        </div>
        <div className="md:px-1 px-4">
          <button
            type="button"
            className="w-full button-trans text-center mt-12 h- flex justify-center items-center rounded-xl hover:opacity-80 transition-all hover:text-black hover:bg-transparent font-orbitron text-black lg:text-2xl text-base font-bold"
          >
            <img
              className="absolute swap-button1"
              src={Swapbutton}
              alt="Swap"
            />
            {renderButton()}
          </button>
        </div>
      </div>
      {/*  */}
      <SelectionModal
        isOpen={isFromChainModalOpen}
        onClose={() => setIsFromChainModalOpen(false)}
        items={Object.values(BRIDGE_CONFIG).filter((c) => c.id !== toChainId)}
        onSelect={(chain) => {
          setFromChainId(chain.id);
          setSelectedToken(chain.tokens[0]);
          setIsFromChainModalOpen(false);
        }}
        title="Select From Chain"
      />

      <SelectionModal
        isOpen={isToChainModalOpen}
        onClose={() => setIsToChainModalOpen(false)}
        items={Object.values(BRIDGE_CONFIG).filter((c) => c.id !== fromChainId)}
        onSelect={(chain) => {
          setToChainId(chain.id);
          setIsToChainModalOpen(false);
        }}
        title="Select To Chain"
      />

      <SelectionModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        items={sourceChain.tokens.map((t) => ({ ...t, id: t.address }))}
        onSelect={(token) => {
          setSelectedToken(token);
          setIsTokenModalOpen(false);
        }}
        title="Select Token"
      />
      {/*  */}
      <div className="md:max-w-[1300px] w-full mx-auto px-4 md:mt-0 mt-28 scales-b scales-top">
        {/* {bridgeHash && ( */}
        <div className="clip-bg1 rounded-lg p-4 w-full">
          <p className="text-lg text-[#FBB025] font-medium  mb-2 v">
            Bridge transaction submitted!
          </p>
          <p className="text-xs text-[#FBB025] mb-2 roboto">
            Your tokens will arrive in 2-10 minutes
          </p>
          <a
            href={`https://scan.vialabs.io/transaction/${bridgeHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white hover:underline"
          >
            Track on VIA Scanner →
          </a>
        </div>
        {/* )} */}
        <RecentTransactions
          transactions={transactions}
          clearTransactions={clearTransactions}
        />
        <hr className="mt-20" />
        {/* Info Section */}
        <div className="w-full md:px-0 px-4 md:pb-20 pb-10">
          <div className="mt-16 md:max-w-[1300px] w-full mx-auto bg-[#100C06] border border-[#100C06] rounded-xl lg:px-12 px-6 lg:py-12 py-10">
            <h2 className="md:text-[40px] text-[32px] font-extrabold text-white mb-10 font-orbitron">
              How It Works
            </h2>

            <ol className="space-y-6">
              {/* Step 1 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  1
                </span>
                <span className="text-white text-sm">
                  Connect your wallet and select the source chain
                </span>
              </li>

              {/* Step 2 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  2
                </span>
                <span className="text-white text-sm">
                  Approve USDC for the protocol fee (0.30 USDC)
                </span>
              </li>

              {/* Step 3 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  3
                </span>
                <span className="text-white text-sm">
                  Approve the tokens you want to bridge
                </span>
              </li>

              {/* Step 4 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  4
                </span>
                <span className="text-white text-sm">
                  Execute the bridge and wait 2–10 minutes for cross-chain
                  processing
                </span>
              </li>

              {/* Step 5 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  5
                </span>
                <span className="text-white text-sm">
                  Track your transaction on{" "}
                  <a
                    href="https://scan.vialabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF9900] underline"
                  >
                    VIA Scanner
                  </a>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
};

export default BridgeInterface;
