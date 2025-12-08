import React, { useState, useEffect, useRef } from "react";
import { useGetChains } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import { ChevronDown, Search, ArrowUpDown } from "lucide-react";

const ChainDropdown = ({ chains, selectedChainId, onSelectChain, label }) => {
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
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-700 p-2 rounded-md flex justify-between items-center text-white"
      >
        {selectedChain ? renderChain(selectedChain, true) : "Select Chain"}
        <ChevronDown
          size={20}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 flex flex-col">
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
                className="w-full bg-gray-900 text-white rounded-md pl-10 pr-4 py-2 focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-grow">
            {filteredChains.map((chain) => (
              <div
                key={chain.chain}
                onClick={() => handleSelect(chain.chain)}
                className="p-2 hover:bg-gray-700 cursor-pointer text-white"
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

const ChainSelector = () => {
  const { data: chains, isLoading, error } = useGetChains();
  const { fromChainId, toChainId, setFromChain, setToChain } =
    useGasBridgeStore();

  const handleSwitch = () => {
    const currentFrom = fromChainId;
    const currentTo = toChainId;
    setFromChain(currentTo);
    setToChain(currentFrom);
  };

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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Select Chains</h2>
      <ChainDropdown
        label="From"
        chains={formattedChains}
        selectedChainId={fromChainId}
        onSelectChain={setFromChain}
      />
      <div className="flex justify-center items-center -my-2">
        <button
          onClick={handleSwitch}
          disabled={!fromChainId && !toChainId}
          className="z-10 p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Switch from and to chains"
        >
          <ArrowUpDown size={18} />
        </button>
      </div>
      <ChainDropdown
        label="To"
        chains={formattedChains.filter((c) => c.chain !== fromChainId)}
        selectedChainId={toChainId}
        onSelectChain={setToChain}
      />
    </div>
  );
};

export default ChainSelector;
