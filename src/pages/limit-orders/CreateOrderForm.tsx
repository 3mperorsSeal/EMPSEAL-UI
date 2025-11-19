import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrderSchema,
  type CreateOrderInput,
  type StatusMessage,
  OrderStrategy,
} from "./schema";
import { EMPSEAL_ROUTER_ABI } from "../../utils/abis/dexRouterABI";
import { LIMIT_ORDER_ABI } from "../../utils/abis/limitOrderEscrowABI";
import { TOKENS, getTokenInfo } from "./tokens";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  Loader2,
  FileText,
  Coins,
  ArrowLeftRight,
  ArrowLeft,
  ArrowUpDown,
  Settings,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { useAccount, useBalance } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../../Wagmi/config";
import {
  isAddress,
  parseUnits,
  formatUnits,
  zeroAddress,
  decodeEventLog,
  erc20Abi,
} from "viem";
import { formatErrorMessage } from "../../utils/utils";

const ROUTER_ADDRESS = "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52";
const CONTRACT_ADDRESS = "0xCfA7562553e6BC466a60aA93079495A829221305";

interface CreateOrderFormProps {
  onStatusMessage: (message: StatusMessage) => void;
  onOrderCreated: (details: {
    orderId: string;
    txHash: string;
    strategy: OrderStrategy;
  }) => void;
  slippage: number;
}

