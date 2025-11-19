import { useState, useCallback } from "react";
import { CreateOrderForm } from "./CreateOrderForm";
import { OrderList } from "./OrderList";
import { useAccount } from "wagmi";
import { toast } from "react-toastify";

const ToastContent = ({ message }) => (
  <div className="space-y-1">
    <p>{message.message}</p>
    {message.txHash && (
      <code className="block text-xs font-mono mt-1">
        Tx: {message.txHash.slice(0, 10)}...{message.txHash.slice(-8)}
      </code>
    )}
  </div>
);

export default function LimitOrder({ slippage }) {
  const { address, isConnected } = useAccount();

  const [newOrderCounter, setNewOrderCounter] = useState(0);

  const handleStatusMessage = useCallback(
    (message) => {
      switch (message.type) {
        case 'success':
          toast.success(<ToastContent message={message} />);
          break;
        case 'error':
          toast.error(<ToastContent message={message} />);
          break;
        case 'info':
          toast.info(<ToastContent message={message} />);
          break;
        case 'warning':
          toast.warn(<ToastContent message={message} />);
          break;
        default:
          toast(<ToastContent message={message} />);
      }
    },
    []
  );

  const handleOrderCreated = (details) => {
    window.dispatchEvent(
      new CustomEvent("gemini:orderCreated", { detail: details })
    );
    setNewOrderCounter((c) => c + 1);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 pt-8 pb-16 sm:px-6 bg-gray-100 text-black p-4 rounded-lg">
      <div className="space-y-8">
        {isConnected && address ? (
          <>
            <CreateOrderForm
              onStatusMessage={handleStatusMessage}
              onOrderCreated={handleOrderCreated}
              slippage={slippage}
            />
            <OrderList
              userAddress={address}
              onStatusMessage={handleStatusMessage}
              newOrderCounter={newOrderCounter}
            />
          </>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="mb-2 text-lg font-semibold">
              Welcome to Limit Orders
            </h2>
            <p className="text-sm text-muted-foreground">
              Please connect your wallet to start creating and managing limit orders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}