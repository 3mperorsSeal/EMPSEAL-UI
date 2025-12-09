import { PublicClient, parseAbi } from "viem";
import {
  BestRouteResult,
  ConvergeTrade,
  Hop,
  SplitPath,
} from "../types/router";
import { EmpsealRouterLiteV3 } from "../lite/EmpsealRouterLiteV3";

// Simple Adapter ABI for querying
const IAdapterAbi = parseAbi([
  "function query(uint256 amountIn, address tokenIn, address tokenOut) view returns (uint256 amountOut)",
]);

const FEE_DENOMINATOR = 10000;

export class SmartRouter {
  private publicClient: PublicClient;
  private routerAddress: `0x${string}`;
  private adapters: `0x${string}`[] = [];
  private wnativeAddress: `0x${string}` | null = null;
  private trustedTokens: `0x${string}`[] = [];

  // Configuration
  private maxAdaptersPerSplit = 4;
  private convergeOnly = false;
  private granularity = 5;
  private maxHops = 3;

  constructor(publicClient: PublicClient, routerAddress: `0x${string}`) {
    this.publicClient = publicClient;
    this.routerAddress = routerAddress;
  }

  /**
   * Load configuration from router contract
   */
  async loadAdapters(): Promise<void> {
    try {
      // Load adapters count
      const adapterCount = await this.publicClient.readContract({
        address: this.routerAddress,
        abi: EmpsealRouterLiteV3,
        functionName: "adaptersCount",
      });

      const adapterCalls = [];
      for (let i = 0; i < Number(adapterCount); i++) {
        adapterCalls.push({
          address: this.routerAddress,
          abi: EmpsealRouterLiteV3,
          functionName: "ADAPTERS",
          args: [i],
        });
      }

      const adapterResults = await this.publicClient.multicall({
        contracts: adapterCalls,
      });
      this.adapters = adapterResults.map((res) => res.result as `0x${string}`);

      // Load WNATIVE
      const wnative = await this.publicClient.readContract({
        address: this.routerAddress,
        abi: EmpsealRouterLiteV3,
        functionName: "WNATIVE",
      });
      this.wnativeAddress = wnative as `0x${string}`;

      // Load trusted tokens
      const trustedCount = await this.publicClient.readContract({
        address: this.routerAddress,
        abi: EmpsealRouterLiteV3,
        functionName: "trustedTokensCount",
      });

      const trustedCalls = [];
      for (let i = 0; i < Number(trustedCount); i++) {
        trustedCalls.push({
          address: this.routerAddress,
          abi: EmpsealRouterLiteV3,
          functionName: "TRUSTED_TOKENS",
          args: [i],
        });
      }

      const trustedResults = await this.publicClient.multicall({
        contracts: trustedCalls,
      });
      this.trustedTokens = trustedResults.map(
        (res) => res.result as `0x${string}`
      );

      // console.log(`✅ Loaded ${this.adapters.length} adapters`);
      // console.log(`✅ WNATIVE: ${this.wnativeAddress}`);
      // console.log(`✅ Trusted tokens: ${this.trustedTokens.length}`);
      // console.log(
      //   `   ${this.trustedTokens.map((t) => t.slice(0, 8)).join(", ")}...`
      // );
    } catch (error) {
      console.error("Failed to load router config:", error);
      throw error;
    }
  }

  setConvergeOnly(enabled: boolean) {
    this.convergeOnly = enabled;
  }

  setMaxAdapters(max: number) {
    this.maxAdaptersPerSplit = Math.min(Math.max(max, 1), 6);
  }

  setGranularity(percent: number) {
    this.granularity = Math.max(1, Math.min(percent, 20));
  }

  setMaxHops(hops: number) {
    this.maxHops = Math.max(1, Math.min(hops, 4));
  }

  private calculateAmountAfterFee(amountIn: bigint, fee: number): bigint {
    if (fee === 0) return amountIn;
    return (amountIn * BigInt(FEE_DENOMINATOR - fee)) / BigInt(FEE_DENOMINATOR);
  }

