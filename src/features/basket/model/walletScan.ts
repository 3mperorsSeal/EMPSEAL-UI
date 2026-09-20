import type { WalletScanBalance, WalletScanResult } from "../api/contracts";
import {
  canonicalNativeTokenAddress,
  fromBaseUnitAmount,
  resolveBasketTokenByAddress,
} from "../utils/amounts";

export interface MappedWalletScanAsset {
  id: string;
  chainId: number;
  ticker: string;
  token: string;
  decimals: number;
  amount: string;
  amountBase: string;
  usd: number;
}

export function mapWalletScanBalances(
  result: WalletScanResult,
  options: {
    supportedChainIds?: readonly number[];
    usdPrice?: (ticker: string, chainId: number) => number;
  } = {},
): MappedWalletScanAsset[] {
  const allowed = options.supportedChainIds && options.supportedChainIds.length > 0
    ? new Set(options.supportedChainIds)
    : null;

  return result.balances.flatMap((balance, index) => {
    const mapped = mapOneBalance(balance, index, options.usdPrice);
    if (!mapped) return [];
    if (allowed && !allowed.has(mapped.chainId)) return [];
    return [mapped];
  });
}

function mapOneBalance(
  balance: WalletScanBalance,
  index: number,
  usdPrice?: (ticker: string, chainId: number) => number,
): MappedWalletScanAsset | null {
  if (!Number.isInteger(balance.chainId) || balance.chainId <= 0) return null;
  if (!Number.isInteger(balance.decimals) || balance.decimals < 0) return null;

  let amount: string;
  try {
    amount = fromBaseUnitAmount(balance.balance, balance.decimals);
  } catch {
    return null;
  }

  const resolved = resolveBasketTokenByAddress(balance.chainId, balance.token);
  const token = canonicalNativeTokenAddress(resolved?.address ?? balance.token);
  const ticker = resolved?.ticker
    ?? (typeof balance.symbol === "string" && balance.symbol.trim() ? balance.symbol.trim() : token.slice(0, 6));
  const decimals = resolved?.decimals ?? balance.decimals;
  const usd = typeof balance.balanceUsd === "number"
    ? balance.balanceUsd
    : Number(amount) * (usdPrice?.(ticker, balance.chainId) ?? 0);

  return {
    id: `${balance.chainId}:${token}:${index}`,
    chainId: balance.chainId,
    ticker,
    token,
    decimals,
    amount,
    amountBase: balance.balance.trim(),
    usd: Number.isFinite(usd) ? usd : 0,
  };
}
