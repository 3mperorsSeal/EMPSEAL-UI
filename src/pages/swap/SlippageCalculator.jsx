import React, { useState, useEffect } from 'react';

const calculateSlippage = (amountOut, slippagePercent) => {
  if (slippagePercent < 0.1 || slippagePercent > 5) {
    throw new Error('Invalid slippage percentage. Must be between 0.1 and 5.');
  }
  return (
    (amountOut * BigInt(10000 - Math.round(slippagePercent * 100))) /
    BigInt(10000)
  );
};

const SlippageCalculator = ({ tradeInfo, onSlippageCalculated, onClose }) => {
  const [slippage, setSlippage] = useState(0);
  const [customSlippage, setCustomSlippage] = useState(''); // For the input field

  const handleSlippageSelect = (value) => {
    setSlippage(value);
    calculateAdjustedAmount(value);
  };

  const handleCustomSlippageChange = (e) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0 || value > 5) {
      return;
    }
    setCustomSlippage(value);
    setSlippage(value);
    calculateAdjustedAmount(value);
  };

  const calculateAdjustedAmount = (slippageValue) => {
    try {
      if (tradeInfo && tradeInfo.amountOut) {
        const adjustedAmount = calculateSlippage(
          tradeInfo.amountOut,
          slippageValue
        );
        const decimalAdjusted = Number(adjustedAmount) / 10 ** 18;
        onSlippageCalculated(decimalAdjusted);
      }
    } catch (error) {
      console.error('Error calculating slippage:', error);
    }
  };

  useEffect(() => {
    if (tradeInfo && tradeInfo.amountOut) {
      calculateAdjustedAmount(slippage);
    }
  }, [tradeInfo]);

  const slippageOptions = [0.5, 1.0]; // Predefined options (buttons)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-black border border-white rounded-xl p-6 w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-white text-xl font-bold mb-4">Slippage Settings</h2>

        <div className="flex gap-2 items-center">
          {slippageOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSlippageSelect(option)}
              className={`px-4 py-1.5 rounded ${
                slippage === option
                  ? 'bg-[#FF9900] text-black'
                  : 'bg-[#161616] text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}%
            </button>
          ))}

          {/* Custom input for the fourth option */}
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="5"
            value={customSlippage}
            onChange={handleCustomSlippageChange}
            className="w-16 px-2 py-1 rounded bg-[#161616] text-white text-center focus:outline-none border border-white"
            placeholder="%"
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-black  text-white rounded border-[2px] border-[#FF9900]  roboto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlippageCalculator;