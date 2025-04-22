import { ChainConfig } from '../types';

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  // PulseChain
  369: {
    chainId: 369,
    name: 'PulseChain',
    routerAddress: '0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52',
    wethAddress: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    priceApi: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      tokenPriceEndpoint: 'simple/networks/pulsechain/token_price',
      graphEndpoint: 'networks/pulsechain/pools',
    },
    blockExplorer: 'https://otter.pulsechain.com/tx/',
    blockExplorerName: 'Otterscan',
    rpcUrl: 'https://rpc.pulsechain.com',
  },
  // ETHW
  10001: {
    chainId: 10001,
    name: 'EthereumPOW',
    routerAddress: '0x4bf29b3d063be84a8206fb65050da3e21239ff12',
    wethAddress: '0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990',
    priceApi: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      tokenPriceEndpoint: 'simple/networks/ethw/token_price',
      graphEndpoint: 'networks/ethw/pools',
    },
    blockExplorer: 'https://www.oklink.com/ethereum-pow/tx/',
    blockExplorerName: "Oklink",
    rpcUrl: 'https://mainnet.ethereumpow.org',
  },
};
