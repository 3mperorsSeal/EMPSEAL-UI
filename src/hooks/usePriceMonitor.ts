import { useState, useEffect, useCallback } from 'react';
import { useChainConfig } from './useChainConfig';

export interface PriceMonitorProps {
  initialQuote: string | null;
  currentQuote: string | null;
  enabled: boolean;
  onPriceChange: (newQuote: string, percentChange: number) => void;
  threshold?: number; // Optional threshold in percent
}

export const usePriceMonitor = ({
  initialQuote,
  currentQuote,
  enabled,
  onPriceChange,
  threshold = 0.5, // Default threshold of 0.5%
}: PriceMonitorProps) => {
  const [lastQuote, setLastQuote] = useState(initialQuote);
  const { blockTime } = useChainConfig();

  const checkPriceChange = useCallback(() => {
    if (!enabled || !initialQuote || !currentQuote) return;

    const initial = parseFloat(initialQuote);
    const current = parseFloat(currentQuote);

    if (isNaN(initial) || isNaN(current) || initial === 0) return;

    // Calculate percentage change
    const percentChange = ((current - initial) / initial) * 100;

    console.log(
      `[PriceMonitor] Checking... Initial: ${initial}, Current: ${current}, Change: ${percentChange.toFixed(4)}%, Threshold: ${threshold}%`
    );

    // If price has changed by more than the threshold
    if (Math.abs(percentChange) > threshold && currentQuote !== lastQuote) {
      console.log(`[PriceMonitor] Price change detected! Triggering alert.`);
      setLastQuote(currentQuote);
      onPriceChange(currentQuote, percentChange);
    }
  }, [initialQuote, currentQuote, enabled, lastQuote, onPriceChange, threshold]);

  useEffect(() => {
    if (!enabled || !blockTime) return;

    // Set interval based on block time (milliseconds)
    const interval = setInterval(checkPriceChange, blockTime * 1000);

    return () => clearInterval(interval);
  }, [enabled, blockTime, checkPriceChange]);

  return {
    hasChanged: currentQuote !== initialQuote,
    percentChange: initialQuote && currentQuote
      ? ((parseFloat(currentQuote) - parseFloat(initialQuote)) / parseFloat(initialQuote)) * 100
      : 0,
  };
};
