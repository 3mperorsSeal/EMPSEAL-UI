import { ChainConfig } from "../types";

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  // PulseChain
  369: {
    chainId: 369,
    name: "PulseChain",
    symbol: "pulsechain",
    // routerAddress: '0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52',
    routerAddress: "0xea73e1dEbC70770520A68Aa393C1d072a529bea9",
    wethAddress: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/pulsechain/token_price",
      graphEndpoint: "networks/pulsechain/pools",
    },
    blockExplorer: "https://otter.pulsechain.com/tx/",
    blockExplorerName: "Otterscan",
    rpcUrl: "https://rpc.pulsechain.com",
    maxHops: 3,
    blockTime: 10,
    stableTokens: [
      "0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07",
      "0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f",
      "0xefd766ccb38eaf1dfd701853bfce31359239f305",
    ],
  },
  // ETHW
  10001: {
    chainId: 10001,
    name: "EthereumPOW",
    symbol: "ethw",
    routerAddress: "0x4bf29b3d063be84a8206fb65050da3e21239ff12",
    wethAddress: "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/ethw/token_price",
      graphEndpoint: "networks/ethw/pools",
    },
    blockExplorer: "https://www.oklink.com/ethereum-pow/tx/",
    blockExplorerName: "Oklink",
    rpcUrl: "https://ethw.public-rpc.com",
    maxHops: 3,
    blockTime: 12,
  },
  //sonic
  146: {
    chainId: 146,
    name: "Sonic",
    symbol: "sonic",
    routerAddress: "0x6c481A43EdA77D4E5a666b5A338c5426De2e90B0",
    wethAddress: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/sonic/token_price",
      graphEndpoint: "networks/sonic/pools",
    },
    blockExplorer: "https://sonicscan.org/tx/",
    blockExplorerName: "sonicscan",
    rpcUrl: "https://rpc.soniclabs.com",
    maxHops: 3,
    blockTime: 1,
    stableTokens: [
      "0x29219dd400f2Bf60E5a23d13Be72B486D4038894", // USDC.e
      "0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE", // scUSD
      "0x6047828dc181963ba44974801FF68e538dA5eaF9", // USDT
    ],
  },
};