export function CreateOrderForm({
  onStatusMessage,
  onOrderCreated,
  slippage,
}: CreateOrderFormProps) {
  const { address: userAddress } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [tokenInMode, setTokenInMode] = useState<"select" | "custom">("select");
  const [tokenOutMode, setTokenOutMode] = useState<"select" | "custom">(
    "select"
  );
  const [customTokenIn, setCustomTokenIn] = useState<any>(null);
  const [customTokenOut, setCustomTokenOut] = useState<any>(null);
  const [partialFillEnabled, setPartialFillEnabled] = useState(false);
  const [fillMode, setFillMode] = useState(1); // 1: Split3, 2: Split5, 3: Split10, 4: Flexible
  const [marketPrice, setMarketPrice] = useState<string | null>(null);
  const [quoteReversed, setQuoteReversed] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [limitPriceError, setLimitPriceError] = useState<string | null>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema) as any,
    defaultValues: {
      tokenIn: "",
      tokenOut: "",
      amountIn: "",
      minAmountOut: "",
      limitPrice: "",
      deadline: "",
      strategy: OrderStrategy.SELL,
    },
  });

  const amountIn = form.watch("amountIn");
  const selectedTokenIn = form.watch("tokenIn");
  const selectedTokenOut = form.watch("tokenOut");
  const currentLimitPrice = form.watch("limitPrice");
  const currentStrategy = form.watch("strategy");
  const tokenInInfo =
    customTokenIn && customTokenIn.address === selectedTokenIn
      ? customTokenIn
      : getTokenInfo(selectedTokenIn);
  const tokenOutInfo =
    customTokenOut && customTokenOut.address === selectedTokenOut
      ? customTokenOut
      : getTokenInfo(selectedTokenOut);

  const { data: tokenInBalanceData } = useBalance({
    address: userAddress,
    token:
      selectedTokenIn && isAddress(selectedTokenIn)
        ? selectedTokenIn
        : undefined,
  });
  const tokenInBalance = tokenInBalanceData?.formatted;

  const { data: tokenOutBalanceData } = useBalance({
    address: userAddress,
    token:
      selectedTokenOut && isAddress(selectedTokenOut)
        ? selectedTokenOut
        : undefined,
  });
  const tokenOutBalance = tokenOutBalanceData?.formatted;

  useEffect(() => {
    const isTokenInWhitelisted = !!getTokenInfo(selectedTokenIn);
    const isTokenOutWhitelisted = !!getTokenInfo(selectedTokenOut);

    if (
      tokenInMode === "custom" &&
      tokenOutMode === "custom" &&
      !isTokenInWhitelisted &&
      !isTokenOutWhitelisted &&
      isAddress(selectedTokenIn) &&
      isAddress(selectedTokenOut)
    ) {
      setTradeError(
        "Warning: Trading between two custom tokens is not supported."
      );
    } else {
      setTradeError(null);
    }
  }, [selectedTokenIn, selectedTokenOut, tokenInMode, tokenOutMode]);

  useEffect(() => {
    const fetchTokenData = async (
      tokenAddress: string,
      setCustomToken: (token: any) => void
    ) => {
      try {
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/pulsechain/tokens/${tokenAddress}`
        );
        const data = await response.json();
        if (data.data.attributes) {
          const { name, symbol, decimals } = data.data.attributes;
          setCustomToken({
            address: tokenAddress,
            name,
            symbol,
            decimals,
          });
        }
      } catch (error) {
        console.error("Failed to fetch custom token data:", error);
        setCustomToken(null);
      }
    };

    if (tokenInMode === "custom" && isAddress(selectedTokenIn)) {
      fetchTokenData(selectedTokenIn, setCustomTokenIn);
    } else {
      setCustomTokenIn(null);
    }

    if (tokenOutMode === "custom" && isAddress(selectedTokenOut)) {
      fetchTokenData(selectedTokenOut, setCustomTokenOut);
    } else {
      setCustomTokenOut(null);
    }
  }, [selectedTokenIn, selectedTokenOut, tokenInMode, tokenOutMode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (
        amountIn &&
        !isNaN(parseFloat(amountIn)) &&
        currentLimitPrice &&
        !isNaN(parseFloat(currentLimitPrice))
      ) {
        const amountInFloat = parseFloat(amountIn);
        const limitPriceFloat = parseFloat(currentLimitPrice);
        const expectedAmountOut = amountInFloat * limitPriceFloat;

        // Apply slippage
        const numericSlippage = typeof slippage === "number" ? slippage : 0.5;
        const slippageAdjustedAmount =
          expectedAmountOut * (1 - numericSlippage / 100);

        form.setValue("minAmountOut", slippageAdjustedAmount.toFixed(6));
      }
    }, 500); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [amountIn, currentLimitPrice, slippage, form]);

  useEffect(() => {
    setQuoteReversed(false);
    const fetchMarketPrice = async () => {
      if (selectedTokenIn && selectedTokenOut) {
        try {
          const response = await fetch(
            `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${selectedTokenIn},${selectedTokenOut}`
          );
          const data = await response.json();

          const tokenInPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenIn.toLowerCase()]
          );
          const tokenOutPrice = parseFloat(
            data.data.attributes.token_prices[selectedTokenOut.toLowerCase()]
          );

          if (tokenInPrice && tokenOutPrice) {
            const price = tokenInPrice / tokenOutPrice;
            setMarketPrice(price.toFixed(8));
          } else {
            setMarketPrice(null);
          }
        } catch (error) {
          console.error(
            "Failed to fetch market price from GeckoTerminal:",
            error
          );
          setMarketPrice(null);
        }
      } else {
        setMarketPrice(null);
      }
    };

    fetchMarketPrice();
  }, [selectedTokenIn, selectedTokenOut]);

  useEffect(() => {
    if (currentLimitPrice && marketPrice && currentStrategy) {
      const limit = parseFloat(currentLimitPrice);
      const market = parseFloat(marketPrice);

      if (isNaN(limit) || isNaN(market)) {
        setLimitPriceError(null);
        return;
      }

      if (currentStrategy === OrderStrategy.SELL) {
        // For Sell orders, limit price should be greater than market price
        if (limit < market) {
          setLimitPriceError(
            "For Exit Strategy (Sell), limit price should be greater than market price."
          );
        } else {
          setLimitPriceError(null);
        }
      } else if (currentStrategy === OrderStrategy.BUY) {
        // For Buy orders, limit price should be less than market price
        if (limit > market) {
          setLimitPriceError(
            "For Accumulation Strategy (Buy), limit price should be less than market price."
          );
        } else {
          setLimitPriceError(null);
        }
      }
    } else {
      setLimitPriceError(null);
    }
  }, [currentLimitPrice, marketPrice, currentStrategy]);

  const handleTokenInSelect = (value: string) => {
    if (value === "custom") {
      setTokenInMode("custom");
      form.setValue("tokenIn", "");
    } else {
      setTokenInMode("select");
      form.setValue("tokenIn", value);
    }
  };

  const handleTokenOutSelect = (value: string) => {
    if (value === "custom") {
      setTokenOutMode("custom");
      form.setValue("tokenOut", "");
    } else {
      setTokenOutMode("select");
      form.setValue("tokenOut", value);
    }
  };

  const handleSwapTokens = () => {
    const tokenIn = form.getValues("tokenIn");
    const tokenOut = form.getValues("tokenOut");
    const amountIn = form.getValues("amountIn");
    const minAmountOut = form.getValues("minAmountOut");

    form.setValue("tokenIn", tokenOut);
    form.setValue("tokenOut", tokenIn);
    form.setValue("amountIn", minAmountOut);
    form.setValue("minAmountOut", amountIn);

    const currentTokenInMode = tokenInMode;
    setTokenInMode(tokenOutMode);
    setTokenOutMode(currentTokenInMode);

    const currentCustomTokenIn = customTokenIn;
    setCustomTokenIn(customTokenOut);
    setCustomTokenOut(currentCustomTokenIn);
  };

  const handleApproveTokens = async () => {
    const tokenIn = form.getValues("tokenIn");
    const amountIn = form.getValues("amountIn");

    if (!tokenIn || !amountIn) {
      onStatusMessage({
        type: "error",
        message: "Please enter Token In address and Amount In",
      });
      return;
    }

    setIsApproving(true);
    onStatusMessage({ type: "info", message: "Requesting approval..." });

    try {
      const decimals = tokenInInfo?.decimals || 18;
      const amount = parseUnits(amountIn, decimals);

      const hash = await writeContract(config, {
        address: tokenIn as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, amount],
      });

      onStatusMessage({
        type: "info",
        message: "Approval transaction sent, waiting for confirmation...",
        txHash: hash,
      });

      await waitForTransactionReceipt(config, { hash });

      onStatusMessage({
        type: "success",
        message: "Tokens approved successfully!",
      });
    } catch (error: any) {
      console.error("Approval failed:", error);
      onStatusMessage({
        type: "error",
        message: formatErrorMessage(error, "Failed to approve tokens"),
      });
    } finally {
      setIsApproving(false);
    }
  };

  const onSubmit = async (data: CreateOrderInput) => {
    setIsCreating(true);
    onStatusMessage({ type: "info", message: "Creating order..." });

    try {
      const amountIn = parseUnits(data.amountIn, tokenInInfo?.decimals || 18);
      const minAmountOut = parseUnits(
        data.minAmountOut,
        tokenOutInfo?.decimals || 18
      );
      const limitPrice = parseUnits(data.limitPrice, 18);
      const deadline = BigInt(
        Math.floor(new Date(data.deadline).getTime() / 1000)
      );
      const mode = partialFillEnabled ? fillMode : 0;
      const orderType = data.strategy === OrderStrategy.SELL ? 0 : 1; // 0 for SELL, 1 for BUY

      const hash = await writeContract(config, {
        address: CONTRACT_ADDRESS,
        abi: LIMIT_ORDER_ABI,
        functionName: "createOrder",
        args: [
          data.tokenIn as `0x${string}`,
          data.tokenOut as `0x${string}`,
          amountIn,
          minAmountOut,
          limitPrice,
          deadline,
          mode,
          orderType,
        ],
      });

      onStatusMessage({
        type: "info",
        message: "Order creation transaction sent, waiting for confirmation...",
        txHash: hash,
      });

      const receipt = await waitForTransactionReceipt(config, { hash });

      let newOrderId = "new";
      try {
        const event = receipt.logs
          .map((log) => {
            try {
              return decodeEventLog({
                abi: LIMIT_ORDER_ABI,
                ...log,
              });
            } catch {
              return null;
            }
          })
          .find((decoded) => decoded?.eventName === "OrderCreated");

        if (event && event.args) {
          newOrderId = (event.args as any).orderId.toString();
        }
      } catch (e) {
        console.error("Error decoding event log", e);
      }

      onStatusMessage({
        type: "success",
        message: "Order created successfully!",
      });

      form.reset();
      setTokenInMode("select");
      setTokenOutMode("select");
      onOrderCreated({
        orderId: newOrderId,
        txHash: hash,
        strategy: data.strategy,
      });
    } catch (error: any) {
      console.error("Order creation failed:", error);
      onStatusMessage({
        type: "error",
        message: formatErrorMessage(error, "Failed to create order"),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const now = new Date();
  const threeMonthsFromNow = new Date(new Date().setMonth(now.getMonth() + 3));
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  const minDeadline = new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
  const maxDeadline = new Date(threeMonthsFromNow.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);

  return (
    <Card data-testid="card-create-order">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          {/* <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Create Limit Order</CardTitle>
              <CardDescription>
                Set up a new limit order for token exchange
              </CardDescription>
            </div>
          </div> */}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Strategy Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Order Strategy
            </Label>
            <RadioGroup
              onValueChange={(value: OrderStrategy) =>
                form.setValue("strategy", value)
              }
              defaultValue={form.getValues("strategy") || OrderStrategy.SELL}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={OrderStrategy.SELL} id="strategy-sell" />
                <Label htmlFor="strategy-sell">Exit Strategy (Sell)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={OrderStrategy.BUY} id="strategy-buy" />
                <Label htmlFor="strategy-buy">
                  Accumulation Strategy (Buy)
                </Label>
              </div>
            </RadioGroup>
            {form.formState.errors.strategy && (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.strategy.message}
              </p>
            )}
          </div>

          {/* Token In Address and Amount */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="tokenIn"
                className="text-sm font-medium mb-2 block"
              >
                Token In Address
              </Label>
              {tokenInMode === "select" ? (
                <div className="space-y-2">
                  <Select
                    onValueChange={handleTokenInSelect}
                    value={selectedTokenIn || undefined}
                    disabled={
                      tokenOutMode === "custom" &&
                      !getTokenInfo(selectedTokenOut) &&
                      isAddress(selectedTokenOut)
                    }
                  >
                    <SelectTrigger
                      className="h-12"
                      data-testid="select-token-in"
                    >
                      <SelectValue placeholder="Select a token or use custom address" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TOKENS).map(([address, token]) => (
                        <SelectItem key={address} value={address}>
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            <span className="font-medium">{token.symbol}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <span className="font-medium text-primary">
                          ✏️ Custom Address...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-between">
                    {tokenInBalance && (
                      <p className="text-xs text-muted-foreground text-right">
                        Balance: {parseFloat(tokenInBalance).toFixed(4)}{" "}
                        {tokenInInfo?.symbol || "Tokens"}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    {...form.register("tokenIn")}
                    placeholder="0x..."
                    className="h-12 font-mono"
                    data-testid="input-token-in-custom"
                    disabled={
                      tokenOutMode === "custom" &&
                      !getTokenInfo(selectedTokenOut) &&
                      isAddress(selectedTokenOut)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTokenInMode("select");
                      form.setValue("tokenIn", "");
                    }}
                    className="text-xs"
                  >
                    ← Back to token list
                  </Button>
                  {customTokenIn && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {customTokenIn.symbol}
                    </p>
                  )}
                  {tokenInBalance && (
                    <p className="text-xs text-muted-foreground text-right">
                      Balance: {parseFloat(tokenInBalance).toFixed(4)}{" "}
                      {customTokenIn?.symbol || "Tokens"}
                    </p>
                  )}
                </div>
              )}
              {form.formState.errors.tokenIn && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.tokenIn.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="amountIn"
                className="text-sm font-medium mb-2 block"
              >
                Token In Amount
              </Label>
              <Input
                id="amountIn"
                {...form.register("amountIn")}
                placeholder="0.0"
                type="text"
                className="h-12 text-right"
                data-testid="input-amount-in"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {tokenInInfo
                  ? `In ${tokenInInfo.symbol} (${tokenInInfo.decimals} decimals)`
                  : "Decimal value (e.g., 1.5 for 1.5 tokens)"}
              </p>
              {form.formState.errors.amountIn && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.amountIn.message}
                </p>
              )}
            </div>
          </div>

          {/* Swap Button and Limit Price */}
          <div className="relative my-2 flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSwapTokens}
              className="z-10 h-10 w-10 rounded-full border bg-background flex-shrink-0"
              data-testid="button-swap-tokens"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="sr-only">Swap tokens</span>
            </Button>
            <div className="flex-grow">
              <Label
                htmlFor="limitPrice"
                className="text-sm font-medium mb-2 block"
              >
                Limit Price
              </Label>
              <Input
                id="limitPrice"
                {...form.register("limitPrice")}
                placeholder="0.0"
                type="text"
                className="h-12 text-right"
                data-testid="input-limit-price"
              />
              <div className="mt-1 text-xs text-muted-foreground flex items-center justify-left">
                <span>
                  {marketPrice && tokenInInfo && tokenOutInfo
                    ? quoteReversed
                      ? `Market: 1 ${tokenOutInfo.symbol} ≈ ${(
                          1 / parseFloat(marketPrice)
                        ).toFixed(8)} ${tokenInInfo.symbol}`
                      : `Market: 1 ${tokenInInfo.symbol} ≈ ${marketPrice} ${tokenOutInfo.symbol}`
                    : "Price per token (decimal value)"}
                </span>
                {marketPrice && tokenInInfo && tokenOutInfo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1"
                    onClick={() => setQuoteReversed((prev) => !prev)}
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {form.formState.errors.limitPrice && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.limitPrice.message}
                </p>
              )}
              {limitPriceError && (
                <p className="mt-1 text-sm text-destructive">
                  {limitPriceError}
                </p>
              )}
            </div>
          </div>

          {/* Token Out Address and Amount */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="tokenOut"
                className="text-sm font-medium mb-2 block"
              >
                Token Out Address
              </Label>
              {tokenOutMode === "select" ? (
                <div className="space-y-2">
                  <Select
                    onValueChange={handleTokenOutSelect}
                    value={selectedTokenOut || undefined}
                    disabled={
                      tokenInMode === "custom" &&
                      !getTokenInfo(selectedTokenIn) &&
                      isAddress(selectedTokenIn)
                    }
                  >
                    <SelectTrigger
                      className="h-12"
                      data-testid="select-token-out"
                    >
                      <SelectValue placeholder="Select a token or use custom address" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TOKENS).map(([address, token]) => (
                        <SelectItem key={address} value={address}>
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            <span className="font-medium">{token.symbol}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <span className="font-medium text-primary">
                          ✏️ Custom Address...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-between">
                    {tokenOutBalance && (
                      <p className="text-xs text-muted-foreground text-right">
                        Balance: {parseFloat(tokenOutBalance).toFixed(4)}{" "}
                        {tokenOutInfo?.symbol || "Tokens"}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    {...form.register("tokenOut")}
                    placeholder="0x..."
                    className="h-12 font-mono"
                    data-testid="input-token-out-custom"
                    disabled={
                      tokenInMode === "custom" &&
                      !getTokenInfo(selectedTokenIn) &&
                      isAddress(selectedTokenIn)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTokenOutMode("select");
                      form.setValue("tokenOut", "");
                    }}
                    className="text-xs"
                  >
                    ← Back to token list
                  </Button>
                  {customTokenOut && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {customTokenOut.symbol}
                    </p>
                  )}
                  {tokenOutBalance && (
                    <p className="text-xs text-muted-foreground text-right">
                      Balance: {parseFloat(tokenOutBalance).toFixed(4)}{" "}
                      {customTokenOut?.symbol || "Tokens"}
                    </p>
                  )}
                </div>
              )}
              {form.formState.errors.tokenOut && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.tokenOut.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="minAmountOut"
                className="text-sm font-medium mb-2 block"
              >
                Token Out Minimum Amount
              </Label>
              <Input
                id="minAmountOut"
                {...form.register("minAmountOut")}
                placeholder="0.0"
                type="text"
                className="h-12 text-right"
                data-testid="input-min-amount-out"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {tokenOutInfo
                  ? `In ${tokenOutInfo.symbol} (${tokenOutInfo.decimals} decimals)`
                  : "Decimal value (e.g., 2.0 for 2 tokens)"}
              </p>
              {form.formState.errors.minAmountOut && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.minAmountOut.message}
                </p>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <Label
              htmlFor="deadline"
              className="text-sm font-medium mb-2 block"
            >
              Deadline
            </Label>
            <Input
              id="deadline"
              {...form.register("deadline")}
              type="datetime-local"
              className="h-12"
              data-testid="input-deadline"
              min={minDeadline}
              max={maxDeadline}
            />
            {form.formState.errors.deadline && (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.deadline.message}
              </p>
            )}
          </div>

          {/* Partial Fill Section */}
          <div
            className="space-y-4 rounded-md border p-4"
            data-testid="partial-fill-section"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="partial-fill-switch" className="font-medium">
                Enable Partial Fill
              </Label>
              <Switch
                id="partial-fill-switch"
                checked={partialFillEnabled}
                onCheckedChange={setPartialFillEnabled}
                data-testid="switch-partial-fill"
              />
            </div>
            {partialFillEnabled && (
              <div className="space-y-3 pt-2">
                <Label htmlFor="fill-mode-slider">Fill Mode</Label>
                <Slider
                  id="fill-mode-slider"
                  value={[fillMode]}
                  onValueChange={(value) => setFillMode(value[0])}
                  min={1}
                  max={3}
                  step={1}
                  data-testid="slider-fill-mode"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Split 3</span>
                  <span>Split 5</span>
                  <span>Split 10</span>
                </div>
                <p className="text-sm text-center font-medium text-primary pt-2">
                  Selected: {["Split 3", "Split 5", "Split 10"][fillMode - 1]}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {tradeError && (
            <div
              className="my-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center"
              data-testid="trade-error-message"
            >
              <p className="text-sm font-medium text-destructive">
                {tradeError}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={handleApproveTokens}
              disabled={isApproving || isCreating || !!tradeError}
              className="h-12 flex-1"
              data-testid="button-approve-tokens"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Tokens"
              )}
            </Button>
            <Button
              type="submit"
              disabled={
                isApproving || isCreating || !!tradeError || !!limitPriceError
              }
              className="h-12 flex-1"
              data-testid="button-create-order"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Order"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
