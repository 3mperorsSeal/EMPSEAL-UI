import { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { RefreshCw, ListOrdered } from "lucide-react";
import { OrderListItem } from "./OrderListItem";
import type { Order, StatusMessage } from "./schema";
import { getTokenInfo } from "./tokens";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { OrderStrategy } from "./schema";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";

const CONTRACT_ADDRESS = "0xCfA7562553e6BC466a60aA93079495A829221305";
const LOCAL_STORAGE_ORDERS_KEY_PREFIX = "limit-orders-";

const loadOrdersFromLocalStorage = (userAddress: string): Order[] => {
  try {
    const storedOrders = localStorage.getItem(
      `${LOCAL_STORAGE_ORDERS_KEY_PREFIX}${userAddress}`
    );
    return storedOrders ? JSON.parse(storedOrders) : [];
  } catch (error) {
    console.error("Failed to load orders from local storage:", error);
    return [];
  }
};

const saveOrdersToLocalStorage = (userAddress: string, orders: Order[]) => {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_ORDERS_KEY_PREFIX}${userAddress}`,
      JSON.stringify(orders)
    );
  } catch (error) {
    console.error("Failed to save orders to local storage:", error);
  }
};

interface OrderListProps {
  userAddress: string;
  onStatusMessage: (message: StatusMessage) => void;
  newOrderCounter: number;
}

export function OrderList({
  userAddress,
  onStatusMessage,
  newOrderCounter,
}: OrderListProps) {
  const { chainId } = useAccount();
  const isPulseChain = chainId === 369;

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const { data: writeContractHash, writeContract } = useWriteContract();

  useEffect(() => {
    setAllOrders(loadOrdersFromLocalStorage(userAddress));
  }, [userAddress]);

  const { data: activeOrderIds, refetch: refetchActiveOrderIds } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: LIMIT_ORDER_ABI,
      functionName: "getUserActiveOrders",
      args: [userAddress as `0x${string}`],
      query: { enabled: isPulseChain },
    });

  const {
    data: activeOrdersData,
    isLoading,
    refetch: refetchActiveOrders,
    error,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LIMIT_ORDER_ABI,
    functionName: "getOrders",
    args: [activeOrderIds || []],
    query: { enabled: isPulseChain && !!activeOrderIds },
  });

  const activeOrders = activeOrdersData
    ? (activeOrdersData as any[]).map((order: any) => {
        const tokenOutInfo = getTokenInfo(order.tokenOut);
        return {
          id: order.id.toString(),
          user: order.user,
          tokenIn: order.tokenIn,
          tokenOut: order.tokenOut,
          amountIn: order.amountIn.toString(),
          minAmountOut: order.minAmountOut.toString(),
          limitPrice: order.limitPrice.toString(),
          deadline: order.deadline.toString(),
          allowPartialFill: order.allowPartialFill,
          filledAmount: order.filledAmount.toString(),
          status:
            ["none", "active", "fulfilled", "cancelled", "expired"][
              order.status
            ] || "unknown",
          tokenOutDecimals: tokenOutInfo?.decimals || 18,
        };
      })
    : [];

  useEffect(() => {
    if (newOrderCounter > 0 && isPulseChain) {
      refetchActiveOrderIds();
    }
  }, [newOrderCounter, refetchActiveOrderIds, isPulseChain]);

  useEffect(() => {
    if (activeOrders && isPulseChain) {
      const mergedOrdersMap = new Map<string, Order>(
        allOrders.map((o) => [o.id, o])
      );

      // Handle shell order created when orderId was not immediately available
      const shellOrder = mergedOrdersMap.get("unknown");
      if (shellOrder) {
        const newActiveOrder = activeOrders.find(
          (ao) => !allOrders.some((o) => o.id === ao.id)
        );

        if (newActiveOrder) {
          const completeOrder = {
            ...newActiveOrder,
            txHash: shellOrder.txHash,
            strategy: shellOrder.strategy,
            fillMode: 0,
            maxSplits: 0,
            fillCount: 0,
          };
          mergedOrdersMap.set(newActiveOrder.id, completeOrder);
          mergedOrdersMap.delete("unknown");
        }
      }

      // Merge fresh data from contract into existing orders
      activeOrders.forEach((activeOrder) => {
        const existingOrder = mergedOrdersMap.get(activeOrder.id) || {};
        mergedOrdersMap.set(activeOrder.id, {
          fillMode: 0,
          maxSplits: 0,
          fillCount: 0,
          strategy: "GreedyOrderRouter" as OrderStrategy,
          ...existingOrder,
          ...activeOrder,
        });
      });

      // Update status for orders that are no longer active
      mergedOrdersMap.forEach((order, id) => {
        if (
          order.status === "active" &&
          !activeOrders.some((ao) => ao.id === id)
        ) {
          const deadline = parseInt(order.deadline) * 1000;
          const isExpired = deadline < Date.now();
          mergedOrdersMap.set(id, {
            ...order,
            status: isExpired ? "expired" : "inactive",
          });
        }
      });

      const newAllOrders = Array.from(mergedOrdersMap.values());
      if (JSON.stringify(newAllOrders) !== JSON.stringify(allOrders)) {
        setAllOrders(newAllOrders);
      }
    }
  }, [activeOrders, allOrders, isPulseChain]);

  useEffect(() => {
    if (userAddress && allOrders.length > 0) {
      saveOrdersToLocalStorage(userAddress, allOrders);
    }
  }, [allOrders, userAddress]);

  const handleRefresh = async () => {
    if (!isPulseChain) {
      onStatusMessage({
        type: "warning",
        message: "Please switch to PulseChain to refresh orders.",
      });
      return;
    }
    const result = await refetchActiveOrders();
    if (result.isSuccess) {
      onStatusMessage({
        type: "success",
        message: `Fetched ${
          (result.data as any[])?.length ?? 0
        } active order(s)`,
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: LIMIT_ORDER_ABI,
      functionName: "cancelOrder",
      args: [BigInt(orderId)],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: writeContractHash,
    });

  useEffect(() => {
    if (isConfirming) {
      onStatusMessage({
        type: "info",
        message: "Transaction confirming...",
        txHash: writeContractHash,
      });
    }
    if (isConfirmed) {
      onStatusMessage({
        type: "success",
        message: "Transaction successful!",
      });
      if (isPulseChain) refetchActiveOrders();
      setCancellingOrderId(null);
    }
  }, [
    isConfirming,
    isConfirmed,
    isPulseChain,
    onStatusMessage,
    refetchActiveOrders,
    writeContractHash,
  ]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setAllOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const handleRemoveOrder = (orderId: string) => {
    setAllOrders((prevOrders) =>
      prevOrders.filter((order) => order.id !== orderId)
    );
  };

  const addClientDataToOrder = useCallback(
    (details: { orderId: string; txHash: string; strategy: OrderStrategy }) => {
      setAllOrders((prevOrders) => {
        const orderExists = prevOrders.some((o) => o.id === details.orderId);
        if (orderExists) {
          return prevOrders.map((order) =>
            order.id === details.orderId
              ? { ...order, txHash: details.txHash, strategy: details.strategy }
              : order
          );
        }
        const newOrderShell: Order = {
          id: details.orderId,
          txHash: details.txHash,
          strategy: details.strategy,
          user: userAddress,
          tokenIn: "",
          tokenOut: "",
          amountIn: "0",
          minAmountOut: "0",
          limitPrice: "0",
          deadline: "0",
          status: "none",
          allowPartialFill: false,
          filledAmount: "0",
          tokenOutDecimals: 18,
          fillMode: 0,
          maxSplits: 0,
          fillCount: 0,
        };
        return [...prevOrders, newOrderShell];
      });
    },
    [userAddress]
  );

  useEffect(() => {
    const handleOrderCreated = (event: Event) => {
      const details = (event as CustomEvent).detail;
      if (details.orderId && details.txHash && details.strategy) {
        addClientDataToOrder(details);
      }
    };
    window.addEventListener("gemini:orderCreated", handleOrderCreated);
    return () => {
      window.removeEventListener("gemini:orderCreated", handleOrderCreated);
    };
  }, [addClientDataToOrder]);

  useEffect(() => {
    if (error && isPulseChain) {
      onStatusMessage({
        type: "error",
        message: (error as Error).message,
      });
    }
  }, [error, onStatusMessage, isPulseChain]);

  const filteredOrders = allOrders.filter((order) => {
    if (filterStatus === "All") return true;
    if (filterStatus === "Active") return order.status === "active";
    if (filterStatus === "Fulfilled") return order.status === "fulfilled";
    if (filterStatus === "Expired") return order.status === "expired";
    if (filterStatus === "Cancelled") return order.status === "cancelled";
    if (filterStatus === "Inactive") return order.status === "inactive";
    return false;
  });

  return (
    <Card data-testid="card-order-list">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <ListOrdered className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Your Orders</CardTitle>
              <CardDescription>
                View and manage your limit orders
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Fulfilled">Fulfilled</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isLoading && isPulseChain}
              data-testid="button-fetch-orders"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  isLoading && isPulseChain ? "animate-spin" : ""
                }`}
              />
              {isLoading && isPulseChain ? "Fetching..." : "Refresh"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isPulseChain ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Incorrect Network
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The limit order system is only available on PulseChain. Please
              switch your network to continue.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <RefreshCw className="mb-3 h-12 w-12 animate-spin text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              Loading orders...
            </p>
          </div>
        ) : allOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <ListOrdered className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              No Orders Found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your wallet and create some orders!
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="list-orders">
            {filteredOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                onCancel={handleCancelOrder}
                isCancelling={cancellingOrderId === order.id}
                userAddress={userAddress}
                onStatusChange={handleStatusChange}
                onRemove={handleRemoveOrder}
                tokenOutDecimals={order.tokenOutDecimals ?? 18}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
