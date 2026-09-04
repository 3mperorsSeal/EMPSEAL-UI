// ─── RampPage — fiat on/off-ramp, multi-provider ──────────────────────────
//
// PURPOSE & HONEST SCOPE:
//   Buy crypto with fiat, or sell crypto to fiat, and have it delivered on
//   ANY chain in ANY asset — not just whatever the provider happens to settle.
//
//   The differentiator is the last mile. A single-provider ramp delivers one
//   asset on one chain to one address; the user who wants ARB on Arbitrum buys
//   USDC on Ethereum and is on their own from there. EmpX composes the
//   provider's settlement with its own aggregator + cross-chain mesh so the
//   user states an outcome and gets it in one flow.
//
//   PRODUCT MODEL (owner direction, 2026-08-04): v1 is MULTI-VENDOR. Several
//   licensed providers are surfaced side by side and the user picks — the same
//   offer-comparison pattern as the rail list on /cross-v2. Providers own fiat
//   rails, KYC and licensing; EmpX owns the on-chain leg. A later phase may add
//   an EmpX-operated wrapper over a settlement partner, which becomes one more
//   row in the offers list rather than a rewrite.
//
// ⚠ THIS PAGE IS A STYLED DEMO. Nothing is wired.
//   • No provider integration exists. Rates, fees, ETAs and coverage in
//     data/rampProviders.ts are UNVERIFIED PLACEHOLDERS, labelled as such here.
//   • The EmpX-side backend is scaffolded but unimplemented —
//     empx-cross-bridge/src/vps/services/ramp/ (RampOrchestrator methods throw).
//   • Design + open questions: docs/SPEC-003-fiat-ramp-wrapper.md. The
//     load-bearing one (§7 Q1) is whether a provider will settle to an
//     arbitrary user wallet, which is what keeps EmpX non-custodial.
//
// WIRING PATH WHEN GOING LIVE:
//   • provider quotes  → RampOrchestrator.quote()  (per-provider fan-out)
//   • crypto leg       → the ordinary QuoteEngine path, recipient = user wallet
//   • status           → RampIntent lifecycle + provider webhook/poller
//   • USD prices       → NativeUsdOracle (currently PRICE_USD_DEMO below)

import { useMemo, useState } from "react";
import {
  AccountModal,
  ChainPicker,
  DappNavbar,
  DappFooter,
  NetworkSelector,
  Pill,
  Toaster,
  TokenPicker,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type PickerChain,
  type PickerToken,
  type WalletOption,
} from "../components";
import EmpxRampWidget, { type RampFeeLine } from "../EmpxRampWidget";
import { WidgetKitKeyframes, type RailCardData } from "../widgetKit";
import { tokenLogoUrl } from "../data/logoRegistry";
import { useWalletConnection } from "../hooks/useWalletConnection";
import {
  RAMP_PROVIDERS,
  demoQuoteFor,
  providersFor,
  type RampDirection,
  type RampProviderEntry,
} from "../data/rampProviders";

// ⚠ DEMO PRICES — production reads NativeUsdOracle.tokenUsd(chainId, address).
const PRICE_USD_DEMO: Record<string, number> = {
  ETH: 3184, USDC: 1, USDT: 1, ARB: 1.19, WBTC: 68000, POL: 0.42, AVAX: 38,
};
const priceOf = (t: string) => PRICE_USD_DEMO[t.toUpperCase()] ?? 1;

// Destination chains the user can receive on. Mirrors the aggregator set so
// the page never offers a chain EmpX cannot actually swap on.
// SOURCE: empx-swap-sdk.getSupportedChainIds() (14 chains) — see
// empx-cross-bridge/src/vps/config/chains.ts hasAggregator:true.
const DEST_CHAINS: { id: number; name: string; color: string; ticker: string }[] = [
  { id: 42161, name: "Arbitrum",   color: "#28A0F0", ticker: "ETH"  },
  { id: 8453,  name: "Base",       color: "#0052FF", ticker: "ETH"  },
  { id: 10,    name: "Optimism",   color: "#FF0420", ticker: "ETH"  },
  { id: 137,   name: "Polygon",    color: "#7B3FE4", ticker: "POL"  },
  { id: 56,    name: "BSC",        color: "#F0B90B", ticker: "BNB"  },
  { id: 43114, name: "Avalanche",  color: "#E84142", ticker: "AVAX" },
  { id: 146,   name: "Sonic",      color: "#FE9A4D", ticker: "S"    },
  { id: 369,   name: "PulseChain", color: "#FF66C4", ticker: "PLS"  },
];

