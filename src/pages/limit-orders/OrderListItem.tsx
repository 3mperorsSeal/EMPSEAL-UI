// import { useState, useEffect } from "react";
// import { Button } from "../../components/ui/button";
// import { Badge } from "../../components/ui/badge";
// import { X, Trash2, ExternalLink, ChevronDown } from "lucide-react";
// import type { Order } from "./schema";
// import { getTokenInfo } from "./tokens";
// import { OrderStrategy } from "./schema";
// import { useReadContract, useWatchContractEvent } from "wagmi";
// import { formatUnits } from "viem";
// import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";
// const TEST_PROGRESS = true;

// const CONTRACT_ADDRESS = "0x80C12068B84d26c5359653Ba5527746bb999b8c6";

// interface OrderListItemProps {
//   order: Order;
//   onCancel: (orderId: string) => void;
//   isCancelling: boolean;
//   userAddress: string;
//   onStatusChange: (orderId: string, newStatus: string) => void;
//   onRemove: (orderId: string) => void;
//   tokenOutDecimals: number;
// }

// export function OrderListItem({
//   order,
//   onCancel,
//   isCancelling,
//   userAddress,
//   onStatusChange,
//   onRemove,
//   tokenOutDecimals,
// }: OrderListItemProps) {
//   const [fillTxHashes, setFillTxHashes] = useState<string[]>([]);
//   const tokenInInfo = getTokenInfo(order.tokenIn);
//   const tokenOutInfo = getTokenInfo(order.tokenOut);

//   const validOrderId =
//     order.id && !isNaN(Number(order.id)) && Number(order.id) >= 0;

//   const { data: orderProgressData } = useReadContract(
//     validOrderId
//       ? {
//           address: CONTRACT_ADDRESS,
//           abi: LIMIT_ORDER_ABI,
//           functionName: "getOrderProgress",
//           args: [BigInt(order.id)],
//         }
//       : undefined,
//   );
//   const orderProgress = orderProgressData
//     ? {
//         filled: (orderProgressData as any)[0].toString(),
//         total: (orderProgressData as any)[1].toString(),
//         fills: (orderProgressData as any)[2],
//         maxFills: (orderProgressData as any)[3],
//         percentComplete: (orderProgressData as any)[4],
//       }
//     : null;

//   useEffect(() => {
//     if (
//       orderProgress &&
//       orderProgress.percentComplete === 100 &&
//       order.status !== "fulfilled"
//     ) {
//       onStatusChange(order.id, "fulfilled");
//     }
//   }, [orderProgress, order.id, order.status, onStatusChange]);

//   useWatchContractEvent({
//     address: CONTRACT_ADDRESS,
//     abi: LIMIT_ORDER_ABI,
//     eventName: "OrderPartiallyFilled",
//     onLogs(logs) {
//       logs.forEach((log) => {
//         if (log.args.orderId?.toString() === order.id) {
//           setFillTxHashes((prev) => [
//             ...new Set([...prev, log.transactionHash]),
//           ]);
//         }
//       });
//     },
//   });

//   useWatchContractEvent({
//     address: CONTRACT_ADDRESS,
//     abi: LIMIT_ORDER_ABI,
//     eventName: "OrderFullyFilled",
//     onLogs(logs) {
//       logs.forEach((log) => {
//         if (log.args.orderId?.toString() === order.id) {
//           setFillTxHashes((prev) => [
//             ...new Set([...prev, log.transactionHash]),
//           ]);
//         }
//       });
//     },
//   });

//   const truncateAddress = (address: string) => {
//     return `${address.slice(0, 6)}...${address.slice(-4)}`;
//   };

//   const formatAmount = (amount: string, decimals: number = 18) => {
//     try {
//       return parseFloat(formatUnits(BigInt(amount), decimals)).toFixed(8);
//     } catch {
//       return amount;
//     }
//   };

//   const getExplorerUrl = (txHash: string) => {
//     return `https://otter.pulsechain.com/tx/${txHash}`;
//   };

//   const formatExpiryDate = (deadline: string) => {
//     const deadlineDate = new Date(parseInt(deadline) * 1000);
//     const options: Intl.DateTimeFormatOptions = {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: false,
//     };
//     return deadlineDate.toLocaleString(undefined, options);
//   };

