import React, { useEffect, useState } from "react";
import Arrow from "../../assets/images/arrow-2.svg";
import { useChainConfig } from "../../hooks/useChainConfig";
import { useStore } from "../../redux/store/routeStore";
import { SUPPORTED_CHAINS } from '../../config/chains';

const Routing = ({ routing }) => {
  const [tokenImages, setTokenImages] = useState({});
  const route = useStore((state) => state.route);
  const adapter = useStore((state) => state.adapter);
  const {
    chainId,
    tokenList,
    adapters,
    isSupported,
    wethAddress
  } = useChainConfig();

  // Function to get token image from tokenList.json
  const getLocalTokenImage = (address) => {
    const token = tokenList.find(
      (token) => token?.address?.toLowerCase() === address?.toLowerCase()
    );
    return token ? token.logoURI || token.image : null;
  };

  // Combined function to get token image from any source
  const getTokenImage = (address) => {
    // Check if the address is the native token address
    if (address === "0x0000000000000000000000000000000000000000") {
      return getLocalTokenImage(wethAddress);
    }

    // First check if we already have it cached
    if (tokenImages[address]) {
      return tokenImages[address];
    }

    // Then check tokenList from current chain
    const localImage = getLocalTokenImage(address);
    if (localImage) {
      setTokenImages((prev) => ({
        ...prev,
        [address]: localImage,
      }));
      return localImage;
    }

    // Try GeckoTerminal API for any supported chain
    if (chainId && SUPPORTED_CHAINS[chainId]) {
      const chainSymbol = SUPPORTED_CHAINS[chainId].symbol;
      const apiUrl = `https://api.geckoterminal.com/api/v2/networks/${chainSymbol}/tokens/${address}`;
      fetch(apiUrl)
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          const imageUrl = data?.data?.attributes?.image_url;
          if (imageUrl) {
            setTokenImages((prev) => ({
              ...prev,
              [address]: imageUrl,
            }));
          }
        })
        .catch((err) => {
          console.error('Failed to fetch image:', err);
        });
    }
  };

  // Initialize and update token images whenever route or chainId changes
  useEffect(() => {
    if (route && route.length > 0) {
      const newTokenImages = {};
      route.forEach((address) => {
        if (address) {
          newTokenImages[address] = getTokenImage(address);
        }
      });
      setTokenImages((prev) => ({
        ...prev,
        ...newTokenImages,
      }));
    }
  }, [route, chainId]);

  const getAdapter = (address) => {
    if (!address) return "Unknown";
    const foundAdapter = adapters.find(
      (a) => a?.address?.toLowerCase() === address?.toLowerCase()
    );
    return foundAdapter ? foundAdapter.name : "Unknown";
  };

  // Get token symbol from chain-specific tokenList
  const getTokenSymbol = (address) => {
    const token = tokenList.find(
      (token) => token?.address?.toLowerCase() === address?.toLowerCase()
    );
    return token ? token.symbol || token.ticker : "Unknown";
  };

  // if (!isSupported) {
  //   return <div className="text-white text-center roboto">Please switch to a supported chain</div>;
  // }

  if (!route || route.length === 0) {
    return null;
  }

  return (
    <div className="w-full border border-white rounded-xl py-4 2xl:px-7 lg:px-5 px-4 bg-black">
      <div className="flex justify-center gap-2 md:flex-nowrap flex-wrap">
        <p className="w-[85px] h-[28px] flex justify-center items-center rounded-md bg-black roboto text-[#FF9900] text-[8.24px] font-bold border border-[#FF9900]">
          Routing
        </p>
      </div>

      {!isSupported && (
        <span className="text-white text-center flex justify-center roboto mt-2">
          Please switch to a supported chain
        </span>
      )}

      <div className="flex justify-between gap-2 items-center mt-6">
        {route.map((address, index) => (
          <React.Fragment key={`${address}-${index}`}>
            <div className="flex flex-col items-center">
              <img
                className="w-6 h-6"
                src={tokenImages[address] || "src/assets/images/emp-logo.png"}
                alt={getTokenSymbol(address)}
              // onError={(e) => {
              //   // console.log(`Failed to load image for ${address}`);
              //   e.target.src = "/path/to/fallback/image.png";
              // }}
              />
            </div>

            {index < route.length - 1 && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <img className="w-6 h-6" src={Arrow} alt="Arrow" />
                  <p className="text-white text-[10px] font-bold roboto">
                    {adapter && adapter[index]
                      ? getAdapter(adapter[index])
                      : ""}
                  </p>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Routing;