// Names for chains a provider may settle on but we do NOT offer as a
// destination (Ethereum being the notable one) — display only.
const SETTLEMENT_CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  ...Object.fromEntries(DEST_CHAINS.map((c) => [c.id, c.name])),
};
const settlementChainName = (id: number) => SETTLEMENT_CHAIN_NAMES[id] ?? `Chain ${id}`;

/**
 * Choose where the provider should settle.
 *
 * Prefer a chain EmpX has an aggregator on, because the settlement asset can
 * then be swapped into ANY token there in one hop. Ethereum is deliberately
 * deprioritised despite being every provider's default: it is
 * `hasAggregator: false` and absent from the swap SDK's 14 chains, so USDC
 * landing there cannot be swapped into an arbitrary token by EmpX at all — it
 * has to be bridged out first. See SPEC-003 §3 ("Ethereum is the obvious
 * default and the worst choice").
 */
function pickSettlementChainId(p: RampProviderEntry): number {
  const onAggregator = p.settlementChainIds.find((id) => DEST_CHAINS.some((c) => c.id === id));
  return onAggregator ?? p.settlementChainIds[0];
}

const TOKENS_BY_CHAIN: Record<number, string[]> = {
  42161: ["ETH", "USDC", "USDT", "ARB", "WBTC"],
  8453:  ["ETH", "USDC"],
  10:    ["ETH", "USDC", "USDT"],
  137:   ["POL", "USDC", "USDT"],
  56:    ["USDC", "USDT"],
  43114: ["AVAX", "USDC", "USDT"],
  146:   ["USDC"],
  369:   ["USDC"],
};

const FIAT_CURRENCIES: PickerToken[] = [
  { ticker: "USD", name: "US Dollar" },
  { ticker: "EUR", name: "Euro" },
  { ticker: "GBP", name: "British Pound" },
];

// Fiat has no token-logo CDN entry, so the identity row and the route node
// carry a flag glyph inside the same square 4px frame every other logo uses.
const FIAT_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
};

