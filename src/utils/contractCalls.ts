import { Address, erc20Abi, formatUnits, parseGwei } from "viem";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { toast } from "react-toastify";
import { SwapStatus, TradeInfo } from "./types/interface";
import { WPLS } from "./abis/wplsABI";
import { config } from "../Wagmi/config";
import { EMPSEALROUTERABI } from "./abis/empSealRouterAbi";
import Tokens from "../pages/tokenList.json";
import { convertToBigInt } from "./utils";
import { getChainConfig } from "./getChainConfig";
import { useChainId } from 'wagmi';

const getCurrentChainConfig = (chainId: number) => {
  return getChainConfig(chainId);
};
const EMPTY_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

const checkAllowance = async (chainId: number, tokenInAddress: string, userAddress: Address) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result = await readContract(config, {
      abi: erc20Abi,
      address: tokenInAddress as Address,
      functionName: "allowance",
      args: [userAddress, routerAddress],
    });
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const callApprove = async (chainId: number, tokenInAddress: string, amountIn: bigint) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result = await writeContract(config, {
      abi: erc20Abi,
      address: tokenInAddress as Address,
      functionName: "approve",
      args: [routerAddress, amountIn],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapFromEth = async (chainId: number, tradeInfo: TradeInfo, userAddress: Address) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result = await writeContract(config, {
      abi: EMPSEALROUTERABI,
      address: routerAddress,
      functionName: "swapNoSplitFromPLS",
      args: [
        {
          adapters: tradeInfo.adapters,
          amountIn: tradeInfo.amountIn,
          amountOut: tradeInfo.amountOut,
          // amountOut: BigInt("0"),
          path: tradeInfo.path,
        },
        userAddress,
        BigInt("24"),
      ],
      value: tradeInfo.amountIn,
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    console.log("error", e);
    throw e;
  }
};

const swapToEth = async (chainId: number,tradeInfo: TradeInfo, userAddress: Address) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result = await writeContract(config, {
      abi: EMPSEALROUTERABI,
      address: routerAddress,
      functionName: "swapNoSplitToPLS",
      args: [
        {
          adapters: tradeInfo.adapters,
          amountIn: tradeInfo.amountIn,
          amountOut: tradeInfo.amountOut,
          path: tradeInfo.path,
        },
        userAddress,
        BigInt("24"),
      ],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapNoSplitToEth = async (chainId: number, tradeInfo: TradeInfo, userAddress: Address) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
    let result = await writeContract(config, {
      abi: WPLS,
      address: wethAddress,
      functionName: "withdraw",
      args: [tradeInfo.amountIn],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapNoSplitFromEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address
) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
    let result = await writeContract(config, {
      abi: WPLS,
      address: wethAddress,
      functionName: "deposit",
      args: [],
      value: tradeInfo.amountIn,
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swap = async (chainId: number,tradeInfo: TradeInfo, userAddress: Address) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result = await writeContract(config, {
      abi: EMPSEALROUTERABI,
      address: routerAddress,
      functionName: "swapNoSplit",
      args: [
        {
          adapters: tradeInfo.adapters,
          amountIn: tradeInfo.amountIn,
          // amountOut: BigInt("0"),
          amountOut: tradeInfo.amountOut,
          // amounts[tradeInfo.amounts.length - 1],
          // amountOut: (tradeInfo.amountOut * BigInt(10)) / BigInt(10000),
          path: tradeInfo.path,
        },
        userAddress,
        BigInt("24"),
      ],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const waitForTransaction = async (hash: Address) => {
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
  } catch (e: any) {
    throw e;
  }
};

export const swapTokens = async (
  setStatus: (status: SwapStatus) => void,
  setSwapHash: (hash: string) => void,
  tokenInAddress: Address,
  tokenOutAddress: Address,
  userAddress: Address,
  tradeInfo: TradeInfo,
  chainId: number,
) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
    setStatus("LOADING");
    const defaultResponse = {
      success: false,
      data: EMPTY_ADDRESS,
    };
    let swapResponse = defaultResponse;
    if (tokenInAddress !== EMPTY_ADDRESS) {
      const approvedTokens = await checkAllowance(chainId, tokenInAddress, userAddress);
      if (approvedTokens.data < tradeInfo.amountIn) {
        try {
          setStatus("APPROVING");
          await callApprove(chainId, tokenInAddress, tradeInfo.amountIn);
          setStatus("APPROVED");
          toast.success("Token approved! Ready to confirm the transaction.");
        } catch (error) {
          setStatus("ERROR");
          console.error("Approval failed:", error);
          toast.error("Token approval failed");
          throw error; // Rethrow if necessary for further error handling
        }
      }
    }
    // setStatus("APPROVED");
    setStatus("SWAPPING");
    if (tokenInAddress === EMPTY_ADDRESS && tokenOutAddress === wethAddress) {
      swapResponse = await swapNoSplitFromEth(chainId, tradeInfo, userAddress);
    } else if (
      tokenInAddress === wethAddress &&
      tokenOutAddress === EMPTY_ADDRESS
    ) {
      swapResponse = await swapNoSplitToEth(chainId, tradeInfo, userAddress);
    } else if (tokenInAddress === EMPTY_ADDRESS) {
      swapResponse = await swapFromEth(chainId, tradeInfo, userAddress);
    } else if (tokenOutAddress === EMPTY_ADDRESS) {
      swapResponse = await swapToEth(chainId, tradeInfo, userAddress);
    } else {
      swapResponse = await swap(chainId, tradeInfo, userAddress);
      toast.success("Transaction Successful");
    }
    setStatus("SWAPPED");
    setSwapHash(swapResponse.data);
    return swapResponse;
  } catch (error) {
    if (
      error.message &&
      error.message.includes("EmpsealRouter: Insufficient output amount")
    ) {
      setStatus("ERROR");
      toast.error("Output amount too high. Adjust slippage and retry.");
    } else {
      setStatus("ERROR");
      toast.error("Transaction rejected");
    }
    throw error;
  }
};
