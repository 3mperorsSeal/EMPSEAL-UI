import { formatUnits } from "viem";

export const MIN_EXECUTION_BUFFER_PERCENT = 2;

export const clampSlippagePercent = (slippagePercent) => {
  const value = Number(slippagePercent);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

export const getEffectiveSlippagePercent = (slippagePercent) =>
  Math.max(MIN_EXECUTION_BUFFER_PERCENT, clampSlippagePercent(slippagePercent));

export const calculateMinOut = (quotedOut, slippagePercent) => {
  const amount = BigInt(quotedOut || 0);
  const bps = BigInt(Math.round(getEffectiveSlippagePercent(slippagePercent) * 100));
  console.log("Min Out", { amount, bps });
  console.log((amount * (10000n - bps)) / 10000n);
  return (amount * (10000n - bps)) / 10000n;
};



export const calculateMinReceived = (amountOut, slippagePercent) => {
  const output = Number(amountOut);
  if (!Number.isFinite(output) || output <= 0) return 0;
  return output * (1 - getEffectiveSlippagePercent(slippagePercent) / 100);
};

export const hasUsableRoute = (quote) =>
  !!quote &&
  Array.isArray(quote.amounts) &&
  quote.amounts.length >= 2 &&
  Array.isArray(quote.path) &&
  quote.path.length >= 2;

export const calculateRoutePriceImpact = ({
  amountIn,
  amountOut,
  spotAmountOut,
  outputDecimals,
}) => {
  if (spotAmountOut === null || spotAmountOut === undefined) return null;

  const decimals = Number(outputDecimals);
  if (!Number.isFinite(decimals) || decimals < 0) return null;

  const spotRate = Number(formatUnits(BigInt(spotAmountOut), decimals));
  const input = Number(amountIn);
  const output = Number(amountOut);

  if (
    !Number.isFinite(spotRate) ||
    !Number.isFinite(input) ||
    !Number.isFinite(output) ||
    spotRate <= 0 ||
    input <= 0 ||
    output <= 0
  ) {
    return null;
  }

  const executionRate = output / input;
  return (((executionRate - spotRate) / spotRate) * 100).toFixed(2);
};

export const calculateValuePriceImpact = ({
  inputValueUsd,
  outputValueUsd,
}) => {
  const input = Number(inputValueUsd);
  const output = Number(outputValueUsd);

  if (
    !Number.isFinite(input) ||
    !Number.isFinite(output) ||
    input <= 0 ||
    output <= 0
  ) {
    return null;
  }

  return (((output - input) / input) * 100).toFixed(2);
};

export const shouldSuppressImpact = ({
  amountIn,
  debouncedAmountIn,
  isQuoting,
  isQuoteExpired,
}) => {
  const current = String(amountIn ?? "").trim();
  const quoted = String(debouncedAmountIn ?? "").trim();
  return !!isQuoting || !!isQuoteExpired || current !== quoted;
};
