import { PublicClient, parseAbi } from "viem";
import {
  BestRouteResult,
  ConvergeTrade,
  Hop,
  SplitPath,
} from "../types/router";
import { EmpsealRouterLiteV3 } from "../lite/EmpsealRouterLiteV3";

const IAdapterAbi = parseAbi([
  "function query(uint256 amountIn, address tokenIn, address tokenOut) view returns (uint256 amountOut)",
]);

const FEE_DENOMINATOR = 10000;

export class SmartRouter {
  private publicClient: PublicClient;
  private routerAddress: `0x${string}`;
  private adapters: `0x${string}`[] = [];
  private wnativeAddress: `0x${string}` | null = null;

  // Configuration - More aggressive defaults
  private maxAdaptersPerSplit = 4;
  private convergeOnly = false;
  private granularity = 5; // Test every 5% increment (5%, 10%, 15%...)

  constructor(publicClient: PublicClient, routerAddress: `0x${string}`) {
    this.publicClient = publicClient;
    this.routerAddress = routerAddress;
  }

  /**
   * Set whether to use ONLY converge strategy
   */
  setConvergeOnly(enabled: boolean) {
    this.convergeOnly = enabled;
  }

  /**
   * Set maximum number of adapters to use in splits
   */
  setMaxAdapters(max: number) {
    this.maxAdaptersPerSplit = Math.min(Math.max(max, 1), 6);
  }

  /**
   * Set granularity for split testing (lower = more tests = better optimization)
   * 5 = test every 5% (5%, 10%, 15%...)
   * 1 = test every 1% (most accurate but slowest)
   */
  setGranularity(percent: number) {
    this.granularity = Math.max(1, Math.min(percent, 20));
  }

  async loadAdapters(): Promise<void> {
    try {
      const adapterCount = await this.publicClient.readContract({
        address: this.routerAddress,
        abi: EmpsealRouterLiteV3,
        functionName: "adaptersCount",
      });

      const calls = [];
      for (let i = 0; i < adapterCount; i++) {
        calls.push({
          address: this.routerAddress,
          abi: EmpsealRouterLiteV3,
          functionName: "ADAPTERS",
          args: [i],
        });
      }

      const results = await this.publicClient.multicall({ contracts: calls });
      this.adapters = results.map((res) => res.result as `0x${string}`);

      const wnative = await this.publicClient.readContract({
        address: this.routerAddress,
        abi: EmpsealRouterLiteV3,
        functionName: "WNATIVE",
      });
      this.wnativeAddress = wnative as `0x${string}`;

      console.log(`✅ Loaded ${this.adapters.length} adapters`);
      console.log(`✅ WNATIVE: ${this.wnativeAddress}`);
    } catch (error) {
      console.error("Failed to load adapters:", error);
      throw error;
    }
  }

  private calculateAmountAfterFee(amountIn: bigint, fee: number): bigint {
    if (fee === 0) return amountIn;
    return (amountIn * BigInt(FEE_DENOMINATOR - fee)) / BigInt(FEE_DENOMINATOR);
  }

