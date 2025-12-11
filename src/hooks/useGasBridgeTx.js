import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'react-toastify';
import { useSearchTransaction } from './useGasBridgeAPI';
import { useEffect, useState } from 'react';

export const useGasBridgeTx = () => {
  const [txHash, setTxHash] = useState(null);
  const { data: txResponse, isPending: isSending, sendTransaction } = useSendTransaction();

  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txResponse?.hash,
  });

  // Start polling for backend status once the on-chain tx is confirmed
  const { data: backendStatus, isLoading: isPolling } = useSearchTransaction({
    hash: isConfirmed ? txResponse?.hash : null,
  });

  const executeBridge = (txData) => {
    toast.info('Waiting for signature...');
    sendTransaction({
      to: txData.to,
      value: txData.value,
      data: txData.data,
    });
  };

  useEffect(() => {
    if (isSending) {
      // This effect is primarily for toast notifications
    }
    if (txResponse?.hash) {
      setTxHash(txResponse.hash);
      toast.success('Transaction submitted! Waiting for confirmation...');
    }
  }, [isSending, txResponse]);

  useEffect(() => {
    if (isConfirming) {
      // Toast for confirming state
    }
    if (isConfirmed && receipt) {
      toast.success('Transaction confirmed on source chain! Verifying bridge...');
    }
  }, [isConfirming, isConfirmed, receipt]);

  useEffect(() => {
    if (isPolling) {
      // Toast for polling state
    }
    if (backendStatus?.deposit?.status === 'CONFIRMED') {
      toast.success('Bridge complete! Funds received on destination chain.');
    } else if (backendStatus?.deposit?.status === 'ERROR') {
      toast.error('An error occurred with the bridge transfer.');
    }
  }, [isPolling, backendStatus]);

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
