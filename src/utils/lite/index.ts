/**
 * Router ABI Configuration Index
 * 
 * This is the main entry point for router ABIs across all chains.
 * Use getRouterABI(chainId) to get the appropriate ABI for a chain.
 */

// Import chain-specific ABIs
import { EmpsealRouterLiteV3 } from './EmpsealRouterLiteV3';
import { EmpsealRouterLiteV5Sonic } from './EmpsealRouterLiteV5Sonic';

// Chain IDs
export const CHAIN_IDS = {
    PULSECHAIN: 369,
    ETHW: 10001,
    SONIC: 146,
} as const;

/**
 * Router ABI mapping by chain ID
 * 
 * - PulseChain (369): V3 ABI with PLS function naming (swapNoSplitFromPLS, swapNoSplitToPLS)
 * - ETHW (10001): V3 ABI (same structure, different function names handled in contractCalls)
 * - Sonic (146): V5 ABI with ETH naming + executeConvergeSwap/executeSplitSwap
 */
export const CHAIN_ROUTER_ABIS = {
    [CHAIN_IDS.PULSECHAIN]: EmpsealRouterLiteV3,
    [CHAIN_IDS.ETHW]: EmpsealRouterLiteV3,
    [CHAIN_IDS.SONIC]: EmpsealRouterLiteV5Sonic,
} as const;

/**
 * Get the router ABI for a specific chain
 * @param chainId - The chain ID
 * @returns The router ABI for the chain
 */
export function getRouterABI(chainId: number): readonly unknown[] {
    switch (chainId) {
        case CHAIN_IDS.SONIC:
            return EmpsealRouterLiteV5Sonic as readonly unknown[];
        case CHAIN_IDS.PULSECHAIN:
        case CHAIN_IDS.ETHW:
        default:
            return EmpsealRouterLiteV3 as readonly unknown[];
    }
}

// Re-export individual ABIs for direct imports
export { EmpsealRouterLiteV3 } from './EmpsealRouterLiteV3';
export { EmpsealRouterLiteV5Sonic } from './EmpsealRouterLiteV5Sonic';

// Default export for backward compatibility
export default EmpsealRouterLiteV3;