  /**
   * Generate comprehensive split strategies with fine granularity
   */
  private generateSplitStrategies(numAdapters: number): number[][] {
    const strategies: number[][] = [];
    const step = this.granularity * 100; // Convert to basis points

    if (numAdapters === 1) {
      return [[10000]];
    }

    if (numAdapters === 2) {
      // Always test single adapter
      strategies.push([10000, 0]);

      // Test granular splits from 95/5 down to 50/50
      for (let pct1 = 9500; pct1 >= 5000; pct1 -= step) {
        const pct2 = 10000 - pct1;
        if (pct2 >= 500) {
          // Minimum 5% allocation
          strategies.push([pct1, pct2]);
        }
      }
    } else if (numAdapters === 3) {
      // Single adapter
      strategies.push([10000, 0, 0]);

      // Two-way splits
      for (let pct1 = 9000; pct1 >= 5000; pct1 -= step) {
        const pct2 = 10000 - pct1;
        strategies.push([pct1, pct2, 0]);
      }

      // Three-way splits - test comprehensive combinations
      for (let pct1 = 7000; pct1 >= 4000; pct1 -= step) {
        for (let pct2 = 3000; pct2 >= 2000; pct2 -= step) {
          const pct3 = 10000 - pct1 - pct2;
          if (pct3 >= 1000 && pct3 <= 4000) {
            // Min 10%, max 40% for third
            strategies.push([pct1, pct2, pct3]);
          }
        }
      }

      // Equal three-way
      strategies.push([3334, 3333, 3333]);
    } else if (numAdapters >= 4) {
      // Single
      strategies.push([10000, 0, 0, 0]);

      // Two-way
      for (let pct1 = 8000; pct1 >= 5000; pct1 -= step * 2) {
        strategies.push([pct1, 10000 - pct1, 0, 0]);
      }

      // Three-way with varied distributions
      strategies.push(
        [5000, 3000, 2000, 0],
        [5000, 2500, 2500, 0],
        [4000, 3000, 3000, 0],
        [6000, 2000, 2000, 0]
      );

      // Four-way
      strategies.push(
        [2500, 2500, 2500, 2500], // Equal
        [4000, 3000, 2000, 1000], // Graduated
        [5000, 2000, 2000, 1000], // Dominant + spread
        [3500, 3000, 2000, 1500] // Balanced
      );
    }

    return strategies;
  }

  /**
   * Enhanced optimal split finder - tests more combinations
   */
  private async findOptimalSplit(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    sortedQuotes: Array<{ adapter: `0x${string}`; amountOut: bigint }>
  ): Promise<{
    splits: Array<{ adapter: `0x${string}`; proportion: number }>;
    totalOut: bigint;
  }> {
    if (sortedQuotes.length === 0) {
      throw new Error("No valid quotes provided");
    }

    if (sortedQuotes.length === 1) {
      return {
        splits: [{ adapter: sortedQuotes[0].adapter, proportion: 10000 }],
        totalOut: sortedQuotes[0].amountOut,
      };
    }

    const numAdapters = Math.min(sortedQuotes.length, this.maxAdaptersPerSplit);

    let bestSplits: Array<{ adapter: `0x${string}`; proportion: number }> = [];
    let bestOutput = 0n;

    const strategies = this.generateSplitStrategies(numAdapters);

    console.log(
      `🧪 Testing ${strategies.length} split strategies for ${numAdapters} adapters`
    );

    // Batch queries for better performance
    const batchSize = 10;
    for (let i = 0; i < strategies.length; i += batchSize) {
      const batch = strategies.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (strategy) => {
          const queries = await Promise.all(
            strategy.slice(0, numAdapters).map((proportion, idx) => {
              if (proportion === 0) return Promise.resolve(0n);

              const splitAmount =
                (amountIn * BigInt(proportion)) / BigInt(FEE_DENOMINATOR);

              return this.publicClient.readContract({
                address: sortedQuotes[idx].adapter,
                abi: IAdapterAbi,
                functionName: "query",
                args: [splitAmount, tokenIn, tokenOut],
              });
            })
          );

          const totalOutput = queries.reduce(
            (sum, q) => sum + (q as bigint),
            0n
          );

          return { strategy, totalOutput };
        })
      );

