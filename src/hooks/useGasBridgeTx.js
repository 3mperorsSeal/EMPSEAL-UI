import { useSendTransaction, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi';
import { toast } from '../utils/toastHelper';
import { useSearchTransaction } from './useGasBridgeAPI';
import { useEffect, useState } from 'react';
import { useGasBridgeStore } from '../redux/store/gasBridgeStore';

export const useGasBridgeTx = () => {
  const [txHash, setTxHash] = useState(null);
  // Chain the tx was sent on, so the receipt is looked up on the right chain
  // even if the user changes the source chain afterwards.
  const [txChainId, setTxChainId] = useState(null);

  const { sendTransactionAsync, isPending: isSending } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { chainId } = useAccount();
  const { fromChainId } = useGasBridgeStore();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: txChainId,
  });

  // Start polling for backend status once the on-chain tx is confirmed
  const { data: backendStatus, isLoading: isPolling } = useSearchTransaction({
    hash: isConfirmed ? txHash : null,
  });

  const executeBridge = async (txData) => {
    try {
      // 1. Check Chain
      if (chainId !== fromChainId) {
        try {
          await switchChainAsync({ chainId: fromChainId });
        } catch (switchError) {
          console.error("Failed to switch chain:", switchError);
          toast.error("Please switch your wallet to the source chain and try again.");
          return;
        }
      }

      // 2. Send Transaction
      // Passing chainId makes the send fail if the wallet isn't on the source chain,
      // instead of sending the deposit on whatever chain the wallet is on.
      toast.info('Waiting for signature...');
      const hash = await sendTransactionAsync({
        chainId: fromChainId,
        to: txData.to,
        value: txData.value,
        data: txData.data,
      });

      setTxChainId(fromChainId);
      setTxHash(hash);
      toast.success('Transaction submitted! Waiting for confirmation...');

    } catch (error) {
      console.error("Bridge Execution Failed:", error);
      if (error.message?.includes('User rejected')) {
         toast.error("Transaction rejected by user.");
      } else {
         toast.error(error.shortMessage || error.message || 'Transaction failed');
      }
    }
  };

  useEffect(() => {
    if (isConfirmed && receipt) {
      toast.success('Transaction confirmed on source chain! Verifying bridge...');
    }
  }, [isConfirmed, receipt]);

  useEffect(() => {
    // Reverted txs surface here as an error rather than a receipt
    if (receiptError) {
      console.error("Bridge transaction failed:", receiptError);
      toast.error(
        `Transaction failed on the source chain: ${receiptError.shortMessage || receiptError.message || 'unknown reason'}`,
      );
    }
  }, [receiptError]);

  useEffect(() => {
    if (backendStatus?.deposit?.status === 'CONFIRMED') {
      toast.success('Bridge complete! Funds received on destination chain.');
    } else if (backendStatus?.deposit?.status === 'ERROR') {
      toast.error('An error occurred with the bridge transfer.');
    }
  }, [backendStatus]);

  return {
    executeBridge,
    isSending,
    isConfirming,
    isConfirmed,
    isPolling,
    txHash,
    backendStatus,
  };
};