export default function RampPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect } = useWalletConnection();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [chainPickerOpen, setChainPickerOpen] = useState(false);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  // Sell leads — off-ramp has no monthly account fee and is profitable at small
  // tickets, while on-ramp's virtual account loses money below roughly $156/mo
  // per user (BRIDGE-XYZ-CAPABILITY-BRIEF §9-10). Owner-approved with the draft.
  const [direction, setDirection] = useState<RampDirection>("SELL");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [fiatAmount, setFiatAmount] = useState("500");
  const [cryptoAmountInput, setCryptoAmountInput] = useState("250");
  const [chainId, setChainId] = useState(42161);
  const [ticker, setTicker] = useState("ARB");
  const [pinnedProviderId, setPinnedProviderId] = useState<string | null>(null);

  const chain = useMemo(
    () => DEST_CHAINS.find((c) => c.id === chainId) ?? DEST_CHAINS[0],
    [chainId],
  );

  const eligible = useMemo(() => providersFor(direction), [direction]);

  // Offers, ranked by what the user actually receives. Same principle as the
  // rail offer list: every provider is shown, best wins, nothing is hidden.
  const offers = useMemo(() => {
    const fiat = Number(fiatAmount.replace(/,/g, "")) || 0;
    const notional =
      direction === "BUY"
        ? fiat
        : (Number(cryptoAmountInput.replace(/,/g, "")) || 0) * priceOf(ticker);

    return eligible
      .map((p) => {
        // The provider settles in whichever of its assets we can route from,
        // on the chain EmpX can do the most with (see pickSettlementChainId).
        const settlementAsset = p.settlementAssets[0];
        const settlementChainId = pickSettlementChainId(p);
        const { feeUsd } = demoQuoteFor(p, notional, priceOf(settlementAsset));
        const netUsd = Math.max(0, notional - feeUsd);
        return {
          provider: p,
          settlementAsset,
          settlementChainId,
          feeUsd,
          netUsd,
          // BUY: what the user ends up holding, after EmpX routes onward.
          // SELL: the fiat they receive.
          outAmount: direction === "BUY" ? netUsd / priceOf(ticker) : netUsd,
        };
      })
      .sort((a, b) => b.outAmount - a.outAmount);
  }, [eligible, direction, fiatAmount, cryptoAmountInput, ticker]);

  const bestOffer = offers[0];
  const selectedOffer =
    offers.find((o) => o.provider.id === pinnedProviderId) ?? bestOffer;

  const cryptoAmount =
    direction === "BUY"
      ? selectedOffer
        ? selectedOffer.outAmount.toFixed(selectedOffer.outAmount > 1 ? 4 : 6)
        : "0"
      : cryptoAmountInput;

  const fiatDisplay =
    direction === "BUY"
      ? fiatAmount
      : selectedOffer
        ? selectedOffer.outAmount.toFixed(2)
        : "0";

  // Fee split lives in the widget's disclosure — the surface itself shows one
  // Total cost, not competing per-venue figures.
  const rampFeeRows: RampFeeLine[] = selectedOffer
    ? [
        { label: `${selectedOffer.provider.name} fee`, value: `${selectedOffer.provider.feePctDemo}% · $${selectedOffer.feeUsd.toFixed(2)}`, accent: true },
        { label: "Settles as", value: `${selectedOffer.settlementAsset} on ${settlementChainName(selectedOffer.settlementChainId)}` },
        { label: "EmpX routing", value: "28 bps · settlement → target" },
        { label: "Payment methods", value: selectedOffer.provider.paymentMethods.join(" · ") },
        { label: "Integration status", value: selectedOffer.provider.status },
        {
          label: direction === "BUY" ? "You receive" : "You receive",
          value: direction === "BUY" ? `${cryptoAmount} ${ticker}` : `${fiatDisplay} ${fiatCurrency}`,
        },
        { label: "Figures", value: "Demo — not a live quote" },
      ]
    : [];

  // Providers rendered with the SAME device rails get on /cross-v2: output +
  // ETA on the card, fee never on a card. Best first, pinned wins.
  const providerCards: RailCardData[] = offers.map((o) => ({
    name: o.provider.name,
    mode: "B",
    outAmount:
      direction === "BUY"
        ? o.outAmount.toFixed(o.outAmount > 1 ? 3 : 5)
        : o.outAmount.toFixed(2),
    eta: `~${Math.round(o.provider.etaSecondsDemo / 60)}m`,
    tag:
      o.provider.id === pinnedProviderId
        ? "PINNED"
        : o.provider.id === bestOffer?.provider.id && !pinnedProviderId
          ? "BEST"
          : undefined,
    isActive: o.provider.id === selectedOffer?.provider.id,
  }));

  const chainPickerList: PickerChain[] = DEST_CHAINS.map((c) => ({
    id: c.id,
    name: c.name,
    ticker: c.ticker,
    color: c.color,
  }));

  const tokenPickerList: PickerToken[] = (TOKENS_BY_CHAIN[chainId] ?? ["USDC"]).map((t) => ({
    ticker: t,
    name: t,
    chainId,
    chainName: chain.name,
    chainColor: chain.color,
  }));


  const onSubmit = () => {
    if (walletState.status !== "connected") { setShowWalletModal(true); return; }
    toast.info("Provider integration not wired — see SPEC-003 for the design.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/ramp-v2"
        controls={
          <>
            <NetworkSelector
              name={chain.name}
              color={chain.color}
              onClick={() => setChainPickerOpen(true)}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      <WidgetKitKeyframes />

      {/* Single centred column, same measure as swap/cross/gas/bridge/multi —
          no page header, the widget carries its own "Ramp" eyebrow. The
          provider offer list moved INSIDE the widget as a RailCardStrip, so
          the old right-hand aside is gone entirely. */}
      <main
        style={{
          maxWidth: 480 + (isMobile ? 32 : 40),
          margin: "0 auto",
          padding: isMobile ? "24px 16px 40px" : "38px 20px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480, display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <Pill variant="ghost">Demo · providers not wired</Pill>
        </div>

        <EmpxRampWidget
          direction={direction}
          onDirectionChange={(d) => { setDirection(d); setPinnedProviderId(null); }}
          fiatCurrency={fiatCurrency}
          fiatCurrencyName={FIAT_CURRENCIES.find((f) => f.ticker === fiatCurrency)?.name}
          fiatRailsLabel={selectedOffer?.provider.paymentMethods.join(" · ")}
          fiatFlag={FIAT_FLAGS[fiatCurrency]}
          fiatAmount={fiatDisplay}
          onFiatAmountChange={setFiatAmount}
          onSelectCurrency={() => setCurrencyPickerOpen(true)}

          chain={chain}
          tokenTicker={ticker}
          tokenName={ticker}
          tokenLogoUrl={tokenLogoUrl(chainId, ticker) ?? undefined}
          cryptoAmount={cryptoAmount}
          onCryptoAmountChange={setCryptoAmountInput}
          onSelectToken={() => setTokenPickerOpen(true)}
          onSelectChain={() => setChainPickerOpen(true)}
          cryptoUsdValue={Number(cryptoAmount.replace(/,/g, "")) * priceOf(ticker)}
          balance={direction === "SELL" && walletState.status === "connected" ? "452.18" : undefined}
          onMax={direction === "SELL" ? () => setCryptoAmountInput("452.18") : undefined}

          providerName={selectedOffer?.provider.name}
          providerCount={eligible.length}
          providers={providerCards}
          onSelectProvider={(name) => {
            const hit = offers.find((o) => o.provider.name === name);
            if (!hit) return;
            setPinnedProviderId((cur) => (cur === hit.provider.id ? null : hit.provider.id));
          }}
          settlementTicker={selectedOffer?.settlementAsset}
          settlementChainName={selectedOffer ? settlementChainName(selectedOffer.settlementChainId) : undefined}
          settlementLogoUrl={
            selectedOffer
              ? tokenLogoUrl(selectedOffer.settlementChainId, selectedOffer.settlementAsset) ?? undefined
              : undefined
          }

          totalCostUSD={selectedOffer?.feeUsd}
          totalCostNote={selectedOffer ? `${selectedOffer.provider.feePctDemo}% · via ${selectedOffer.provider.name}` : undefined}
          estimatedTime={selectedOffer ? `~${Math.round(selectedOffer.provider.etaSecondsDemo / 60)} min` : undefined}
          etaNote="Demo figure · not a live quote"
          feeRows={rampFeeRows}
          noProvider={offers.length === 0}

          walletConnected={walletState.status === "connected"}
          onConnect={() => setShowWalletModal(true)}
          onSubmit={onSubmit}
          submitLabel={`Continue with ${selectedOffer?.provider.name ?? "provider"}`}
        />

      </main>

      <DappFooter />

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions as WalletOption[]}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
          toast.success("Wallet connected");
        }}
      />

      <ChainPicker
        open={chainPickerOpen}
        onClose={() => setChainPickerOpen(false)}
        chains={chainPickerList}
        selectedId={chainId}
        onSelect={(c) => {
          setChainId(c.id);
          const toks = TOKENS_BY_CHAIN[c.id] ?? ["USDC"];
          if (!toks.includes(ticker)) setTicker(toks[0]);
          setChainPickerOpen(false);
        }}
      />

      <TokenPicker
        open={tokenPickerOpen}
        onClose={() => setTokenPickerOpen(false)}
        tokens={tokenPickerList}
        onSelect={(t) => { setTicker(t.ticker); setTokenPickerOpen(false); }}
      />

      <TokenPicker
        open={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        tokens={FIAT_CURRENCIES}
        onSelect={(t) => { setFiatCurrency(t.ticker); setCurrencyPickerOpen(false); }}
      />

      {walletState.status === "connected" && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletState.address}
          providerName={walletState.providerName}
          chainName={chain.name}
          chainColor={chain.color}
          balanceUSD={51570.49}
          nativeBalance="12.45"
          nativeTicker={chain.ticker}
          explorerUrl={`https://arbiscan.io/address/${walletState.address}`}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setChainPickerOpen(true); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <Toaster />
    </div>
  );
}
