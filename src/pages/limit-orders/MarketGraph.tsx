import React, { useState } from "react";
import { OrderStrategy } from "./schema";

interface MarketTargetChartProps {
  strategy?: OrderStrategy;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  marketPrice?: string;
}

export default function MarketTargetChart({
  strategy = OrderStrategy.SELL,
  stopLossPrice,
  takeProfitPrice,
  marketPrice,
}: MarketTargetChartProps) {
  // Original points for SELL strategy (downward trend)
  const sellPoints = [
    [0, 80],
    [40, 70],
    [80, 60],
    [120, 65],
    [160, 55],
    [200, 45],
    [240, 40],
    [280, 42],
    [320, 35],
    [360, 30],
    [400, 32],
    [440, 25],
    [480, 20],
    [520, 30],
  ];

  // Flipped points for BUY strategy (upward trend)
  const buyPoints = [
    [0, 20],
    [40, 30],
    [80, 35],
    [120, 42],
    [160, 40],
    [200, 45],
    [240, 55],
    [280, 65],
    [320, 60],
    [360, 70],
    [400, 75],
    [440, 80],
    [480, 78],
    [520, 85],
  ];

  // Points for BRACKET strategy (shows both entry and exit levels)
  const bracketPoints = [
    [0, 100],
    [40, 90],
    [80, 100],
    [120, 80],
    [160, 70],
    [200, 60],
    [240, 55],
    [280, 42],
    [320, 60],
    [360, 40],
    [400, 55],
    [440, 45],
    [480, 52],
    [520, 50],
  ];

  const width = 520;
  const height = 120;

  const isSellStrategy = strategy === OrderStrategy.SELL;
  const isBuyStrategy = strategy === OrderStrategy.BUY;
  const isBracketStrategy = strategy === OrderStrategy.BRACKET;

  // Use appropriate points based on strategy
  let points = sellPoints;
  if (isBuyStrategy) points = buyPoints;
  if (isBracketStrategy) points = bracketPoints;

  const pathLine = `M ${points.map((p) => p.join(",")).join(" L ")}`;
  const pathArea = `${pathLine} L ${width},${height} L 0,${height} Z`;

  const [hoverX, setHoverX] = useState<number | null>(null);

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    setHoverX(x);
  };

  // Example prices - you can make these dynamic via props
  let currentPrice = "$ 0.673";
  let targetPrice = "$ 54";
  let stopLossDisplay = "$ 0.423";

  if (isBuyStrategy) {
    currentPrice = "$ 0.423";
    targetPrice = "$ 28";
  } else if (isBracketStrategy) {
    currentPrice = marketPrice
      ? `$ ${parseFloat(marketPrice).toFixed(3)}`
      : "$ 0.523";
    targetPrice = takeProfitPrice
      ? `$ ${parseFloat(takeProfitPrice).toFixed(3)}`
      : "$ 0.623";
    stopLossDisplay = stopLossPrice
      ? `$ ${parseFloat(stopLossPrice).toFixed(3)}`
      : "$ 0.423";
  }

  return (
    <div className="w-full text-white font-orbitron">
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[140px]">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF9900" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FF9900" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          <g className="reveal">
            <path d={pathArea} fill="url(#area)" stroke="none" />
            <path
              d={pathLine}
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>

          {isBracketStrategy && (
            <>
              {/* Stop Loss Line */}
              <line
                x1={0}
                x2={width}
                y1={height * 0.7} // Position for Stop Loss
                y2={height * 0.7}
                stroke="#FFE3BA"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.8"
              />
              {/* Take Profit Line */}
              <line
                x1={0}
                x2={width}
                y1={height * 0.3} // Position for Take Profit
                y2={height * 0.3}
                stroke="#FF9900"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.8"
              />
              {/* Entry/Market Price Line */}
              <line
                x1={0}
                x2={width}
                y1={height * 0.5} // Position for Entry Price
                y2={height * 0.5}
                stroke="#FFE3BA"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.8"
              />
            </>
          )}

          {hoverX !== null && (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={0}
              y2={height}
              stroke="white"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          )}

          <rect
            width={width}
            height={height}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverX(null)}
          />
        </svg>

        {/* Flipped labels based on strategy */}
        {isSellStrategy && (
          <>
            <div className="absolute left-2 top-6 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Market
            </div>
            <div className="absolute right-2 top-2 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Target
            </div>
          </>
        )}

        {isBuyStrategy && (
          <>
            <div className="absolute left-2 top-4 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Target
            </div>
            <div className="absolute right-2 top-10 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Market
            </div>
          </>
        )}

        {isBracketStrategy && (
          <>
            <div className="absolute left-2 bottom-10 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Stop Loss
            </div>
            <div className="absolute left-[40%] bottom-[50%] bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Entry
            </div>
            <div className="absolute right-2 top-6 bg-[#FFE3BA] text-black text-xs px-2 py-1 rounded-md">
              Take Profit
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between mt-1">
        {isBracketStrategy ? (
          // Bracket layout with three columns
          <>
            <div>
              <div className="text-2xl font-semibold text-[#FFD484]">
                {stopLossDisplay}
              </div>
              <div className="text-white text-sm">Stop Loss</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#FFD484]">
                {currentPrice}
              </div>
              <div className="text-white text-sm">Entry Price</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-[#FFD484]">
                {targetPrice}
              </div>
              <div className="text-white text-sm">Target Profit</div>
            </div>
          </>
        ) : (
          // Original layout for SELL and BUY
          <>
            <div>
              <div className="text-2xl font-semibold text-[#FFD484]">
                {currentPrice}
              </div>
              <div className="text-white text-sm">
                {isSellStrategy ? "Current Price" : "Target Price"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-[#FFD484]">
                {targetPrice}
              </div>
              <div className="text-white text-sm">
                {isSellStrategy ? "Target Price" : "Current Price"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
