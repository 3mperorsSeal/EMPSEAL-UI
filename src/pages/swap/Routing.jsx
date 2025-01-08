import React, { useEffect, useState } from "react";
import Arrow from "../../assets/images/arrow-2.svg";
import tokenList from "../tokenList.json";
import adapters from "../adapters.json";
import { useStore } from "../../redux/store/routeStore";

const Routing = ({ routing }) => {
  const [tokenImages, setTokenImages] = useState({});
  const route = useStore((state) => state.route);
  const adapter = useStore((state) => state.adapter);

  // Function to get token image from tokenList.json
  const getLocalTokenImage = (address) => {
    const token = tokenList.find(
      (token) => token.address.toLowerCase() === address.toLowerCase()
    );
    return token ? token.image : null;
  };

  // Function to get token image from GitHub
  const getGithubTokenImage = (address) => {
    return `https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/${address}.png`;
  };

  // Combined function to get token image from any source
  const getTokenImage = (address) => {
    // First check if we already have it cached
    if (tokenImages[address]) {
      return tokenImages[address];
    }

    // Then check tokenList.json
    const localImage = getLocalTokenImage(address);
    if (localImage) {
      setTokenImages((prev) => ({
        ...prev,
        [address]: localImage,
      }));
      return localImage;
    }

    // Finally try GitHub
    const githubImage = getGithubTokenImage(address);
    setTokenImages((prev) => ({
      ...prev,
      [address]: githubImage,
    }));
    return githubImage;
  };

  // Initialize and update token images whenever route changes
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
  }, [route]);

  const getAdapter = (address) => {
    if (!address) return "Unknown";
    const foundAdapter = adapters.find(
      (a) => a.address.toLowerCase() === address.toLowerCase()
    );
    return foundAdapter ? foundAdapter.name : "Unknown";
  };

  // Get token symbol from tokenList.json
  const getTokenSymbol = (address) => {
    const token = tokenList.find(
      (token) => token.address.toLowerCase() === address.toLowerCase()
    );
    return token ? token.ticker : "Unknown";
  };

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

      <div className="flex justify-between gap-2 items-center mt-6">
        {route.map((address, index) => (
          <React.Fragment key={`${address}-${index}`}>
            <div className="flex flex-col items-center">
              <img
                className="w-6 h-6"
                src={tokenImages[address] || "/path/to/fallback/image.png"}
                alt={getTokenSymbol(address)}
                onError={(e) => {
                  console.log(`Failed to load image for ${address}`);
                  e.target.src = "/path/to/fallback/image.png";
                }}
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
