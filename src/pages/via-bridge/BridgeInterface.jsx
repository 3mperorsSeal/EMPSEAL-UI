import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { parseEther, formatEther, formatUnits } from "viem";
import { toast } from "../../utils/toastHelper";
import {
  ArrowDownUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Check,
  Copy,
} from "lucide-react";

import ChainSelector from "./components/ChainSelector";
import TokenSelector from "./components/TokenSelector";
import SelectionModal from "./components/SelectionModal";
import RecentTransactions from "../../components/RecentTransactions";
import { useRecentTransactions } from "../../hooks/useRecentTransactions";
import {
  BRIDGE_CONFIG,
  getTokensArray,
  getTokenById,
  getDefaultToken,
  hasToken,
} from "./config/bridgeConfig";
import UpDownAr from "../../assets/images/reverse.svg";
import Sellbox from "../../assets/images/sell-box.png";
import Buybox from "../../assets/images/buy-bg.png";
import Swapbutton from "../../assets/images/swap-button.svg";
import Rbox from "../../assets/images/r-d.png";
import CPatch from "../../assets/images/rec-token.svg";

// Import ABIs
import { ERC20_ABI } from "../../utils/via-bridge-abis/index";

const BridgeInterface = () => {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { transactions, addTransaction, clearTransactions } =
    useRecentTransactions();

  // ----------------------------------------------------------------
  // 1. STATE & CONFIG
  // ----------------------------------------------------------------

  const [fromChainId, setFromChainId] = useState(null);
  const [toChainId, setToChainId] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  const [isFromChainModalOpen, setIsFromChainModalOpen] = useState(false);
  const [isToChainModalOpen, setIsToChainModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [recipient, setRecipient] = useState("");

  const sourceChain = fromChainId ? BRIDGE_CONFIG[fromChainId] : null;
  const destChain = toChainId ? BRIDGE_CONFIG[toChainId] : null;
  const isCorrectChain = chain?.id === fromChainId;

  // Add copy functionality states
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTokenAddress, setActiveTokenAddress] = useState(null);
  // ----------------------------------------------------------------
  // COPY ADDRESS HANDLER
  // ----------------------------------------------------------------
  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setActiveTokenAddress(address);
      setCopySuccess(true);
      toast.success("Address copied to clipboard!");

      // Reset after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
        setActiveTokenAddress(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
      toast.error("Failed to copy address");
    }
  };
  // ----------------------------------------------------------------
  // 2. DATA FETCHING (FEES, ALLOWANCES, BALANCES)
  // ----------------------------------------------------------------

  const [bridgeFees, setBridgeFees] = useState(null);

  const bridgeFeesAbi = selectedToken?.abi;
  const bridgeFeesContractAddress = selectedToken?.bridge;

  // PulseChain (Synthetic) -> 369 | Base (Collateral) -> 8453
  // const bridgeFeesDestChainId =
  //   sourceChain.abiType === "synthetic" ? 369 : 8453;
  const bridgeFeesDestChainId = toChainId;

  const { data: fetchedBridgeFees } = useReadContract({
    address: bridgeFeesContractAddress,
    abi: bridgeFeesAbi,
    functionName: "getBridgeFees",
    args: [bridgeFeesDestChainId],
    chainId: fromChainId,
    query: {
      enabled: !!fromChainId && !!bridgeFeesContractAddress,
    },
  });

  useEffect(() => {
    if (fetchedBridgeFees) {
      setBridgeFees(fetchedBridgeFees);
    }
  }, [fetchedBridgeFees]);

  useEffect(() => {
    if (!selectedToken) {
      setBridgeFees(null);
    }
  }, [selectedToken]);

  // --- USDC DATA ---
  // Allowance
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } =
    useReadContract({
      address: sourceChain?.usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, selectedToken?.bridge],
      chainId: fromChainId,
      query: {
        enabled:
          !!address &&
          !!sourceChain &&
          !!sourceChain.usdcAddress &&
          !!selectedToken?.bridge,
      },
    });
  // Balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: sourceChain?.usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
    query: { enabled: !!address && !!sourceChain && !!sourceChain.usdcAddress },
  });

  // --- WRAPPED GAS TOKEN DATA (WPLS/WETH) ---
  // Allowance
  const {
    data: wrappedGasTokenAllowance,
    refetch: refetchWrappedGasTokenAllowance,
  } = useReadContract({
    address: sourceChain?.wrappedGasTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, selectedToken?.bridge],
    chainId: fromChainId,
    query: {
      enabled:
        !!address &&
        !!sourceChain &&
        !!sourceChain.wrappedGasTokenAddress &&
        !!selectedToken?.bridge,
    },
  });
  // Balance
  const {
    data: wrappedGasTokenBalance,
    refetch: refetchWrappedGasTokenBalance,
  } = useReadContract({
    address: sourceChain?.wrappedGasTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
    query: {
      enabled:
        !!address && !!sourceChain && !!sourceChain.wrappedGasTokenAddress,
    },
  });

  // --- SOURCE TOKEN DATA ---
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: selectedToken?.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
    query: { enabled: !!address && !!selectedToken?.address && !!fromChainId },
  });
  // Allowance
  const { data: tokenAllowance, refetch: refetchTokenAllowance } =
    useReadContract({
      address: selectedToken?.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, selectedToken?.bridge],
      chainId: fromChainId,
      query: {
        enabled:
          !!address &&
          !!selectedToken?.address &&
          !!selectedToken?.bridge &&
          !!fromChainId,
      },
    });

  // ----------------------------------------------------------------
  // 3. DERIVED STATE & VALIDATION
  // ----------------------------------------------------------------

  const amountBigInt = amount ? parseEther(amount) : 0n;

  // Allowances (Default to 0n)
  const currentTokenAllowance = tokenAllowance ?? 0n;
  const currentUsdcAllowance = usdcAllowance ?? 0n;
  const currentWrappedGasAllowance = wrappedGasTokenAllowance ?? 0n;

  // Balances
  const currentTokenBalance = tokenBalance ?? 0n;
  const currentUsdcBalance = usdcBalance ?? 0n;
  const currentWrappedGasBalance = wrappedGasTokenBalance ?? 0n;

  // Requirements
  const requiredUsdc = bridgeFees ? bridgeFees[3] : 0n;
  const requiredGasToken = bridgeFees ? bridgeFees[2] : 0n;

  // --- Validation Flags ---
  // 1. Check Insufficient Balances
  const hasInsufficientTokenBalance = currentTokenBalance < amountBigInt;
  const hasInsufficientUsdcBalance = currentUsdcBalance < requiredUsdc;
  const hasInsufficientGasTokenBalance =
    currentWrappedGasBalance < requiredGasToken;

  // 2. Check Approval Needs
  const needsTokenApproval = currentTokenAllowance < amountBigInt;
  const needsUsdcApproval = currentUsdcAllowance < requiredUsdc;
  const needsWrappedGasTokenApproval =
    currentWrappedGasAllowance < requiredGasToken;

  // --- Determine Current Step ---
  // Step 1: Input / Connect
  // Step 2: Approvals (Only if balances are sufficient)
  // Step 3: Ready to Bridge
  let currentStep = 1;

  if (!address || !isCorrectChain || !amount || parseFloat(amount) === 0) {
    currentStep = 1;
  } else if (bridgeFees) {
    // If any approval is needed, go to Step 2
    if (
      needsTokenApproval ||
      needsUsdcApproval ||
      needsWrappedGasTokenApproval
    ) {
      currentStep = 2;
    } else {
      // If all approvals met, go to Step 3
      currentStep = 3;
    }
  } else {
    // Fees loading
    currentStep = 1;
  }

  // ----------------------------------------------------------------
  // 4. CONTRACT WRITES
  // ----------------------------------------------------------------

  const { writeContract: approveToken, data: tokenHash } = useWriteContract();
  const { writeContract: approveUsdc, data: usdcApprovalHash } =
    useWriteContract();
  const {
    writeContract: approveWrappedGasToken,
    data: wrappedGasTokenApprovalHash,
  } = useWriteContract();
  const { writeContract: executeBridge, data: bridgeHash } = useWriteContract();

  const { isLoading: isTokenApproving, isSuccess: isTokenApproved } =
    useWaitForTransactionReceipt({ hash: tokenHash });
  const { isLoading: isUsdcApproving, isSuccess: isUsdcApproved } =
    useWaitForTransactionReceipt({ hash: usdcApprovalHash });
  const {
    isLoading: isWrappedGasTokenApproving,
    isSuccess: isWrappedGasTokenApproved,
  } = useWaitForTransactionReceipt({ hash: wrappedGasTokenApprovalHash });
  const { isLoading: isBridging, isSuccess: isBridged } =
    useWaitForTransactionReceipt({ hash: bridgeHash });

  useEffect(() => {
    if (address) setRecipient(address);
  }, [address]);

  // Refetch Everything on Success
  const refetchAll = () => {
    refetchTokenAllowance();
    refetchUsdcAllowance();
    refetchWrappedGasTokenAllowance();
    refetchTokenBalance();
    refetchUsdcBalance();
    refetchWrappedGasTokenBalance();
  };

  useEffect(() => {
    if (isTokenApproved) {
      toast.success("Tokens approved!");
      refetchAll();
    }
  }, [isTokenApproved]);

  useEffect(() => {
    if (isUsdcApproved) {
      toast.success("USDC approved!");
      refetchAll();
    }
  }, [isUsdcApproved]);

  useEffect(() => {
    if (isWrappedGasTokenApproved) {
      toast.success("Wrapped Gas Token approved!");
      refetchAll();
    }
  }, [isWrappedGasTokenApproved]);

  useEffect(() => {
    if (isBridged) {
      toast.success("Bridge transaction submitted!");
      addTransaction({
        hash: bridgeHash,
        timestamp: Date.now(),
        fromChainName: sourceChain?.name || "Unknown",
        toChainName: destChain?.name || "Unknown",
        explorerUrl: sourceChain?.explorer,
      });
      setAmount("");
      refetchAll();
    }
  }, [isBridged, bridgeHash]);

  // ----------------------------------------------------------------
  // 6. ACTION HANDLERS
  // ----------------------------------------------------------------

  const handleApproveToken = async () => {
    if (!bridgeFees) {
      toast.error("Bridge fees not loaded yet.");
      return;
    }

    try {
      const amountBigInt = parseEther(amount);

      // 1. Approve Main Token
      if (needsTokenApproval) {
        approveToken({
          address: selectedToken.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [selectedToken.bridge, amountBigInt],
          chainId: fromChainId,
        });
        toast.info(`Approving ${selectedToken.symbol}...`);
        return;
      }

      // 2. Approve USDC
      if (needsUsdcApproval) {
        approveUsdc({
          address: sourceChain.usdcAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [selectedToken.bridge, bridgeFees[3]],
          chainId: fromChainId,
        });
        toast.info("Approving USDC...");
        return;
      }

      // 3. Approve Wrapped Gas Token
      if (needsWrappedGasTokenApproval) {
        approveWrappedGasToken({
          address: sourceChain.wrappedGasTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [selectedToken.bridge, bridgeFees[2]],
          chainId: fromChainId,
        });
        toast.info("Approving Wrapped Gas Token...");
        return;
      }
    } catch (error) {
      toast.error("Approval failed");
      console.error(error);
    }
  };

  const handleBridge = useCallback(async () => {
    try {
      const amountBigInt = parseEther(amount);
      const abiToUse = selectedToken?.abi;

      if (!abiToUse) {
        toast.error("Unsupported token type");
        return;
      }

      executeBridge({
        address: selectedToken.bridge,
        abi: abiToUse,
        functionName: "bridge",
        args: [toChainId, recipient, amountBigInt],
        chainId: fromChainId,
      });

      toast.info("Initiating bridge...");
    } catch (error) {
      toast.error("Bridge failed");
      console.error(error);
    }
  }, [amount, selectedToken, toChainId, recipient, fromChainId, executeBridge]);

  const handleSwapDirection = () => {
    const newFromChainId = toChainId;
    const newToChainId = fromChainId;

    // Find the same token on the new source chain
    const newToken = getTokenById(newFromChainId, selectedToken?.id);

    setFromChainId(newFromChainId);
    setToChainId(newToChainId);
    setAmount("");
    setSelectedToken(newToken || getDefaultToken(newFromChainId));
  };

  const handlePercentageChange = (value) => {
    // Note: tokenBalance from useReadContract is BigInt
    if (tokenBalance === undefined) return;
    setSelectedPercentage(value);
    const bal = Number(formatEther(tokenBalance));
    const calculatedAmount = (bal * value) / 100;
    setAmount(calculatedAmount.toString());
  };

  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ----------------------------------------------------------------
  // 7. RENDER HELPERS
  // ----------------------------------------------------------------

  const renderButton = useCallback(() => {
    if (!address) return <button disabled>Connect Wallet</button>;
    if (!isCorrectChain)
      return (
        <button onClick={() => switchChain({ chainId: fromChainId })}>
          Switch to {sourceChain?.name}
        </button>
      );
    if (isBridged)
      return (
        <button disabled className="flex gap-2 items-center justify-center">
          <CheckCircle2 className="w-5 h-5" /> Bridged
        </button>
      );

    // Step 1: Input Validation
    if (currentStep === 1) {
      return (
        <button disabled={!amount || parseFloat(amount) === 0}>
          Enter Amount
        </button>
      );
    }

    // Step 2: Approvals (with Balance Checks)
    if (currentStep === 2) {
      const isAnyApproving =
        isTokenApproving || isUsdcApproving || isWrappedGasTokenApproving;

      // PRIORITY: Check Balances First
      if (hasInsufficientTokenBalance)
        return (
          <button disabled className="w-full cursor-not-allowed opacity-50">
            Insufficient {selectedToken.symbol}
          </button>
        );
      if (hasInsufficientUsdcBalance)
        return (
          <button disabled className="w-full cursor-not-allowed opacity-50">
            Insufficient USDC
          </button>
        );
      if (hasInsufficientGasTokenBalance)
        return (
          <button disabled className="w-full cursor-not-allowed opacity-50">
            Insufficient {fromChainId === 369 ? "WPLS" : "WETH"}
          </button>
        );

      // If balances are OK, show Approval Buttons
      let buttonText = "Approve Tokens";
      if (isTokenApproving) buttonText = `Approving ${selectedToken.symbol}...`;
      else if (isUsdcApproving) buttonText = "Approving USDC...";
      else if (isWrappedGasTokenApproving)
        buttonText = "Approving Gas Token...";
      else if (needsTokenApproval)
        buttonText = `Approve ${selectedToken.symbol}`;
      else if (needsUsdcApproval) buttonText = "Approve USDC";
      else if (needsWrappedGasTokenApproval) buttonText = "Approve Gas Token";

      return (
        <button
          onClick={handleApproveToken}
          disabled={isAnyApproving || !amount || !bridgeFees}
          className="w-full flex justify-center items-center"
        >
          {isAnyApproving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {buttonText}
            </>
          ) : (
            buttonText
          )}
        </button>
      );
    }

    // Step 3: Bridge
    if (currentStep === 3) {
      return (
        <button
          onClick={handleBridge}
          disabled={isBridging || !amount || !recipient}
          className="w-full"
        >
          {isBridging ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Bridging...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" /> Bridge Tokens
            </>
          )}
        </button>
      );
    }
    return null;
  }, [
    amount,
    address,
    isCorrectChain,
    isBridged,
    currentStep,
    isTokenApproving,
    isUsdcApproving,
    isWrappedGasTokenApproving,
    isBridging,
    bridgeFees,
    needsTokenApproval,
    needsUsdcApproval,
    needsWrappedGasTokenApproval,
    hasInsufficientTokenBalance,
    hasInsufficientUsdcBalance,
    hasInsufficientGasTokenBalance,
    selectedToken,
    recipient,
    handleApproveToken,
    handleBridge,
  ]);

  // Function to format the number with commas
  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ""); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "").slice(0, 6)}` // Remove non-numeric from decimal
      : formattedInteger;
  };
  const getDynamicFontSize = (value, desktop = 48, mobile = 32) => {
    const length = value?.replace(/\D/g, "").length || 0;
    const baseSize = window.innerWidth >= 768 ? desktop : mobile;

    return Math.max(12, baseSize - length * 1.5);
  };

  return (
    <>
      <div className="md:max-w-[800px] mx-auto w-full md:px-1 px-4 justify-center xl:gap-4 gap-4 items-start 2xl:pt-2 py-2 md:mt-4 mt-1 scales-b scales-top scales-top_via">
        {!isCorrectChain && address && sourceChain && (
          <div
            className="mb-10 flex items-start gap-3 cursor-pointer bg_swap_box_chain"
            onClick={() => switchChain({ chainId: fromChainId })}
          >
            <AlertCircle className="w-5 h-5 text-[#FF9900] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#FF9900]">
                Wrong Network
              </p>
              <p className="text-sm text-[#FF9900]">
                Click to switch to {sourceChain?.name}
              </p>
            </div>
          </div>
        )}
        <div className="lg:max-w-[800px] md:max-w-[800px] mx-auto w-full">
          <div className="flex gap-3 md:flex-nowrap flex-wrap">
            <div className="relative bg_swap_box_chain flex justify-center items-center wfu">
              <ChainSelector
                chain={sourceChain}
                onClick={() => setIsFromChainModalOpen(true)}
              />
            </div>
            <div className="relative bg_swap_box w-full">
              <div className="flex justify-between gap-3 items-center">
                <div className="font-orbitron md:text-2xl text-xs font-extrabold leading-normal text-[#FF9900]">
                  From
                </div>
                <div className="md:text-xl text-[10px] font-orbitron">
                  <span className="font-normal leading-normal text-[#FF9900]">
                    BAL
                  </span>
                  <span className="font-normal leading-normal text-[#FF9900]">
                    {" "}
                    :{" "}
                  </span>
                  <span className="text-white leading-normal">
                    {tokenBalance
                      ? parseFloat(formatEther(tokenBalance)).toFixed(6)
                      : "0.00"}{" "}
                  </span>
                </div>
              </div>
              <div className="flex w-full mt-6 md:gap-10 gap-2">
                <div className="lg:md:max-w-[210px] w-full">
                  <div className="relative flex md:gap-2 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[10px] rounded-lg md:px-5 px-3 md:py-[10px] py-2 justify-center w-full">
                    <TokenSelector
                      token={selectedToken}
                      chainId={fromChainId}
                      onClick={() => {
                        if (!fromChainId) {
                          toast.error("Please select chain first");
                          return;
                        }
                        setIsTokenModalOpen(true);
                      }}
                      className="text-[#FF9900]"
                    />
                    <button
                      onClick={() => handleCopyAddress(selectedToken.address)}
                      className="rounded-md transition-colors absolute right-2"
                      title="Copy token address"
                    >
                      {copySuccess &&
                      activeTokenAddress === selectedToken.address ? (
                        <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-[#FF9900]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="w-full md:h-[53px] h-9">
                  {(() => {
                    const formattedValue = formatNumber(
                      amount?.toString() || "",
                    );

                    const outputLength =
                      formattedValue.replace(/\D/g, "").length || 0;

                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 40
                        : window.innerWidth >= 768
                          ? 30
                          : 20;
                    const FREE_DIGITS = window.innerWidth >= 768 ? 7 : 6;
                    // const FREE_DIGITS = 7; // no shrink up to 10 digits
                    const SHRINK_RATE = 3; // slow shrink rate

                    const excessDigits = Math.max(
                      0,
                      outputLength - FREE_DIGITS,
                    );

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE,
                    );

                    return (
                      <>
                        <input
                          type="text"
                          value={formattedValue}
                          onChange={(e) =>
                            setAmount(formatNumber(e.target.value))
                          }
                          placeholder={
                            tokenBalance?.formatted === "0.000000"
                              ? "0"
                              : "0.00"
                          }
                          className="font-orbitron font-extrabold text-white  rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black"
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />

                        <button
                          onClick={() => {
                            if (tokenBalance !== undefined) {
                              setAmount(formatEther(tokenBalance));
                              setSelectedPercentage(100);
                            }
                          }}
                          className="mt-2 ml-auto py-1 border border-[#FF9900] flex justify-center items-center rounded-xl md:text-[10px] text-[8px] font-medium font-orbitron md:w-[100px] w-[100px] px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                        >
                          MAX AMOUNT
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-10 mt-7">
               <div className="text-[#FF9900] font-orbitron md:text-xl text-sm flex flex-col">
                 --
                  <span className="font-bold">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-[#EEC485] flex justify-center items-center rounded-xl md:text-[10px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
                ${
                  selectedPercentage === value
                    ? "!text-black !bg-[#FF9900] border-[#FF9900]"
                    : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
                }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div
            className="cursor-pointer mx-auto my-4 md:pt-7 relative md:top-[-14px] top-[-10px] pt-[20px] md:w-[70px] w-12"
            onClick={handleSwapDirection}
          >
            <img
              src={UpDownAr}
              alt="Ar"
              className="hoverswap transition-all rounded-xl"
            />
          </div>
          {/* TO SECTION */}
          <div className="flex gap-3 md:flex-nowrap flex-wrap">
            <div className="relative bg_swap_box_chain flex justify-center items-center wfu">
              <ChainSelector
                chain={destChain}
                onClick={() => setIsToChainModalOpen(true)}
              />
            </div>
            <div className="relative text-white bg_swap_box_black w-full">
              <div className="flex justify-between gap-3 items-center">
                <div className="font-orbitron md:text-2xl text-xs font-extrabold leading-normal text-[#FF9900]">
                  To
                </div>
              </div>
              <div className="flex w-full mt-6 md:gap-10 gap-2">
                <div className="lg:md:max-w-[210px] w-full">
                  <div className="relative flex md:gap-2 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[10px] rounded-lg md:px-5 px-3 md:py-[10px] py-2 justify-center w-full">
                    <TokenSelector
                      token={selectedToken}
                      chainId={fromChainId}
                      onClick={() => setIsTokenModalOpen(true)}
                      className="!text-white"
                    />
                    <button
                      onClick={() => handleCopyAddress(selectedToken.address)}
                      className="rounded-md transition-colors absolute right-2"
                      title="Copy token address"
                    >
                      {copySuccess &&
                      activeTokenAddress === selectedToken.address ? (
                        <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-[#FF9900]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="w-full md:h-[53px] h-9">
                  {(() => {
                    const formattedValue = formatNumber(
                      amount?.toString() || "",
                    );

                    const inputLength =
                      formattedValue.replace(/\D/g, "").length || 0;

                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 40
                        : window.innerWidth >= 768
                          ? 30
                          : 20;

                    const FREE_DIGITS = window.innerWidth >= 768 ? 7 : 6;
                    const SHRINK_RATE = 3; // slow shrink rate

                    const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE,
                    );

                    return (
                      <>
                        <input
                          type="text"
                          value={formattedValue}
                          onChange={(e) =>
                            setAmount(formatNumber(e.target.value))
                          }
                          placeholder={
                            tokenBalance?.formatted === "0.000000"
                              ? "0"
                              : "0.00"
                          }
                          className="font-orbitron font-extrabold text-white  rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black"
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-8 mt-5">
                 <div className="text-[#FF9900] font-orbitron md:text-xl text-sm flex flex-col">
                  52.6489
                  <span className="font-bold">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-[#EEC485] flex justify-center items-center rounded-xl md:text-[10px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
                ${
                  selectedPercentage === value
                    ? "!text-black !bg-[#FF9900] border-[#FF9900]"
                    : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
                }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="my-5 relative ">
          <div className="relative w-full bg_swap_box_chain !py-9">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="absolute inset-0 top-0 bottom-0 my-auto w-full h-full md:pl-4 pl-4 pr-36 py-12 text-center bg-transparent text-white font-orbitron md:text-xl text-sm truncate outline-none"
            />
            <button
              className={`!absolute !bg-transparent md:w-[100px] w-20 md:h-12 h-12 hover:opacity-70 bg-black !border !border-[#FF9900] top-3 right-3 flex justify-center items-center rounded-xl px-2 roboto !text-[#FF9900] text-base font-bold`}
              // onClick={handleSelfButtonClick}
            >
              Self
            </button>
          </div>
        </div>
        {/* Fees Display */}
        {bridgeFees && (
          <div className="mb-5 flex justify-between gap-2 items-center bg_swap_box_chain">
            <div className="block md:text-lg text-base font-medium text-white font-orbitron text-center">
              Estimated Fees:
            </div>
            <div className="grid grid-cols-2 gap-1 text-center text-[#FF9900] text-xs md:text-base font-orbitron">
              <div className="font-bold">Gas Token</div>
              <div>
                <span className="rigamesh">
                  {formatEther(bridgeFees[2] ?? 0n)}{" "}
                </span>
                {fromChainId === 369 ? "WPLS" : "ETH"}
              </div>

              <div className="font-bold">Messaging Fees:</div>
              <div className="rigamesh">
                {formatUnits(bridgeFees[3] ?? 0n, 6)} USDC
              </div>
            </div>
          </div>
        )}
        <div className="md:px-1 px-4 2xl:pb-4">
          <button
            type="button"
            className="gtw relative w-full md:h-[68px] h-11 bg-[#F59216] md:rounded-[10px] rounded-md mx-auto button-trans text-center mt-4 flex justify-center items-center gap-2 transition-all font-orbitron lg:text-2xl text-sm font-extrabold"
          >
            {renderButton()}
          </button>
        </div>
      </div>

      {/* Modals */}
      <SelectionModal
        isOpen={isFromChainModalOpen}
        onClose={() => setIsFromChainModalOpen(false)}
        items={Object.values(BRIDGE_CONFIG).filter((c) => c.id !== toChainId)}
        onSelect={(chain) => {
          const chainId =
            typeof chain.id === "string" ? parseInt(chain.id) : chain.id;
          setFromChainId(chainId);
          setSelectedToken(null);
          setToChainId(null);
          setIsFromChainModalOpen(false);
        }}
        title="Select From Chain"
      />
      <SelectionModal
        isOpen={isToChainModalOpen}
        onClose={() => setIsToChainModalOpen(false)}
        items={Object.values(BRIDGE_CONFIG).filter((c) => {
          const chainId = typeof c.id === "string" ? parseInt(c.id) : c.id;
          // If no token selected, show all chains except from
          if (!selectedToken) return chainId !== fromChainId;
          // Only show chains that have the currently selected token
          return (
            chainId !== fromChainId && hasToken(chainId, selectedToken?.id)
          );
        })}
        onSelect={(chain) => {
          const chainId =
            typeof chain.id === "string" ? parseInt(chain.id) : chain.id;
          setToChainId(chainId);
          setIsToChainModalOpen(false);
        }}
        title="Select To Chain"
      />
      <SelectionModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        items={getTokensArray(fromChainId).map((t) => ({ ...t, id: t.id }))}
        onSelect={(token) => {
          setSelectedToken(token);
          setIsTokenModalOpen(false);
        }}
        title="Select Token"
        chainId={fromChainId}
      />
      {/* Info / Logs */}
      <div className="lg:max-w-[800px] md:max-w-[800px] mx-auto w-full px-4 scales-b scales-top">
        {bridgeHash && (
          <div className="bg_swap_box_chain p-4 w-full font-orbitron">
            <p className="text-lg text-[#FBB025] font-bold  mb-2 v">
              Bridge transaction submitted!
            </p>
            <p className="text-sm text-[#FBB025] mb-2">
              Your tokens will arrive in 2-10 minutes
            </p>
            <a
              href={`https://scan.vialabs.io/transaction/${bridgeHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-white hover:underline"
            >
              Track on VIA Scanner →
            </a>
          </div>
        )}
        <RecentTransactions
          transactions={transactions}
          clearTransactions={clearTransactions}
        />
        <hr className="mt-4" />
        {/* Instructions */}
        <div className="w-full md:px-0 px-4 md:pb-10 pb-6">
          <div className="mt-5 md:max-w-[1300px] w-full mx-auto bg-[#100C06] border border-[#100C06] rounded-xl lg:px-12 px-6 lg:py-10 py-10">
            <h2 className="md:text-[40px] text-[32px] font-extrabold text-white mb-10 font-orbitron">
              How It Works
            </h2>
            <ol className="space-y-6">
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  1
                </span>
                <span className="text-white text-sm">
                  Connect your wallet and select the source chain
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  2
                </span>
                <span className="text-white text-sm">
                  Approve tokens (Bridge Token, USDC, and Gas Token)
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  3
                </span>
                <span className="text-white text-sm">
                  Execute the bridge and wait 2–10 minutes
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  4
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
