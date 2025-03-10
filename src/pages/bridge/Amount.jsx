import React, { useState, useRef, useEffect } from "react";
import S from "../../assets/images/s.svg";
import Three from "../../assets/images/324.svg";
import Refresh from "../../assets/images/refresh.svg";
import Info from "../../assets/images/info.svg";
import { formatUnits } from "viem";
import Transcation from "./Transcation";
import {readContract, waitForTransactionReceipt, writeContract, sendTransaction} from "@wagmi/core";
import { erc20Abi } from "viem";
import { WPLS as TOKEN_ABI } from "../../utils/abis/wplsABI";
import { config } from "../../Wagmi/config";
import { toast } from "react-toastify";
// import {confirmRouting, createTransaction, checkTransactionStatus} from '../../utils/services/rangoApiServices';
const Amount = ({
  onClose,
  amountIn,
  amountOut,
  tokenA,
  selectedRoute,
  quoteData,
  fromAddress,
  tokenB,
  confirm,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirm, setConfirm] = useState(false);
  const [swapDetails, setSwapDetails] = useState(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [destinationTx, setDestinationTx] = useState({});
  const modalRef = useRef(null);
  const rangoApiKey = import.meta.env.VITE_RANGO_API_KEY || "";
  
  console.log("quoteData", quoteData);
  console.log("selectedRoute: ", selectedRoute);
  // console.log("wallet address: ", fromAddress);

  const symbiosisRoute = selectedRoute?.type === "evm";
  // console.log("symbiosisRouteCheck", symbiosisRoute);

  const rangoRoute = typeof selectedRoute?.requestId === 'string';
  // console.log("rangoRouteCheck:", rangoRoute);

  const rubicRoute = selectedRoute?.swapType === "cross-chain";
  // console.log("rubicRouteCheck: ", rubicRoute);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const getTokenDecimals = () => {
    if (rubicRoute) {
      return selectedRoute?.tokens?.from?.decimals;
    } else if (rangoRoute) {
      // For Rango, use tokenA's decimals since it's passed as a prop
      return tokenA.decimals;
    } else if (symbiosisRoute) {
      return tokenA.decimals;
    }
    return 18; // default decimals if none specified
  };

  const getScaledAmount = () => {
    const decimals = getTokenDecimals();
    if (rubicRoute) {
      const tokenAmount = parseFloat(quoteData?.rubic.quote.srcTokenAmount);
      return BigInt(Math.floor(tokenAmount * Math.pow(10, decimals)));
    } else if (rangoRoute) {
      return BigInt(Math.floor(parseFloat(amountIn) * Math.pow(10, decimals)));
    } else {
      return amountIn;
    }
  };

  const scaledAmount = getScaledAmount();
  
  const approveToken = async (tokenAddress, approvalAddress, amount) => {

    try {
      // Check if the token is the native token
      const isNativeToken = tokenAddress === "0x0000000000000000000000000000000000000000";
  
      if (isNativeToken) {
        // Native tokens don't need approval
        await swapTokens();
        return {
          success: true,
          data: swapDetails,
        };
      }
      // await executeSwap(swapDetails, swapDetails.quote.fromAddress);
  
      // If not a native token, proceed
      let result = await writeContract(config, {
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "approve",
        args: [approvalAddress, amount],
      });
      await waitForTransaction(result);
      
      // await executeSwap(swapDetails, swapDetails.quote.fromAddress);
      return {
        success: true,
        data: result,
      };
      
    } catch (error) {
      toast.error("Token approval failed!!")
      throw error;
    }
  };

  const waitForTransaction = async (hash) => {
    try {
      const transactionReceipt = await waitForTransactionReceipt(config, {
        confirmations: 2,
        hash,
      });
      if (transactionReceipt.status === "success") {
        return {
          success: true,
          data: transactionReceipt,
        };
      }
      throw transactionReceipt.status;
    } catch (e) {
      throw e;
    }
  };

  const swapTokens = async () => {
    try {
      let response;
      let payload;

      if(rubicRoute) {
        // Existing Rubic implementation
        payload = {
          dstTokenAddress: quoteData.rubic.quote.dstTokenAddress, 
            dstTokenBlockchain: quoteData.rubic.quote.dstTokenBlockchain, 
            referrer: quoteData.rubic.quote.referrer, 
            srcTokenAddress: quoteData.rubic.quote.srcTokenAddress, 
            srcTokenAmount: quoteData.rubic.quote.srcTokenAmount, 
            srcTokenBlockchain: quoteData.rubic.quote.srcTokenBlockchain , 
            fromAddress: quoteData.rubic.quote.fromAddress, 
            receiver: quoteData.rubic.quote.receiver, 
            integratorAddress: quoteData.rubic.quote.integratorAddress, 
            id: selectedRoute.id, 
            slippage: selectedRoute.estimate.slippage,
        } 
        response = await fetch('https://api-v2.rubic.exchange/api/routes/swap',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
      } else if(typeof selectedRoute?.requestId === "string"){
        // Get source and destination chains from the selectedRoute
        const fromChain = selectedRoute.swaps[0].from.blockchain;
        const toChain = selectedRoute.swaps[selectedRoute.swaps.length - 1].to.blockchain;
        
        // Create selectedWallets object with the user's address for both chains
        const selectedWallets = {
          [fromChain]: fromAddress,
          [toChain]: fromAddress
        };

        // rango payload with updated data
        payload = {
          requestId: selectedRoute.requestId,
          destination: fromAddress,
          checkPrerequisites: false,
          selectedWallets: selectedWallets  // Add the selectedWallets object
        };
         
        const confirmResponse = await fetch(
          `https://api.rango.exchange/routing/confirm?apiKey=${rangoApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );

        if (!confirmResponse.ok) {
          throw new Error('Rango route confirmation failed');
        }

        const confirmData = await confirmResponse.json();
        console.log("Rango route confirmation:", confirmData);

        // Then create the transaction
        const createTxPayload = {
          userSettings: { slippage: selectedRoute?.estimate?.slippage || 1 },
          validations: { balance: true, fee: true, approve: true },
          step: 1,
          requestId: selectedRoute.requestId
        };

        response = await fetch(
          `https://api.rango.exchange/tx/create?apiKey=${rangoApiKey}`,
          {
            method: 'POST',
            headers: {
              accept: '*/*',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createTxPayload)
          }
        );
      }
      else if(symbiosisRoute) {
        // Existing Symbiosis implementation
        return {
          transaction: quoteData.symbiosis.tx,
          quote: {
            fromAddress: fromAddress
          }
        };
      }

      if(!response?.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setSwapDetails(data);
      return data;
    } catch (error) {
      console.error("Error calling API:", error);
      toast.error("Failed to prepare swap transaction");
      throw error;
    }
  };

  const executeSwap = async (transactionDetails, walletDetails) => {
    try {
      const txHash = await sendTransaction(config, {
        account: walletDetails, // wallet account address
        to: transactionDetails?.transaction?.to,
        data: transactionDetails?.transaction?.data,
        value: transactionDetails?.transaction?.value,
      });

      await waitForTransaction(txHash);
      setTransactionHash(txHash);
      const status = await getTransactionStatus(txHash);
      
      if (status) {
        return { success: true, txHash };
      } else {
        return { success: false, message: "Transaction failed." };
      }
      
    } catch (error) {
      console.error("Error executing swap:", error);
      return {success: false, message: error.message};
    }
  };

  const getTransactionStatus = async (hash) => {
    try {
      if (rubicRoute) {
        const response = await fetch(`https://api-v2.rubic.exchange/api/info/status?srcTxHash=${hash}`);
        const data = await response.json();
        const { status, destinationTxHash } = data;
        
        if (data.status === "NOT_FOUND") {
          setConfirm(true);
        } else if (data.status === "SUCCESS") {
          setDestinationTx(data);
          setConfirm(true);
          toast.success("Transaction on the destination chain was successful");
        }
        return status;
      } 
      else if (rangoRoute) {
        const response = await fetch(
          `https://api.rango.exchange/tx/check-status?apiKey=${rangoApiKey}`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              requestId: selectedRoute.requestId,
              txId: hash,
              step: 1
            })
          }
        );

        const data = await response.json();
        
        // Handle Rango specific status
        if (data.status === "SUCCESS") {
          setDestinationTx(data);
          setConfirm(true);
          toast.success("Rango transaction completed successfully");
        } else if (data.status === "FAILED") {
          toast.error("Rango transaction failed");
          setConfirm(true);
        } else if (data.status === "RUNNING") {
          toast.info("Transaction is being processed");
        }
        
        return data.status;
      }
      else if (symbiosisRoute) {
        // Add Symbiosis status check if needed
        setConfirm(true);
        return "SUCCESS"; // Default response for Symbiosis
      }
    } catch (error) {
      console.error("Error checking transaction status:", error);
      toast.error("Failed to check transaction status");
      return "FAILED";
    }
  };

  const handleClick = async () => {
    if (disabled || isLoading) return;
  
    setIsLoading(true);
    try {
      let approvalResult = null;
      let swapData = null;

      if (rubicRoute) {
        approvalResult = await approveToken(
          selectedRoute?.tokens?.from?.address,
          selectedRoute?.transaction?.approvalAddress,
          scaledAmount
        );
      } else if (symbiosisRoute) {
        approvalResult = await approveToken(
          tokenA.address,
          quoteData.symbiosis.approveTo,
          amountIn
        );
      } else if (rangoRoute) {
        // First get the swap data which includes approval info
        swapData = await swapTokens();
        
        if (swapData?.approve) {
          approvalResult = await approveToken(
            swapData.approve.token,
            swapData.approve.spender,
            swapData.approve.amount
          );
        } else {
          approvalResult = { success: true };
        }
      }

      if(approvalResult && approvalResult.success) {
        toast.success("Token Approved!");
        
        if (!swapData) {
          swapData = await swapTokens();
        }

        let swapResult;
        if (rangoRoute) {
          swapResult = await executeSwap({
            transaction: {
              to: swapData.transaction.to,
              data: swapData.transaction.data,
              value: swapData.transaction.value,
              from: fromAddress
            }
          }, fromAddress);
        } else {
          swapResult = await executeSwap(swapData, swapData?.quote?.fromAddress);
        }
        
        if (swapResult.success) {
          if (rangoRoute || rubicRoute) {
            // Start polling for transaction status
            const statusCheckInterval = setInterval(async () => {
              try {
                const status = await getTransactionStatus(swapResult.txHash);
                
                if (status === "SUCCESS") {
                  clearInterval(statusCheckInterval);
                } else if (status === "FAILED") {
                  clearInterval(statusCheckInterval);
                  throw new Error("Transaction failed on destination chain");
                }
                // For "RUNNING" status, continue polling
              } catch (error) {
                clearInterval(statusCheckInterval);
                console.error("Status check failed:", error);
                toast.error("Failed to check transaction status");
              }
            }, 5000); // Check every 5 seconds
          } else {
            // For Symbiosis or other providers
            toast.success("Transaction successful 🎉");
          }
        } else {
          throw new Error("API returned an error: " + (swapResult.message || "Unknown error"));
        }
      }
    } catch (error) {
      toast.error("Transaction failed ⚠️");
      console.error("Confirmation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split(".");
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to integer part

    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };

  // First, let's create helper functions to get the correct values based on route type
  const getDisplayValues = () => {
    if (rubicRoute) {
      return {
        outputAmount: parseFloat(selectedRoute?.estimate?.destinationTokenAmount).toFixed(6),
        minReceived: parseFloat(selectedRoute?.estimate?.destinationTokenMinAmount).toFixed(6),
        priceImpact: selectedRoute?.estimate?.priceImpact,
        slippage: selectedRoute?.estimate?.slippage,
        usdAmount: selectedRoute?.estimate?.destinationUsdAmount
      };
    } else if (rangoRoute) {
      // Get the last swap which contains the final destination values
      const lastSwap = selectedRoute?.swaps[selectedRoute.swaps.length - 1];
      return {
        outputAmount: selectedRoute?.outputAmount, // This is the final amount
        minReceived: parseFloat(lastSwap?.toAmount).toFixed(6), // Final destination amount
        priceImpact: selectedRoute?.priceImpactUsdPercent || "0",
        slippage: lastSwap?.recommendedSlippage?.slippage || "1", // Use recommended slippage if available
        usdAmount: (parseFloat(selectedRoute?.outputAmount || 0) * 
                    parseFloat(lastSwap?.to?.usdPrice || 0)).toFixed(2) // Calculate USD value
      };
    } else if (symbiosisRoute) {
      return {
        outputAmount: formatUnits(quoteData?.symbiosis?.tokenAmountOut?.amount || "0", quoteData?.symbiosis?.tokenAmountOut?.decimals || 18),
        minReceived: formatUnits(quoteData?.symbiosis?.tokenAmountOutMin?.amount || "0", quoteData?.symbiosis?.tokenAmountOutMin?.decimals || 18),
        priceImpact: quoteData?.symbiosis?.priceImpact || "0",
        slippage: "0.5", // Default slippage for Symbiosis
        usdAmount: quoteData?.symbiosis?.amountInUsd?.amount || "0"
      };
    }
    return {
      outputAmount: "0",
      minReceived: "0",
      priceImpact: "0",
      slippage: "0",
      usdAmount: "0"
    };
  };

  const {
    outputAmount,
    minReceived,
    priceImpact,
    slippage,
    usdAmount
  } = getDisplayValues();

  return (
    <>
      <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
        <div className="w-full flex justify-center my-auto items-center">
          <div
            ref={modalRef}
            className="md:max-w-[390px] w-full bg-black border border-white rounded-3xl relative py-6 px-6 mx-auto"
          >
            <svg
              onClick={onClose}
              className="absolute cursor-pointer right-8 top-8"
              width={18}
              height={19}
              viewBox="0 0 18 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
                stroke="#ffff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex gap-3 items-center">
              <svg
                className="cursor-pointer"
                onClick={onClose}
                width={14}
                height={11}
                viewBox="0 0 14 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M13.5 5.96344C13.5 6.37765 13.1642 6.71344 12.75 6.71344L0.75 6.71344C0.335786 6.71344 -5.08894e-08 6.37765 -3.27835e-08 5.96344C-1.46777e-08 5.54923 0.335786 5.21344 0.75 5.21344L12.75 5.21344C13.1642 5.21344 13.5 5.54923 13.5 5.96344Z"
                  fill="white"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.56689 1.14652C5.85978 1.43941 5.85978 1.91429 5.56689 2.20718L1.81065 5.96342L5.56689 9.71966C5.85978 10.0126 5.85978 10.4874 5.56689 10.7803C5.274 11.0732 4.79912 11.0732 4.50623 10.7803L0.219658 6.49375C-0.0732348 6.20086 -0.0732348 5.72598 0.219658 5.43309L4.50623 1.14652C4.79912 0.853626 5.274 0.853626 5.56689 1.14652Z"
                  fill="white"
                />
              </svg>
              <div className="text-white text-lg font-bold roboto leading-7">
                Select Amount
              </div>
            </div>
            <div className="mt-6">
              <div className="text-amber-600 text-sm font-normal roboto leading-normal">
                You Pay
              </div>
              <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
                {formatNumber(amountIn)} {tokenA.symbol}
                <img src={tokenA.image} alt="Token A" className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-6">
              <div className="text-amber-600 text-sm font-normal roboto leading-normal">
                You Receive
              </div>
              <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
                {formatNumber(outputAmount)} {tokenB.symbol}
                <img src={tokenB.image} alt="Token B" className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-6 text-gray-40 text-white text-sm font-normal robotoleading-normal">
              Output is estimated. You will receive at least{" "}
              {formatNumber(minReceived)} {tokenB.symbol} or the transaction will
              revert
            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-6">
              <div className="text-gray-400 text-sm font-normal roboto leading-normal">
               Price in $
              </div>
              <div className="flex gap-2 items-center">
                <div className="text-right text-white text-sm font-normal roboto leading-normal">
                  {usdAmount}{"$"}
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-gray-400 text-sm font-normal roboto leading-normal">
                  Minimum received
                </div>
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-sm font-normal roboto leading-normal">
                {formatNumber(minReceived)} {tokenB.symbol}
              </div>
            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-gray-400 text-sm font-normal roboto leading-normal">
                  Price Impact
                </div>
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-sm font-normal roboto leading-normal">
                {priceImpact} %
              </div>
            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-gray-400 text-sm font-normal roboto leading-normal">
                  Slippage
                </div>
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-sm font-normal roboto leading-normal">
                {slippage} %
              </div>
            </div>
            <button
              onClick={handleClick}
              disabled={disabled || isLoading}
              className="w-full rounded-xl px-4 py-4 bg-[#FF9900] flex gap-4 items-center mt-6 justify-center hover:bg-transparent border border-[#FF9900] hover:text-[#FF9900] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-white text-base font-bold roboto">
                    Processing...
                  </span>
                </div>
              ) : (
                <div className="text-white text-base font-bold roboto text-center leading-normal">
                  Proceed
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
      <div aria-label="Modal">
        {isConfirm && <Transcation onClose={() => setConfirm(false)} destinationTx={destinationTx}/>}
      </div>
    </>
  );
};

export default Amount;
