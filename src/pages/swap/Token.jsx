import React, { useState, useEffect, useRef, useMemo } from "react";
import Arrow from "../../assets/icons/downarrow.svg";
import { ERC20_ABI } from "./tokenFetch";
import { useChainConfig } from "../../hooks/useChainConfig";
import Web3 from "web3";
import { SUPPORTED_CHAINS } from '../../config/chains';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const TokenListItem = ({ token, walletAddress, onClick }) => {
  return (
    <div
      className="flex justify-between items-center mt-4 cursor-pointer hover:bg-gray-800 p-2 rounded"
      onClick={() => onClick(token)}
    >
      <div className="flex items-center gap-2">
        <img
          src={token?.logoURI || token?.image}
          className="w-4 h-4"
          alt={token?.name}
          onError={(e) => {
            e.target.src = "src/assets/images/emp-logo.png";
          }}
        />
        <div>
          <div className="text-white text-base roboto leading-relaxed tracking-wide">
            {token.name}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white text-sm font-normal roboto tracking-wide">
          {/* No balance shown */}
        </div>
        <div className="text-gray-400 text-xs roboto mt-2">{token.symbol || token.ticker}</div>
      </div>
    </div>
  );
};

const Token = ({ onClose, onSelect, visible }) => {
  if (!visible) return null;

  const { chainId, tokenList, featureTokens, isSupported } = useChainConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenDetails, setTokenDetails] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const modalRef = useRef(null);

  const getRpcUrl = () => {
    switch (chainId) {
      case 369: return "https://rpc.pulsechain.com";
      case 10001: return "https://mainnet.ethereumpow.org";
      case 146: return "https://rpc.soniclabs.com";
      case 8453: return "https://mainnet.base.org";
      default: return null;
    }
  };

  const rpcUrl = getRpcUrl();
  const web3 = useMemo(() => (rpcUrl ? new Web3(rpcUrl) : null), [rpcUrl]);

  useEffect(() => {
    const getAddress = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          setWalletAddress(accounts[0]);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };
    getAddress();
  }, []);

  // Debounced search query for address lookups
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const filteredTokens = tokenList.filter(
    (token) =>
      (token.name && token.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (token.ticker && token.ticker.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (token.address && token.address.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const SortedTokenList = () => {
    return (
      <div className="max-h-[400px] overflow-y-auto">
        {filteredTokens.map((token, index) => (
          <TokenListItem
            key={index}
            token={token}
            walletAddress={walletAddress}
            onClick={handleTokenSelect}
          />
        ))}
      </div>
    );
  };

  const lookupTokenByAddress = async (address) => {
    if (!web3.utils.isAddress(address)) {
      console.error("Invalid address");
      return null;
    }

    let imageUrl = null;
    try {
      // Fetch token image from GeckoTerminal API
      if (chainId && address) {
        // Get the chain symbol for GeckoTerminal (e.g., 'base', 'pulsechain', etc.)
        const chainSymbol = (typeof chainId === 'number' && chainId in SUPPORTED_CHAINS)
          ? SUPPORTED_CHAINS[chainId].symbol
          : null;
        if (chainSymbol) {
          const apiUrl = `https://api.geckoterminal.com/api/v2/networks/${chainSymbol}/tokens/${address}`;
          try {
            const response = await fetch(apiUrl);
            if (response.ok) {
              const data = await response.json();
              imageUrl = data?.data?.attributes?.image_url || null;
            }
          } catch (apiErr) {
            console.error('Failed to fetch image from GeckoTerminal:', apiErr);
          }
        }
      }

      const tokenContract = new web3.eth.Contract(ERC20_ABI, address);
      const [name, symbol, decimalsRaw] = await Promise.all([
        tokenContract.methods.name().call(),
        tokenContract.methods.symbol().call(),
        tokenContract.methods.decimals().call(),
      ]);

      const decimal = Number(decimalsRaw); // Convert BigInt to Number
      return {
        address,
        name,
        symbol,
        decimal,
        logoURI: imageUrl, // Use fetched image if available
        image: imageUrl || "src/assets/images/emp-logo.png", // Fallback to default image
        ticker: symbol,
      };

    } catch (error) {
      console.error("Error fetching token details:", error);
      return null;
    }
  };

  const handleTokenLookup = async (address) => {
    setError(null);
    setTokenDetails(null);
    setIsLoading(true);

    try {
      // First check if token exists in tokenList
      const existingToken = tokenList.find(
        token => token.address.toLowerCase() === address.toLowerCase()
      );

      if (existingToken) {
        setTokenDetails(existingToken);
        setError(null);
        return;
      }

      // Only proceed with ABI calls if token is not in tokenList
      const details = await lookupTokenByAddress(address);
      if (details) {
        setTokenDetails(details);
        setError(null);
      } else {
        setError("Token not found or invalid address.");
      }
    } catch (err) {
      setError("Failed to fetch token details.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (web3 && web3.utils.isAddress(debouncedSearchQuery)) {
      // First check if token exists in tokenList
      const existingToken = tokenList.find(
        token => token.address.toLowerCase() === debouncedSearchQuery.toLowerCase()
      );
      if (existingToken) {
        setTokenDetails(existingToken);
        setError(null);
      } else {
        handleTokenLookup(debouncedSearchQuery);
      }
    } else {
      setTokenDetails(null);
      setError(null);
    }
  }, [debouncedSearchQuery]);

  const handleTokenSelect = (token) => {
    if (tokenDetails && token.address === tokenDetails.address) {
      onSelect(tokenDetails);
    } else {
      onSelect(token);
    }
    onClose();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleFeaturedTokenClick = (token) => {
    onSelect(token);
    onClose();
  };

  if (!isSupported) {
    return (
      <div className="text-white text-center">
        Please switch to a supported chain
      </div>
    );
  }

  return (
    <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
      <div className="w-full flex justify-center my-auto items-center">
        <div
          ref={modalRef}
          className="md:max-w-[564px] w-full bg-black border border-white rounded-3xl relative py-6 px-5 mx-auto"
        >
          <svg
            onClick={onClose}
            className="absolute cursor-pointer right-8 top-9"
            width={18}
            height={19}
            viewBox="0 0 18 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
              stroke="#ffff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="flex gap-4 items-center justify-center cursor-pointer mt-2">
            <p className="md:text-2xl text-lg font-medium text-white roboto text-center tracking-widest">
              Select a token
            </p>
          </div>

          <div className="mt-6 relative h-[43px] w-full flex gap-2 items-center">
            <input
              type="text"
              placeholder="Search token name or paste address"
              className="bg-neutral-950 rounded-[4.83px] h-[43px] text-white md:max-w-[490px] w-full px-5 outline-none border-none text-white/opacity-70 text-sm font-normal roboto leading-tight tracking-wide"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => handleTokenLookup(searchQuery)}>
              <svg
                className="flex flex-shrink-0 cursor-pointer"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.8632 19.0535L13.3482 13.5375C10.8947 15.2818 7.51414 14.8552 5.57102 12.556C3.62792 10.257 3.7706 6.85254 5.89925 4.72413C8.02735 2.59479 11.4322 2.45149 13.7317 4.3945C16.0311 6.3375 16.458 9.71849 14.7137 12.1721L20.2287 17.688L18.8642 19.0526L18.8632 19.0535ZM9.99282 4.95765C8.16287 4.95724 6.58411 6.24178 6.21237 8.03356C5.84064 9.82534 6.7781 11.6319 8.45718 12.3596C10.1363 13.0871 12.0955 12.5358 13.1486 11.0392C14.2018 9.54268 14.0594 7.51235 12.8078 6.17743L13.3916 6.75644L12.7335 6.10023L12.7219 6.08865C11.9999 5.36217 11.0171 4.95489 9.99282 4.95765Z"
                  fill="white"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-4 mt-6">
            {featureTokens.map((token, index) => (
              <div
                key={index}
                className="flex flex-row items-center cursor-pointer roboto p-2 rounded-2xl border border-[#3b3c4e]"
                onClick={() => handleFeaturedTokenClick(token)}
              >
                <img
                  src={token.logoURI || token.image}
                  alt={token.name}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => (e.target.src = "path/to/fallback/image.png")}
                />
                <p className="text-white text-xs mt-0 ms-2">{token.symbol || token.ticker}</p>
              </div>
            ))}
          </div>
          <hr className="h-px my-8 bg-gray-200 border-[#3b3c4e] d" />

          <div className="mt-6">
            <div className="flex justify-between gap-4 items-center">
              <p className="text-white text-xl font-medium roboto leading-relaxed tracking-wide">
                Token Name
              </p>
            </div>

            <SortedTokenList />

            {isLoading && (
              <div className="text-white text-center mt-4">Loading...</div>
            )}

            {error && (
              <div className="text-red-500 text-center mt-4">{error}</div>
            )}

            {tokenDetails && (
              <TokenListItem
                token={tokenDetails}
                walletAddress={walletAddress}
                onClick={handleTokenSelect}
              />
            )}

            <div className="my-6">
              <img src={Arrow} alt="Arrow" className="mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Token;
