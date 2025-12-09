import React, { useState, useEffect, useRef } from "react";
import { useGetChains } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import { ChevronDown, Search, ArrowUpDown } from "lucide-react";

const ChainDropdown = ({
  chains,
  selectedChainId,
  onSelectChain,
  label,
  bgColor = "bg-black",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const selectedChain = chains.find((c) => c.chain === selectedChainId);
  const filteredChains = chains.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (chainId) => {
    onSelectChain(chainId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const renderChain = (chain, isSelected = false) => {
    const githubLogoUrl = `https://raw.githubusercontent.com/Cryptorubic/rubic-app/refs/heads/master/src/assets/images/icons/coins/${chain.name
      .toLowerCase()
      .replace(/\s+/g, "")}.svg`;
    const defiLlamaUrl = `https://defillama.com/chain-icons/rsz/${chain.name.toLowerCase()}.jpg`;

    const handleImageError = (e) => {
      const currentSrc = e.target.src;
      if (currentSrc === githubLogoUrl) {
        e.target.src = defiLlamaUrl; // Fallback to DefiLlama if GitHub URL fails
      } else {
        e.target.style.display = "none"; // Hide image if all fallbacks fail
      }
    };

    return (
      <div
        key={chain.chain}
        className={`flex items-center space-x-3 ${isSelected ? "" : "p-2"}`}
      >
        <img
          src={chain.logoURI || githubLogoUrl} // Prioritize API logo, then GitHub
          alt={chain.name}
          className="w-6 h-6 rounded-full"
          onError={handleImageError}
        />
        <span>{chain.name}</span>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label> */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${bgColor} border border-white rounded-lg md:px-3 px-2 md:py-4 py-2 flex gap-1 items-center transition-all duration-200`}
      >
        {(() => {
          const text = selectedChain
            ? selectedChain.name || selectedChain
            : "Select Chain";

          const length = text.toString().length;

          const fontSizeClass =
            length > 11 ? "text-xs" : length > 14 ? "text-sm" : "text-base";

          return (
            <span className={`whitespace-nowrap ${fontSizeClass}`}>
              {selectedChain ? renderChain(selectedChain, true) : text}
            </span>
          );
        })()}

        <ChevronDown
          size={20}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black border border-white rounded-lg md:px-4 px-2 md:py-3 py-2 flex gap-2 items-center text-white"
      >
        {selectedChain ? renderChain(selectedChain, true) : "Select Chain"}
        <ChevronDown
          size={20}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button> */}

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-black rounded-lg shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search chain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black text-white rounded-md pl-10 pr-4 py-2 focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-grow">
            {filteredChains.map((chain) => (
              <div
                key={chain.chain}
                onClick={() => handleSelect(chain.chain)}
                className="p-2 hover:bg-[#FF9900]/10 cursor-pointer text-white"
              >
                {renderChain(chain)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChainSelector = ({ onSwitch }) => {
  const { data: chains, isLoading, error } = useGetChains();
  const { fromChainId, toChainId, setFromChain, setToChain } =
    useGasBridgeStore();

  // const handleSwitch = () => {
  //   const currentFrom = fromChainId;
  //   const currentTo = toChainId;
  //   setFromChain(currentTo);
  //   setToChain(currentFrom);
  // };
  useEffect(() => {
    if (onSwitch) {
      onSwitch(() => {
        const currentFrom = fromChainId;
        const currentTo = toChainId;
        setFromChain(currentTo);
        setToChain(currentFrom);
      });
    }
  }, [fromChainId, toChainId]);

  if (isLoading)
    return <div className="text-center text-gray-400">Loading chains...</div>;
  if (error)
    return (
      <div className="text-center text-red-500">Error fetching chains.</div>
    );

  // The API response for chains is missing a logoURI, so I'm adding one for display purposes.
  // Also, the chain ID is under the `chain` property, not `id`.
  const formattedChains = chains.map((c) => ({
    ...c,
    id: c.chain,
    logoURI: c.logo,
  }));

  return (
    <div className="space-y-4 md:h-[455px] h-[400px] flex justify-between flex-col">
      {/* <h2 className="text-xl font-semibold text-white">Select Chains</h2> */}
      <ChainDropdown
        // label="From"
        chains={formattedChains}
        selectedChainId={fromChainId}
        onSelectChain={setFromChain}
        bgColor="bg-black text-white"
      />
      {/* <div className="flex justify-center items-center -my-2">
        <button
          onClick={handleSwitch}
          disabled={!fromChainId && !toChainId}
          className="z-10 p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Switch from and to chains"
        >
          <ArrowUpDown size={18} />
        </button>
      </div> */}
      <ChainDropdown
        // label="To"
        chains={formattedChains.filter((c) => c.chain !== fromChainId)}
        selectedChainId={toChainId}
        onSelectChain={setToChain}
        bgColor="bg-[#FFE6C0] text-black border-black"
      />
    </div>
  );
};

export default ChainSelector;