  private isNative(token: `0x${string}`): boolean {
    return (
      token === "0x0000000000000000000000000000000000000000" ||
      token.toLowerCase() === "0x0" ||
      BigInt(token) === 0n
    );
  }

  private normalizeToken(token: `0x${string}`): `0x${string}` {
    if (this.isNative(token)) {
      if (!this.wnativeAddress) {
        throw new Error("WNATIVE not loaded");
      }
      return this.wnativeAddress;
    }
    return token;
  }

  private generateSplitStrategies(numAdapters: number): number[][] {
    const strategies: number[][] = [];
    const step = this.granularity * 100;

    if (numAdapters === 1) {
      return [[10000]];
    }

    if (numAdapters === 2) {
      strategies.push([10000, 0]);
      for (let pct1 = 9500; pct1 >= 5000; pct1 -= step) {
        const pct2 = 10000 - pct1;
        if (pct2 >= 500) {
          strategies.push([pct1, pct2]);
        }
      }
    } else if (numAdapters === 3) {
      strategies.push([10000, 0, 0]);
      for (let pct1 = 9000; pct1 >= 5000; pct1 -= step) {
        strategies.push([pct1, 10000 - pct1, 0]);
      }
      for (let pct1 = 7000; pct1 >= 4000; pct1 -= step) {
        for (let pct2 = 3000; pct2 >= 2000; pct2 -= step) {
          const pct3 = 10000 - pct1 - pct2;
          if (pct3 >= 1000 && pct3 <= 4000) {
            strategies.push([pct1, pct2, pct3]);
          }
        }
      }
      strategies.push([3334, 3333, 3333]);
    } else if (numAdapters >= 4) {
      strategies.push([10000, 0, 0, 0]);
      for (let pct1 = 8000; pct1 >= 5000; pct1 -= step * 2) {
        strategies.push([pct1, 10000 - pct1, 0, 0]);
      }
      strategies.push(
        [5000, 3000, 2000, 0],
        [5000, 2500, 2500, 0],
        [4000, 3000, 3000, 0],
        [6000, 2000, 2000, 0],
        [2500, 2500, 2500, 2500],
        [4000, 3000, 2000, 1000],
        [5000, 2000, 2000, 1000],
        [3500, 3000, 2000, 1500]
      );
    }

    return strategies;
  }

