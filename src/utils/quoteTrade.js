import { calculateMinOut } from "./swapMath.js";

export const QUOTE_TTL_MS = 30_000;

export const buildTradeInfoFromQuote = ({
  quoteData,
  selectedTokenB,
  tokenList,
  selectedSlippage,
  now = Date.now(),
}) => {
  if (
    !quoteData ||
    !Array.isArray(quoteData.amounts) ||
    quoteData.amounts.length < 2 ||
    !Array.isArray(quoteData.path) ||
    quoteData.path.length < 2 ||
    !selectedTokenB
  ) {
    return null;
  }

  const quotedOut = quoteData.amounts[quoteData.amounts.length - 1];
  const minOut = calculateMinOut(quotedOut, selectedSlippage);

  return {
    amountIn: quoteData.amounts[0],
    amountOut: minOut,
    amounts: quoteData.amounts,
    path: quoteData.path,
    pathTokens: quoteData.path.map(
      (pathAddress) =>
        tokenList.find(
          (token) =>
            token?.address?.toLowerCase() === pathAddress?.toLowerCase(),
        ) || tokenList[0],
    ),
    adapters: quoteData.adapters ?? [],
    timestamp: now,
    validUntil: now + QUOTE_TTL_MS,
  };
};