//   const statusColorClass =
//     {
//       active: "bg-a text-white border border-[#2CC90D]",
//       fulfilled: "bg-f white border border-[#0069FF]",
//       expired: "bg-[#DA1F0E4D] text-white border border-[#FF220F]",
//       cancelled: "bg-[#DA1F0E4D] text-white border border-[#FF220F]",
//     }[order.status] || "bg-gray-600/20 text-gray-300 border border-gray-500";
//   //

//   // Helper of progress bar
//   const progressPercent = orderProgress
//     ? Number(orderProgress.percentComplete)
//     : 0;

//   const isStarted = orderProgress && Number(orderProgress.fills) > 0;
//   const isCompleted = progressPercent === 100;

//   return (
//     <div
//       data-testid={`card-order-${order.id}`}
//       className=" text-white w-full font-orbitron"
//     >
//       {/* Header Row */}
//       <div className="grid lg:grid-cols-8 grid-cols-4 gap-8 items-center w-full">
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Order ID
//         </div>
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Status{" "}
//         </div>
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Limit Price
//         </div>
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Token In/Amount
//         </div>
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Token Out/Amount
//         </div>
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Progress
//         </div>
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Date/Time
//         </div>
//         <div className="font-orbitron font-semibold text-base text-[#FF9900]">
//           Action
//         </div>
//       </div>
//       {/* <div className="flex justify-between items-center flex-wrap gap-4"> */}
//       {/* Left Section */}
//       {/* <div className="flex items-center gap-4"> */}
//       {/* <div
//             data-testid={`badge-order-id-${order.id}`}
//             className="text-base font-bold"
//           >
//             Order #{order.id}
//           </div> */}
//       {/* <div
//             className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColorClass}`}
//           >
//             {order.strategy === OrderStrategy.BUY ? "Buy Order" : "Sell Order"}
//           </div> */}
//       {/* </div> */}
//       {/* <div className="flex justify-end gap-3">
//           <div
//             className={`px-3 py-1 rounded-full text-xs font-semibold flex justify-center items-center ${statusColorClass}`}
//           >
//             {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
//           </div>
//         </div> */}
//       {/* </div> */}

//       <div className="mt-3 pt-3 border-t border-[#D4D4D4]/60 grid lg:grid-cols-8 grid-cols-4 gap-8 items-center w-full text-sm justify-between">
//         {/* Token Info */}
//         <div
//           data-testid={`badge-order-id-${order.id}`}
//           className="text-base font-bold"
//         >
//           Order #{order.id}
//         </div>
//         <div className="flex justify-end gap-3">
//           <div
//             className={`px-3 py-2 rounded text-xs font-bold flex justify-center items-center ${statusColorClass}`}
//           >
//             {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
//           </div>
//         </div>
//         <div>
//           {/* <span className="text-[#FF9900]">Limit Price: </span> */}
//           <span data-testid={`text-price-${order.id}`}>
//             {formatAmount(order.limitPrice)}
//           </span>
//         </div>
//         <div>
//           {/* <span className="text-[#FF9900]">Token In: </span> */}
//           <span data-testid={`text-token-in-${order.id}`}>
//             {truncateAddress(order.tokenIn)}
//           </span>
//           <div>
//             {/* <span className="text-[#FF9900]">Amount In: </span> */}
//             <span data-testid={`text-amount-in-${order.id}`}>
//               {formatAmount(order.amountIn, tokenInInfo?.decimals)}
//             </span>
//           </div>
//         </div>
//         <div>
//           {/* <span className="text-[#FF9900]">Token Out: </span> */}
//           <span data-testid={`text-token-out-${order.id}`}>
//             {truncateAddress(order.tokenOut)}
//           </span>
//           <div>
//             {/* <span className="text-[#FF9900]">Min Out: </span> */}
//             <span data-testid={`text-min-out-${order.id}`}>
//               {formatAmount(order.minAmountOut, tokenOutInfo?.decimals)}
//             </span>
//           </div>
//         </div>
//         {/* Partial Fill */}
//         <div>
//           {orderProgress && (
//             <div className="w-full">
//               <div className="w-full h-[24px] rounded-md bg-[#2a2a2a] overflow-hidden">
//                 <div
//                   className={`h-[24px] transition-all duration-500 w-full ${
//                     isStarted ? "bg-[#14FF23]" : "bg-[#214D24]"
//                   }`}
//                   style={{
//                     width: `${progressPercent}%`,
//                   }}
//                 />
//               </div>
//             </div>
//           )}
//         </div>
//         <div>
//           {/* <span className="text-[#FF9900]">Expiry Date: </span> */}
//           <span data-testid={`text-deadline-${order.id}`}>
//             {formatExpiryDate(order.deadline)}
//           </span>
//         </div>
//         {/* Pricing Info */}
//         {/* <div className="space-y-2">
//           <div>
//             <span className="text-[#FF9900]">Execution Tx: </span>
//             {fillTxHashes.length > 0 ? (
//               <div className="flex flex-col ml-1">
//                 {fillTxHashes.map((txHash, index) => (
//                   <a
//                     key={index}
//                     href={getExplorerUrl(txHash)}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="underline rigamesh"
//                   >
//                     {truncateAddress(txHash)}
//                     <ExternalLink className="ml-1 h-3 w-3" />
//                   </a>
//                 ))}
//               </div>
//             ) : (
//               <span>
//                 {order.status === "active" || order.status === "none"
//                   ? "Awaiting execution..."
//                   : "N/A"}
//               </span>
//             )}
//           </div>
//         </div> */}