  /**
   * UPGRADED: Includes Micro-Optimization
   * Performs standard search, then refines the best result by small perturbations
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
    if (sortedQuotes.length === 0) throw new Error("No valid quotes");

    if (sortedQuotes.length === 1) {
      return {
        splits: [{ adapter: sortedQuotes[0].adapter, proportion: 10000 }],
        totalOut: sortedQuotes[0].amountOut,
      };
    }

    const numAdapters = Math.min(sortedQuotes.length, this.maxAdaptersPerSplit);

    // 1. Coarse Search (Standard Strategies)
    const coarseStrategies = this.generateSplitStrategies(numAdapters);
    let { bestOutput, bestSplits, bestRawStrategy } =
      await this.executeSplitSearch(
        amountIn,
        tokenIn,
        tokenOut,
        sortedQuotes,
        coarseStrategies,
        numAdapters
      );

    // 2. Micro-Optimization Search
    // If the best strategy splits across multiple adapters, try to shift 1% around to find local maxima
    if (numAdapters > 1 && bestOutput > 0n && bestRawStrategy) {
      const refinedStrategies: number[][] = [];
      const step = 100; // 1% steps

      // Try shifting liquidity between any two active adapters
      for (let i = 0; i < numAdapters; i++) {
        for (let j = 0; j < numAdapters; j++) {
          if (i === j) continue;

          // Create a variation: -1% from i, +1% to j
          const newStrategy = [...bestRawStrategy];
          if (newStrategy[i] >= step) {
            newStrategy[i] -= step;
            newStrategy[j] += step;
            refinedStrategies.push(newStrategy);
          }
        }
      }

      if (refinedStrategies.length > 0) {
        const refinedResult = await this.executeSplitSearch(
          amountIn,
          tokenIn,
          tokenOut,
          sortedQuotes,
          refinedStrategies,
          numAdapters
        );

        if (refinedResult.bestOutput > bestOutput) {
          // console.log(`      ✨ Refined split found (+${refinedResult.bestOutput - bestOutput} units)`);
          bestOutput = refinedResult.bestOutput;
          bestSplits = refinedResult.bestSplits;
        }
      }
    }

    if (bestOutput === 0n) {
      // Fallback to single best
      return {
        splits: [{ adapter: sortedQuotes[0].adapter, proportion: 10000 }],
        totalOut: sortedQuotes[0].amountOut,
      };
    }

    return { splits: bestSplits, totalOut: bestOutput };
  }

  /**
   * Helper to execute a batch of split strategies
   */
  private async executeSplitSearch(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    sortedQuotes: any[],
    strategies: number[][],
    numAdapters: number
  ) {
    let bestOutput = 0n;
    let bestSplits: any[] = [];
    let bestRawStrategy: number[] | null = null;

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

      batchResults.forEach((result) => {
        if (
          result.status === "fulfilled" &&
          result.value.totalOutput > bestOutput
        ) {
          bestOutput = result.value.totalOutput;
          bestRawStrategy = result.value.strategy;
          bestSplits = result.value.strategy
            .slice(0, numAdapters)
            .map((proportion: number, idx: number) => ({
              adapter: sortedQuotes[idx].adapter,
              proportion,
            }))
            .filter((s: any) => s.proportion > 0);
        }
      });
    }
    return { bestOutput, bestSplits, bestRawStrategy };
  }

  private async getAllAdapterQuotes(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`
  ): Promise<Array<{ adapter: `0x${string}`; amountOut: bigint }>> {
    const calls = this.adapters.map((adapter) => ({
      address: adapter,
      abi: IAdapterAbi,
      functionName: "query",
      args: [amountIn, tokenIn, tokenOut],
    }));

    const results = await this.publicClient.multicall({ contracts: calls });

    return results
      .map((res, i) => ({
        adapter: this.adapters[i],
        amountOut: (res.result as bigint) || 0n,
      }))
      .filter((q) => q.amountOut > 0n)
      .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
  }

  private async findBestMultiHopPath(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    visited: Set<string> = new Set(),
    currentPath: `0x${string}`[] = [],
    depth: number = 0
  ): Promise<{
    path: `0x${string}`[];
    adapters: `0x${string}`[];
    amountOut: bigint;
  } | null> {
    if (depth === 0 || currentPath.length === 0) {
      const directQuotes = await this.getAllAdapterQuotes(
        amountIn,
        tokenIn,
        tokenOut
      );
      if (directQuotes.length > 0) {
        return {
          path: [tokenIn, tokenOut],
          adapters: [directQuotes[0].adapter],
          amountOut: directQuotes[0].amountOut,
        };
      }
      if (depth >= this.maxHops - 1) {
        return null;
      }
    }

    visited.add(tokenIn.toLowerCase());
    let bestPath: {
      path: `0x${string}`[];
      adapters: `0x${string}`[];
      amountOut: bigint;
    } | null = null;

    for (const intermediate of this.trustedTokens) {
      if (
        visited.has(intermediate.toLowerCase()) ||
        intermediate.toLowerCase() === tokenIn.toLowerCase() ||
        intermediate.toLowerCase() === tokenOut.toLowerCase()
      ) {
        continue;
      }

      const firstLegQuotes = await this.getAllAdapterQuotes(
        amountIn,
        tokenIn,
        intermediate
      );
      if (firstLegQuotes.length === 0) continue;

      const firstLegBest = firstLegQuotes[0];

      const restOfPath = await this.findBestMultiHopPath(
        firstLegBest.amountOut,
        intermediate,
        tokenOut,
        new Set(visited),
        [...currentPath, tokenIn],
        depth + 1
      );

      if (restOfPath) {
        const totalAmountOut = restOfPath.amountOut;
        if (!bestPath || totalAmountOut > bestPath.amountOut) {
          bestPath = {
            path: [tokenIn, ...restOfPath.path.slice(1)],
            adapters: [firstLegBest.adapter, ...restOfPath.adapters],
            amountOut: totalAmountOut,
          };
        }
      }
    }

    return bestPath;
  }

  /**
   * Main Entry Point: Get best quote
   */
  async getBestQuote(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    fee: number = 0
  ): Promise<BestRouteResult | null> {
    if (!this.wnativeAddress || this.trustedTokens.length === 0) {
      throw new Error("Router not initialized. Call loadAdapters() first.");
    }

    const normalizedTokenIn = this.normalizeToken(tokenIn);
    const normalizedTokenOut = this.normalizeToken(tokenOut);

    // Check for direct wrap/unwrap BEFORE calculating fee
    const isWrapping =
      this.isNative(tokenIn) &&
      normalizedTokenOut.toLowerCase() === this.wnativeAddress.toLowerCase();
    const isUnwrapping =
      normalizedTokenIn.toLowerCase() === this.wnativeAddress.toLowerCase() &&
      this.isNative(tokenOut);

    if (isWrapping) {
      // console.log("✅ Strategy: Direct Wrap (No Fee)");
      return {
        type: "WRAP",
        amountOut: amountIn, // Use original amountIn
        payload: {
          tokenIn,
          tokenOut,
          amountIn: amountIn, // Use original amountIn
        },
        gasEstimate: 0n,
      };
    }

    if (isUnwrapping) {
      // console.log("✅ Strategy: Direct Unwrap (No Fee)");
      return {
        type: "UNWRAP",
        amountOut: amountIn, // Use original amountIn
        payload: {
          tokenIn,
          tokenOut,
          amountIn: amountIn, // Use original amountIn
        },
        gasEstimate: 0n,
      };
    }

    // Calculate fee only for other route types
    const amountAfterFee = this.calculateAmountAfterFee(amountIn, fee);

    // console.log(`\n${"=".repeat(70)}`);
    // console.log(`🔍 Finding route: ${amountAfterFee.toString()}`);
    // console.log(
    //   `   ${normalizedTokenIn.slice(0, 10)}... → ${normalizedTokenOut.slice(
    //     0,
    //     10
    //   )}...`
    // );
    // if (this.isNative(tokenIn)) console.log(`   (Native → WNATIVE conversion)`);
    // if (this.isNative(tokenOut))
    //   console.log(`   (WNATIVE → Native conversion)`);
    // console.log(`${"=".repeat(70)}\n`);

    if (this.convergeOnly) {
      // console.log("🔄 CONVERGE-ONLY MODE");
      const convergeResult = await this.findConvergePath(
        // amountAfterFee,
        amountIn,
        normalizedTokenIn,
        normalizedTokenOut
      );
      if (!convergeResult) {
        // console.log("❌ No converge path\n");
        return null;
      }
      // console.log(`✅ Output: ${convergeResult.amountOut.toString()}\n`);
      return convergeResult;
    }

    // Run all strategies in parallel
    const [
      convergeResult,
      splitResult,
      multiHopResult,
      convergeMultiHopResult,
    ] = await Promise.allSettled([
      this.findConvergePath(
        // amountAfterFee,
        amountIn,
        normalizedTokenIn,
        normalizedTokenOut
      ),
      this.findStandardSplit(
        // amountAfterFee,
        amountIn,
        normalizedTokenIn,
        normalizedTokenOut
      ),
      this.findMultiHopSplit(
        // amountAfterFee,
        amountIn,
        normalizedTokenIn,
        normalizedTokenOut
      ),
      this.findConvergeMultiHop(
        // amountAfterFee,
        amountIn,
        normalizedTokenIn,
        normalizedTokenOut
      ),
    ]);

    const converge =
      convergeResult.status === "fulfilled" ? convergeResult.value : null;
    const split = splitResult.status === "fulfilled" ? splitResult.value : null;
    const multiHop =
      multiHopResult.status === "fulfilled" ? multiHopResult.value : null;
    const convergeMultiHop =
      convergeMultiHopResult.status === "fulfilled"
        ? convergeMultiHopResult.value
        : null;

    // console.log("\n📊 RESULTS:");
    // console.log(
    //   `   Converge (Omni):     ${converge?.amountOut.toString() || "N/A"}`
    // );
    // console.log(
    //   `   Direct:              ${split?.amountOut.toString() || "N/A"}`
    // );
    // console.log(
    //   `   Multi-hop:           ${multiHop?.amountOut.toString() || "N/A"}`
    // );
    // console.log(
    //   `   Converge Multi-hop:  ${
    //     convergeMultiHop?.amountOut.toString() || "N/A"
    //   }`
    // );

    const candidates = [converge, split, multiHop, convergeMultiHop].filter(
      Boolean
    );

    if (candidates.length === 0) {
      // console.log("❌ No routes found\n");
      return null;
    }

    const winner = candidates.reduce((best, current) =>
      current!.amountOut > best!.amountOut ? current : best
    );

    let winnerName = "Unknown";
    if (winner === converge) winnerName = "Omni-Converge";
    else if (winner === split) winnerName = "Direct";
    else if (winner === convergeMultiHop) winnerName = "Converge Multi-hop";
    else winnerName = "Multi-hop";

    // console.log(`✅ Winner: ${winnerName} (${winner!.amountOut.toString()})\n`);

    return winner;
  }

  private async findMultiHopSplit(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`
  ): Promise<BestRouteResult | null> {
    // console.log("🔗 Testing MULTI-HOP strategy");

    const bestPath = await this.findBestMultiHopPath(
      amountIn,
      tokenIn,
      tokenOut
    );

    if (!bestPath) {
      // console.log("   ❌ No multi-hop path found");
      return null;
    }

    // console.log(`   ✅ Found ${bestPath.path.length - 1}-hop path`);
    // console.log(
    //   `      ${bestPath.path.map((t) => t.slice(0, 8)).join(" → ")}...`
    // );

    const payload: SplitPath[] = [
      {
        path: bestPath.path,
        adapters: bestPath.adapters,
        proportion: 10000,
      },
    ];

    return {
      type: "SPLIT",
      amountOut: bestPath.amountOut,
      payload,
      gasEstimate: 0n,
    };
  }

  /**
   * Strategy: Converge Multi-Hop
   * (Uses WNATIVE as pivot for multi-hop on both sides)
   */
  private async findConvergeMultiHop(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`
  ): Promise<BestRouteResult | null> {
    // console.log("🔄🔗 Testing CONVERGE MULTI-HOP strategy");

    if (
      !this.wnativeAddress ||
      tokenIn === this.wnativeAddress ||
      tokenOut === this.wnativeAddress
    ) {
      // console.log("   ⚠️ Skipping (circular or native involved)");
      return null;
    }

    // Step 1: Paths TO WNATIVE
    const inputPaths = await this.findTopMultiHopPaths(
      amountIn,
      tokenIn,
      this.wnativeAddress,
      3
    );

    if (inputPaths.length === 0) {
      // console.log("   ❌ No multi-hop paths to intermediate");
      return null;
    }

    // Step 2: Optimize split across input paths
    let totalIntermediateAmount = 0n;
    let bestInputConfig: Array<{
      path: `0x${string}`[];
      adapters: `0x${string}`[];
      proportion: number;
    }> = [];

    if (inputPaths.length === 1) {
      totalIntermediateAmount = inputPaths[0].amountOut;
      bestInputConfig = [
        {
          path: inputPaths[0].path,
          adapters: inputPaths[0].adapters,
          proportion: 10000,
        },
      ];
    } else {
      const singleBest = inputPaths[0];
      if (
        inputPaths.length >= 2 &&
        inputPaths[1].amountOut > (singleBest.amountOut * 7n) / 10n
      ) {
        const halfAmount = amountIn / 2n;
        const [split1, split2] = await Promise.all([
          this.findBestMultiHopPath(halfAmount, tokenIn, this.wnativeAddress!),
          this.findBestMultiHopPath(halfAmount, tokenIn, this.wnativeAddress!),
        ]);

        const splitTotal =
          (split1?.amountOut || 0n) + (split2?.amountOut || 0n);

        if (splitTotal > singleBest.amountOut) {
          totalIntermediateAmount = splitTotal;
          bestInputConfig = [
            {
              path: inputPaths[0].path,
              adapters: inputPaths[0].adapters,
              proportion: 5000,
            },
            {
              path: inputPaths[1].path,
              adapters: inputPaths[1].adapters,
              proportion: 5000,
            },
          ];
        } else {
          totalIntermediateAmount = singleBest.amountOut;
          bestInputConfig = [
            {
              path: singleBest.path,
              adapters: singleBest.adapters,
              proportion: 10000,
            },
          ];
        }
      } else {
        totalIntermediateAmount = singleBest.amountOut;
        bestInputConfig = [
          {
            path: singleBest.path,
            adapters: singleBest.adapters,
            proportion: 10000,
          },
        ];
      }
    }

    // Step 3: Paths FROM WNATIVE
    const outputPath = await this.findBestMultiHopPath(
      totalIntermediateAmount,
      this.wnativeAddress,
      tokenOut
    );

    if (!outputPath) {
      // console.log("   ❌ No multi-hop path from intermediate");
      return null;
    }

    if (bestInputConfig.length === 1) {
      const fullPath = [
        ...bestInputConfig[0].path,
        ...outputPath.path.slice(1),
      ];
      const fullAdapters = [
        ...bestInputConfig[0].adapters,
        ...outputPath.adapters,
      ];

      const payload: SplitPath[] = [
        {
          path: fullPath,
          adapters: fullAdapters,
          proportion: 10000,
        },
      ];

      return {
        type: "SPLIT",
        amountOut: outputPath.amountOut,
        payload,
        gasEstimate: 0n,
      };
    } else {
      // Fallback for complex splits (currently simplified)
      const singleBest = inputPaths[0];
      const fullPath = [...singleBest.path, ...outputPath.path.slice(1)];
      const fullAdapters = [...singleBest.adapters, ...outputPath.adapters];

      const payload: SplitPath[] = [
        {
          path: fullPath,
          adapters: fullAdapters,
          proportion: 10000,
        },
      ];

      return {
        type: "SPLIT",
        amountOut: outputPath.amountOut,
        payload,
        gasEstimate: 0n,
      };
    }
  }

  private async findTopMultiHopPaths(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    topN: number = 3
  ): Promise<
    Array<{
      path: `0x${string}`[];
      adapters: `0x${string}`[];
      amountOut: bigint;
    }>
  > {
    const allPaths: Array<{
      path: `0x${string}`[];
      adapters: `0x${string}`[];
      amountOut: bigint;
    }> = [];

    const directQuotes = await this.getAllAdapterQuotes(
      amountIn,
      tokenIn,
      tokenOut
    );

    if (directQuotes.length > 0) {
      allPaths.push({
        path: [tokenIn, tokenOut],
        adapters: [directQuotes[0].adapter],
        amountOut: directQuotes[0].amountOut,
      });
    }

    for (const intermediate of this.trustedTokens) {
      if (
        intermediate.toLowerCase() === tokenIn.toLowerCase() ||
        intermediate.toLowerCase() === tokenOut.toLowerCase()
      ) {
        continue;
      }

      const firstLegQuotes = await this.getAllAdapterQuotes(
        amountIn,
        tokenIn,
        intermediate
      );

      if (firstLegQuotes.length === 0) continue;

      const secondLegQuotes = await this.getAllAdapterQuotes(
        firstLegQuotes[0].amountOut,
        intermediate,
        tokenOut
      );

      if (secondLegQuotes.length > 0) {
        allPaths.push({
          path: [tokenIn, intermediate, tokenOut],
          adapters: [firstLegQuotes[0].adapter, secondLegQuotes[0].adapter],
          amountOut: secondLegQuotes[0].amountOut,
        });
      }
    }

    return allPaths
      .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1))
      .slice(0, topN);
  }

  /**
   * UPGRADED: Omni-Converge
   * Checks ALL trusted tokens as intermediate candidates, not just WNATIVE.
   */
  private async findConvergePath(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`
  ): Promise<BestRouteResult | null> {
    // console.log("🔄 Testing OMNI-CONVERGE strategy");

    // Filter valid intermediates
    const candidates = this.trustedTokens.filter(
      (t) =>
        t.toLowerCase() !== tokenIn.toLowerCase() &&
        t.toLowerCase() !== tokenOut.toLowerCase()
    );

    if (candidates.length === 0) {
      // console.log("   ⚠️ No valid intermediate tokens found");
      return null;
    }

    // Parallelize search across all intermediates
    const results = await Promise.all(
      candidates.map(async (intermediate) => {
        try {
          // Leg 1: In -> Intermediate
          const inputQuotes = await this.getAllAdapterQuotes(
            amountIn,
            tokenIn,
            intermediate
          );
          if (inputQuotes.length === 0) return null;

          const { splits: inputSplits, totalOut: totalIntermediate } =
            await this.findOptimalSplit(
              amountIn,
              tokenIn,
              intermediate,
              inputQuotes
            );

          if (totalIntermediate === 0n) return null;

          // Leg 2: Intermediate -> Out
          const outputQuotes = await this.getAllAdapterQuotes(
            totalIntermediate,
            intermediate,
            tokenOut
          );
          if (outputQuotes.length === 0) return null;

          const { splits: outputSplits, totalOut: finalAmount } =
            await this.findOptimalSplit(
              totalIntermediate,
              intermediate,
              tokenOut,
              outputQuotes
            );

          return {
            intermediate,
            finalAmount,
            inputSplits,
            outputSplits,
          };
        } catch (e) {
          return null;
        }
      })
    );

    // Filter and find winner
    const validResults = results.filter(
      (r) => r !== null && r.finalAmount > 0n
    );

    if (validResults.length === 0) {
      // console.log("   ❌ No converge paths found");
      return null;
    }

    const bestResult = validResults.reduce((prev, current) =>
      prev!.finalAmount > current!.finalAmount ? prev : current
    );

    // console.log(
    //   `   🏆 Best Intermediate: ${bestResult!.intermediate.slice(0, 8)}...`
    // );

    const payload: ConvergeTrade = {
      tokenIn,
      intermediate: bestResult!.intermediate, // Now dynamic!
      tokenOut,
      amountIn,
      inputHops: bestResult!.inputSplits.map((s) => ({
        adapter: s.adapter,
        proportion: s.proportion,
        data: "0x",
      })),
      outputHop: {
        adapter: bestResult!.outputSplits[0].adapter,
        proportion: 10000,
        data: "0x",
      },
    };

    return {
      type: "CONVERGE",
      amountOut: bestResult!.finalAmount,
      payload,
      gasEstimate: 0n,
    };
  }

  private async findStandardSplit(
    amountIn: bigint,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`
  ): Promise<BestRouteResult | null> {
    // console.log("📊 Testing DIRECT SPLIT strategy");

    const quotes = await this.getAllAdapterQuotes(amountIn, tokenIn, tokenOut);

    if (quotes.length === 0) {
      // console.log("   ❌ No direct paths");
      return null;
    }

    const { splits, totalOut } = await this.findOptimalSplit(
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
      amountOut: totalOut,
      payload,
      gasEstimate: 0n,
    };
  }
}
