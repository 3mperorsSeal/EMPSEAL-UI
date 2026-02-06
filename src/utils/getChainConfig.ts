export const getChainConfig = (chainId: number) => {
  switch (chainId) {
    case 369:
      return {
        // routerAddress: "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52" as `0x${string}`,
        routerAddress:
          "0xea73e1dEbC70770520A68Aa393C1d072a529bea9" as `0x${string}`,
        wethAddress:
          "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as `0x${string}`,
      };
    case 10001:
      return {
        routerAddress:
          "0x4bf29b3d063be84a8206fb65050da3e21239ff12" as `0x${string}`,
        wethAddress:
          "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990" as `0x${string}`,
      };
    case 146:
      return {
        routerAddress:
          "0x6c481A43EdA77D4E5a666b5A338c5426De2e90B0" as `0x${string}`,
        wethAddress:
          "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38" as `0x${string}`,
      };
    case 8453:
      return {
        routerAddress: "0xcd9F04848221DFd0F218e330bA5b03d5ae744Cb2" as `0x${string}`,
        wethAddress:
          "0x4200000000000000000000000000000000000006" as `0x${string}`,
      };
    case 1329:
      return {
        routerAddress:
          "0xC450f0887A94D1B2ad4b1b05734bEfe860919A2B" as `0x${string}`,
        wethAddress:
          "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7" as `0x${string}`,
      };
    case 80094:
      return {
        routerAddress:
          "0x86B1b88B2BBFe49999fA9A415270997ed1Bfd803" as `0x${string}`,
        wethAddress: 
          "0x6969696969696969696969696969696969696969" as `0x${string}`,
      };
    case 30:
      return {
        routerAddress:
          "0x4482933CfbD06Efe305Ab8Fd2c077ebfD8bFF818" as `0x${string}`,
        wethAddress:
          "0x542fda317318ebf1d3deaf76e0b632741a7e677d" as `0x${string}`,
      };
    default:
      throw new Error(`Chain ${chainId} not supported`);
  }
};