//         <div className="ml-auto">
//           {order.status === "active" || order.status === "none" ? (
//             <Button
//               // variant="destructive"
//               size="sm"
//               onClick={() => onCancel(order.id)}
//               disabled={isCancelling || order.id === "unknown"}
//               className="!border-0"
//               data-testid={`button-cancel-${order.id}`}
//             >
//               <Trash2 className="mr-1 h-8 w-8 text-[#ff9900]" />
//             </Button>
//           ) : (
//             <Button
//               // variant="destructive"
//               size="sm"
//               onClick={() => onRemove(order.id)}
//               className="!border-0"
//             >
//               <Trash2 className="mr-1 h-8 w-8 text-[#ff9900]" />
//             </Button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Trash2 } from "lucide-react";
import type { Order } from "./schema";
import { getTokenInfo } from "./tokens";
import { OrderStrategy } from "./schema";
import { useReadContract, useWatchContractEvent } from "wagmi";
import { formatUnits } from "viem";
import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";
import { TokenLogo } from "../../components/TokenLogo";

const CONTRACT_ADDRESS = "0x80C12068B84d26c5359653Ba5527746bb999b8c6";

interface OrderListItemProps {
  order: Order;
  onCancel: (orderId: string) => void;
  isCancelling: boolean;
  userAddress: string;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onRemove: (orderId: string) => void;
  tokenOutDecimals: number;
}

