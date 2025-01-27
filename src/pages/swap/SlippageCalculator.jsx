import React, { useState, useEffect, useRef } from "react";

// Helper function to calculate slippage
const calculateSlippage = (amountOut, slippagePercent) => {
  if (slippagePercent < 0 || slippagePercent > 5) {
    throw new Error("Invalid slippage percentage. Must be between 0.5 and 5");
  }
  return (
    (amountOut * BigInt(10000 - Math.round(slippagePercent * 100))) /
    BigInt(10000)
  );
};

const SlippageCalculator = ({ tradeInfo, onSlippageCalculated, onClose }) => {
  const [slippage, setSlippage] = useState(0);
  const [customSlippage, setCustomSlippage] = useState("");
  const [slippageApplied, setSlippageApplied] = useState(false);
  const [error, setError] = useState("");
  const originalAmountRef = useRef(null);
  const modalRef = useRef(null);

  const lastAmount = tradeInfo?.amounts?.[tradeInfo?.amounts?.length - 1];

  // Validate trade info on mount
  useEffect(() => {
    if (!tradeInfo?.amounts || tradeInfo.amounts.length === 0) {
      setError("Please provide token input values before applying slippage.");
    } else {
      setError("");
    }
  }, [tradeInfo]);

  // Store original amount when tradeInfo changes and ref is empty
  useEffect(() => {
    if (tradeInfo?.amountOut && !originalAmountRef.current) {
      originalAmountRef.current = lastAmount;
    }
  }, [tradeInfo?.amountOut, lastAmount]);

  // Calculate slippage when necessary
  useEffect(() => {
    if (
      originalAmountRef.current &&
      slippage >= 0 &&
      slippage <= 5 &&
      !slippageApplied &&
      !error
    ) {
      try {
        // Always calculate based on original amount
        const adjustedAmount = calculateSlippage(lastAmount, slippage);
        onSlippageCalculated(adjustedAmount);
        setSlippageApplied(true);
      } catch (error) {
        console.error("Error calculating slippage:", error);
        setError(error.message);
      }
    }
  }, [slippage, onSlippageCalculated, slippageApplied, error, lastAmount]);

  // Handle slippage option selection
  const handleSlippageSelect = (value) => {
    if (error) return; // Prevent selection if there's an error
    if (slippage !== value) {
      setSlippage(value);
      setCustomSlippage(value.toString());
      setSlippageApplied(false);
    }
  };

  // Handle custom slippage input change
  const handleCustomSlippageChange = (e) => {
    if (error) return; // Prevent input if there's an error

    const inputValue = e.target.value;
    if (inputValue === "") {
      setCustomSlippage("");
      return;
    }

    const value = parseFloat(inputValue);
    if (isNaN(value) || value < 0 || value > 5) return;

    setCustomSlippage(inputValue);
    setSlippage(value);
    setSlippageApplied(false);
  };

  // Reset slippage state and calculate immediately
  const handleResetSlippage = () => {
    if (error) return; // Prevent reset if there's an error

    if (originalAmountRef.current) {
      try {
        const defaultSlippage = 0;
        const adjustedAmount = calculateSlippage(
          originalAmountRef.current,
          defaultSlippage
        );
        onSlippageCalculated(adjustedAmount);
        setSlippage(defaultSlippage);
        setCustomSlippage("");
        setSlippageApplied(true);
      } catch (error) {
        console.error("Error resetting slippage:", error);
        setError(error.message);
      }
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setSlippageApplied(false);
    setError("");
    originalAmountRef.current = null;
    onClose();
  };

  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleModalClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const slippageOptions = [0.0, 0.5, 1.0, 2.0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-black border border-white rounded-xl p-6 w-full max-w-md relative"
      >
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-white text-xl font-bold mb-4">Slippage Settings</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-2 items-center">
          {slippageOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSlippageSelect(option)}
              className={`px-4 py-1.5 rounded ${
                slippage === option
                  ? "bg-[#FF9900] text-black"
                  : "bg-[#161616] text-gray-300 hover:bg-gray-600"
              } ${error ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!!error}
            >
              {option}%
            </button>
          ))}

          <input
            type="text"
            inputMode="decimal"
            value={customSlippage}
            onChange={handleCustomSlippageChange}
            className={`w-16 px-2 py-1 rounded bg-[#161616] text-white text-center focus:outline-none border border-white ${
              error ? "opacity-50 cursor-not-allowed" : ""
            }`}
            placeholder="%"
            disabled={!!error}
          />
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={handleResetSlippage}
            className={`px-4 py-1 bg-[#FF9900] text-black rounded border-[2px] border-[#FF9900] roboto ${
              error ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!!error}
          >
            Reset Slippage
          </button>

          <button
            onClick={handleModalClose}
            className="px-4 py-1 bg-black text-white rounded border-[2px] border-[#FF9900] roboto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlippageCalculator;