      // Process batch results
      batchResults.forEach((result, batchIdx) => {
        if (result.status === "fulfilled") {
          const { strategy, totalOutput } = result.value;

          if (totalOutput > bestOutput) {
            bestOutput = totalOutput;
            bestSplits = strategy
              .slice(0, numAdapters)
              .map((proportion, idx) => ({
                adapter: sortedQuotes[idx].adapter,
                proportion,
              }))
              .filter((s) => s.proportion > 0);

            const pcts = bestSplits.map((s) => (s.proportion / 100).toFixed(1));
            console.log(
              `  ✅ New best [${pcts.join("/")}%]: ${totalOutput.toString()}`
            );
          }
        }
      });
    }

    if (bestOutput === 0n) {
      console.log("⚠️ All strategies failed, using single best adapter");
      return {
        splits: [{ adapter: sortedQuotes[0].adapter, proportion: 10000 }],
        totalOut: sortedQuotes[0].amountOut,
      };
    }

    const finalPcts = bestSplits.map((s) => (s.proportion / 100).toFixed(1));
    console.log(
      `🎯 Optimal: [${finalPcts.join("/")}%] = ${bestOutput.toString()}`
    );

    return { splits: bestSplits, totalOut: bestOutput };
  }

  /**
   * Get best route with enhanced optimization
   */
  async getBestQuote(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    fee: number = 24
  ): Promise<BestRouteResult | null> {
    if (!this.wnativeAddress) {
      throw new Error("WNATIVE not loaded. Call loadAdapters() first.");
    }

    const amountAfterFee = this.calculateAmountAfterFee(amountIn, fee);

    console.log(`\n${"=".repeat(70)}`);
    console.log(`🔍 Finding optimal route for ${amountAfterFee.toString()}`);
    console.log(`   ${tokenIn.slice(0, 10)}... → ${tokenOut.slice(0, 10)}...`);
    console.log(`${"=".repeat(70)}\n`);

    if (this.convergeOnly) {
      console.log("🔄 CONVERGE-ONLY MODE");
      const convergeResult = await this.findConvergePath(
        amountIn,
        amountAfterFee,
        tokenIn,
        tokenOut,
        this.wnativeAddress
      );

      if (!convergeResult) {
        console.log("❌ No converge path found\n");
        return null;
      }

      console.log(`✅ Output: ${convergeResult.amountOut.toString()}\n`);
      return convergeResult;
    }

    // Test both strategies in parallel
    const [convergeResult, splitResult] = await Promise.allSettled([
      this.findConvergePath(
        amountIn,
        amountAfterFee,
        tokenIn,
        tokenOut,
        this.wnativeAddress
      ),
      this.findStandardSplit(amountAfterFee, tokenIn, tokenOut),
    ]);

    const converge =
      convergeResult.status === "fulfilled" ? convergeResult.value : null;
    const split = splitResult.status === "fulfilled" ? splitResult.value : null;

    console.log("\n📊 RESULTS:");
    console.log(`   Converge: ${converge?.amountOut.toString() || "Failed"}`);
    console.log(`   Direct:   ${split?.amountOut.toString() || "Failed"}`);

    if (!converge && !split) {
      console.log("❌ No routes found\n");
      return null;
    }

    if (!converge) {
      console.log("✅ Winner: Direct Split\n");
      return split;
    }
    if (!split) {
      console.log("✅ Winner: Converge\n");
      return converge;
    }

    const winner = converge.amountOut > split.amountOut ? converge : split;
    const improvement =
      winner === converge
        ? ((converge.amountOut - split.amountOut) * 10000n) / split.amountOut
        : ((split.amountOut - converge.amountOut) * 10000n) /
          converge.amountOut;

    console.log(
      `✅ Winner: ${
        winner === converge ? "Converge" : "Direct Split"
      } (+${improvement.toString()}bps)\n`
    );

    return winner;
  }

  private async findConvergePath(
    grossAmountIn: bigint,
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    intermediateToken: `0x${string}`
  ): Promise<BestRouteResult | null> {
    console.log("🔄 Testing CONVERGE strategy");

    if (tokenIn === intermediateToken || tokenOut === intermediateToken) {
      console.log("   ⚠️ Circular path, skipping");
      return null;
    }

    // Step 1: TokenIn → Intermediate (with smart splits)
    console.log(`   Step 1: Input → ${intermediateToken.slice(0, 10)}...`);

    const inputCalls = this.adapters.map((adapter) => ({
      address: adapter,
      abi: IAdapterAbi,
      functionName: "query",
      args: [amountIn, tokenIn, intermediateToken],
    }));

    const inputResults = await this.publicClient.multicall({
      contracts: inputCalls,
    });

    const inputQuotes = inputResults
      .map((res, i) => ({
        adapter: this.adapters[i],
        amountOut: (res.result as bigint) || 0n,
      }))
      .filter((q) => q.amountOut > 0n)
      .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));

    if (inputQuotes.length === 0) {
      console.log("   ❌ No paths to intermediate");
      return null;
    }

    const { splits: inputSplits, totalOut: totalIntermediateAmount } =
      await this.findOptimalSplit(
        amountIn,
        tokenIn,
        intermediateToken,
        inputQuotes
      );

    if (totalIntermediateAmount === 0n) {
      console.log("   ❌ Zero intermediate output");
      return null;
    }

    // Step 2: Intermediate → TokenOut (also test splits on output!)
    console.log(`   Step 2: ${intermediateToken.slice(0, 10)}... → Output`);

    const outputCalls = this.adapters.map((adapter) => ({
      address: adapter,
      abi: IAdapterAbi,
      functionName: "query",
      args: [totalIntermediateAmount, intermediateToken, tokenOut],
    }));

    const outputResults = await this.publicClient.multicall({
      contracts: outputCalls,
    });

    const outputQuotes = outputResults
      .map((res, i) => ({
        adapter: this.adapters[i],
        amountOut: (res.result as bigint) || 0n,
      }))
      .filter((q) => q.amountOut > 0n)
      .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));

    if (outputQuotes.length === 0) {
      console.log("   ❌ No paths from intermediate");
      return null;
    }

    // IMPORTANT: Also optimize output leg with splits!
    const { splits: outputSplits, totalOut: finalAmount } =
      await this.findOptimalSplit(
        totalIntermediateAmount,
        intermediateToken,
        tokenOut,
        outputQuotes
      );

    // Convert to Hop format
    const inputHops: Hop[] = inputSplits.map((s) => ({
      adapter: s.adapter,
      proportion: s.proportion,
      data: "0x",
    }));

    const outputHop: Hop = {
      adapter: outputSplits[0].adapter, // Primary adapter for output
      proportion: 10000,
      data: "0x",
    };

    const payload: ConvergeTrade = {
      tokenIn,
      intermediate: intermediateToken,
      tokenOut,
      amountIn: grossAmountIn,
      inputHops,
      outputHop,
    };

    return {
      type: "CONVERGE",
      amountOut: finalAmount,
      payload,
      gasEstimate: 0n,
    };
  }

  private async findStandardSplit(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`
  ): Promise<BestRouteResult | null> {
    console.log("📊 Testing DIRECT SPLIT strategy");

    const calls = this.adapters.map((adapter) => ({
      address: adapter,
      abi: IAdapterAbi,
      functionName: "query",
      args: [amountIn, tokenIn, tokenOut],
    }));

    const results = await this.publicClient.multicall({ contracts: calls });

    const quotes = results
      .map((res, i) => ({
        adapter: this.adapters[i],
        amountOut: (res.result as bigint) || 0n,
      }))
      .filter((q) => q.amountOut > 0n)
      .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));

    if (quotes.length === 0) {
      console.log("   ❌ No direct paths");
      return null;
    }

    const { splits, totalOut: finalAmountOut } = await this.findOptimalSplit(
      amountIn,
      tokenIn,
      tokenOut,
      quotes
    );

    const payload: SplitPath[] = splits.map((s) => ({
      path: [tokenIn, tokenOut],
      adapters: [s.adapter],
      proportion: s.proportion,
    }));

    return {
      type: "SPLIT",
      amountOut: finalAmountOut,
      payload,
      gasEstimate: 0n,
    };
  }
}
