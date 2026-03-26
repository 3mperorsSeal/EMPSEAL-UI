import { SUPPORTED_CHAINS } from "./chains";

export const shouldUseQuoteHopFallback = (chainId?: number) => {
  if (!chainId) return false;
  return !!SUPPORTED_CHAINS[chainId]?.quoteHopFallback;
};

export const getQuoteHopFallbackPlan = (
  chainId: number | undefined,
  requestedMaxSteps: bigint,
) => {
  const chainConfig = chainId ? SUPPORTED_CHAINS[chainId] : undefined;
  const fallbackConfig = chainConfig?.quoteHopFallback;
  if (!fallbackConfig || requestedMaxSteps <= 1n) {
    return {
      enabled: false,
      secondStep: null as bigint | null,
      thirdStep: null as bigint | null,
    };
  }

  const strategy = fallbackConfig.strategy ?? "decrement_to_one";
  const minStep = BigInt(Math.max(1, Math.floor(fallbackConfig.minStep ?? 1)));

  if (strategy !== "decrement_to_one" || requestedMaxSteps <= minStep) {
    return {
      enabled: false,
      secondStep: null as bigint | null,
      thirdStep: null as bigint | null,
    };
  }

  const secondStep = requestedMaxSteps - 1n;
  const thirdStep = secondStep > minStep ? minStep : null;

  return {
    enabled: true,
    secondStep,
    thirdStep,
  };
};