export function OrderListItem({
  order,
  onCancel,
  isCancelling,
  userAddress,
  onStatusChange,
  onRemove,
  tokenOutDecimals,
}: OrderListItemProps) {
  const [fillTxHashes, setFillTxHashes] = useState<string[]>([]);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const tokenInInfo = getTokenInfo(order.tokenIn);
  const tokenOutInfo = getTokenInfo(order.tokenOut);

  const validOrderId =
    order.id && !isNaN(Number(order.id)) && Number(order.id) >= 0;

  const { data: orderProgressData } = useReadContract(
    validOrderId
      ? {
          address: CONTRACT_ADDRESS,
          abi: LIMIT_ORDER_ABI,
          functionName: "getOrderProgress",
          args: [BigInt(order.id)],
        }
      : undefined,
  );
  const orderProgress = orderProgressData
    ? {
        filled: (orderProgressData as any)[0].toString(),
        total: (orderProgressData as any)[1].toString(),
        fills: (orderProgressData as any)[2],
        maxFills: (orderProgressData as any)[3],
        percentComplete: (orderProgressData as any)[4],
      }
    : null;

  useEffect(() => {
    if (
      orderProgress &&
      orderProgress.percentComplete === 100 &&
      order.status !== "fulfilled"
    ) {
      onStatusChange(order.id, "fulfilled");
    }
  }, [orderProgress, order.id, order.status, onStatusChange]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: LIMIT_ORDER_ABI,
    eventName: "OrderPartiallyFilled",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.orderId?.toString() === order.id) {
          setFillTxHashes((prev) => [
            ...new Set([...prev, log.transactionHash]),
          ]);
        }
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: LIMIT_ORDER_ABI,
    eventName: "OrderFullyFilled",
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.orderId?.toString() === order.id) {
          setFillTxHashes((prev) => [
            ...new Set([...prev, log.transactionHash]),
          ]);
        }
      });
    },
  });

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format amount with K/M/B suffixes
  const formatLargeAmount = (amount: string, decimals: number = 18) => {
    try {
      const value = parseFloat(formatUnits(BigInt(amount), decimals));

      if (value >= 1_000_000_000) {
        return (value / 1_000_000_000).toFixed(2) + "B";
      }
      if (value >= 1_000_000) {
        return (value / 1_000_000).toFixed(2) + "M";
      }
      if (value >= 1_000) {
        return (value / 1_000).toFixed(2) + "K";
      }
      return value.toFixed(2);
    } catch {
      return amount;
    }
  };

  // Format price with 2 decimals
  const formatPrice = (amount: string, decimals: number = 18) => {
    try {
      const value = parseFloat(formatUnits(BigInt(amount), decimals));
      return value.toFixed(2);
    } catch {
      return amount;
    }
  };

  // Get full amount for hover
  const getFullAmount = (amount: string, decimals: number = 18) => {
    try {
      return formatUnits(BigInt(amount), decimals);
    } catch {
      return amount;
    }
  };

  const formatExpiryDate = (deadline: string) => {
    const deadlineDate = new Date(parseInt(deadline) * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return deadlineDate.toLocaleString(undefined, options);
  };

  const statusColorClass =
    {
      active: "bg-a text-white border border-[#2CC90D]",
      fulfilled: "bg-f white border border-[#0069FF]",
      expired: "bg-[#DA1F0E4D] text-white border border-[#FF220F]",
      cancelled: "bg-[#DA1F0E4D] text-white border border-[#FF220F]",
    }[order.status] || "bg-gray-600/20 text-gray-300 border border-gray-500";

  const progressPercent = orderProgress
    ? Number(orderProgress.percentComplete)
    : 0;

  const isStarted = orderProgress && Number(orderProgress.fills) > 0;

  // Get strategy display name
  const getStrategyName = () => {
    switch (order.strategy) {
      case OrderStrategy.SELL:
        return "Sell High";
      case OrderStrategy.BUY:
        return "Buy Low";
      case OrderStrategy.BRACKET:
        return "Bracket";
      default:
        return "Order";
    }
  };

  return (
    <div
      data-testid={`card-order-${order.id}`}
      className="text-white w-full font-orbitron"
    >
      <div className="md:grid hidden lg:grid-cols-8 grid-cols-8 gap-8 items-center w-full">
        <div className="font-semibold text-base text-[#FF9900]">Order ID</div>
        <div className="font-semibold text-base text-[#FF9900]">Status</div>
        <div className="font-semibold text-base text-[#FF9900]">
          Limit Price
        </div>
        <div className="font-semibold text-base text-[#FF9900]">
          Token In/Amount
        </div>
        <div className="font-semibold text-base text-[#FF9900]">
          Token Out/Amount
        </div>
        <div className="font-semibold text-base text-[#FF9900]">Progress</div>
        <div className="font-semibold text-base text-[#FF9900]">Date/Time</div>
        <div className="font-semibold text-base text-[#FF9900]">Action</div>
      </div>

      <div className="md:mt-3 md:pt-3 md:border-t md:border-b-0 border-b border-[#D4D4D4]/60 grid lg:grid-cols-8 md:grid-cols-4 grid-cols-2 whitespace-nowrap md:gap-4 gap-1 items-center w-full text-sm justify-between">
        {/* Order ID */}
        <div
          data-testid={`badge-order-id-${order.id}`}
          className="text-base font-bold relative"
          onMouseEnter={() => setHoveredCell("id")}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <span className="md:hidden">{getStrategyName()}</span> # {order.id}
          {hoveredCell === "id" && (
            <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
              Full Order ID: {getStrategyName()} {order.id}
            </div>
          )}
        </div>

        {/* Strategy Type */}
        {/* <div className="text-sm">
          {getStrategyName()}
        </div> */}

        {/* Status */}
        <div className="flex gap-3">
          <div
            className={`md:px-3 px-1.5 md:py-2 py-1.5 rounded text-xs font-bold flex justify-center items-center ${statusColorClass}`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </div>
        </div>

        {/* Limit Price */}
        <div
          className="relative cursor-help"
          onMouseEnter={() => setHoveredCell("price")}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <span data-testid={`text-price-${order.id}`}>
            {formatPrice(order.limitPrice)}
          </span>
          {hoveredCell === "price" && (
            <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
              Full Price: {getFullAmount(order.limitPrice)}
            </div>
          )}
        </div>

        {/* Token In */}
        <div>
          <div className="flex items-center gap-2">
            <TokenLogo
              chainId={369}
              tokenAddress={order.tokenIn}
              symbol={tokenInInfo?.symbol}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs text-gray-400">
              {tokenInInfo?.symbol || truncateAddress(order.tokenIn)}
            </span>
          </div>
          <div
            className="relative cursor-help mt-1"
            onMouseEnter={() => setHoveredCell("amountIn")}
            onMouseLeave={() => setHoveredCell(null)}
          >
            <span
              data-testid={`text-amount-in-${order.id}`}
              className="text-sm font-semibold"
            >
              {formatLargeAmount(order.amountIn, tokenInInfo?.decimals)}
            </span>
            {hoveredCell === "amountIn" && (
              <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
                Full Amount:{" "}
                {getFullAmount(order.amountIn, tokenInInfo?.decimals)}
              </div>
            )}
          </div>
        </div>

        {/* Token Out */}
        <div>
          <div className="flex items-center gap-2">
            <TokenLogo
              chainId={369}
              tokenAddress={order.tokenOut}
              symbol={tokenOutInfo?.symbol}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs text-gray-400">
              {tokenOutInfo?.symbol || truncateAddress(order.tokenOut)}
            </span>
          </div>
          <div
            className="relative cursor-help mt-1"
            onMouseEnter={() => setHoveredCell("amountOut")}
            onMouseLeave={() => setHoveredCell(null)}
          >
            <span
              data-testid={`text-min-out-${order.id}`}
              className="text-sm font-semibold"
            >
              {formatLargeAmount(order.minAmountOut, tokenOutInfo?.decimals)}
            </span>
            {hoveredCell === "amountOut" && (
              <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
                Full Amount:{" "}
                {getFullAmount(order.minAmountOut, tokenOutInfo?.decimals)}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div>
          {orderProgress && (
            <div className="w-full">
              <div className="w-full h-[24px] rounded-md bg-[#2a2a2a] overflow-hidden">
                <div
                  className={`h-[24px] transition-all duration-500 w-full ${
                    isStarted ? "bg-[#14FF23]" : "bg-[#214D24]"
                  }`}
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Date/Time */}
        <div
          className="relative cursor-help"
          onMouseEnter={() => setHoveredCell("date")}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <span
            data-testid={`text-deadline-${order.id}`}
            className="text-sm w-full"
          >
            {formatExpiryDate(order.deadline)}
          </span>
          {hoveredCell === "date" && (
            <div className="absolute z-50 bg-black border border-[#FF9900] p-2 rounded text-xs whitespace-nowrap">
              Expiry:{" "}
              {new Date(parseInt(order.deadline) * 1000).toLocaleString()}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="ml-auto">
          {order.status === "active" || order.status === "none" ? (
            <Button
              size="sm"
              onClick={() => onCancel(order.id)}
              disabled={isCancelling || order.id === "unknown"}
              className="!border-0 hover:bg-[#FF9900]/20"
              data-testid={`button-cancel-${order.id}`}
            >
              <Trash2 className="md:h-10 md:w-10 w-5 h-5 !text-2xl text-[#ff9900]" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onRemove(order.id)}
              className="!border-0 hover:bg-[#FF9900]/20"
            >
              <Trash2 className="md:h-10 md:w-10 w-5 h-5 !text-2xl text-[#ff9900]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
