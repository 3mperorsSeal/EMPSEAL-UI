import React, { useState, useRef, useEffect } from "react";
import S from "../../assets/images/s.svg";
import Three from "../../assets/images/324.svg";
import Refresh from "../../assets/images/refresh.svg";
import Info from "../../assets/images/info.svg";
import { formatUnits } from "viem";
import Transaction from "./Transaction";

const Amount = ({
  onClose,
  amountIn,
  amountOut,
  tokenA,
  singleToken,
  tokenB,
  refresh,
  confirm,
  disabled = false,
  showPriceAlert,
  newQuote,
  initialQuote,
  percentChange,
  onAcceptNewQuote,
  onRejectNewQuote,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirm, setConfirm] = useState(false);
  const modalRef = useRef(null);
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

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await confirm();
    } catch (error) {
      console.error("Confirmation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split(".");
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to integer part

    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };
  
  const isIncrease = percentChange > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div ref={modalRef} className="bg-black border border-white p-6 roboto rounded-xl w-full max-w-md relative">
        <div className="text-white text-xl font-bold roboto mb-4">Confirm Swap</div>
        
        {/* <div className="flex justify-between items-center"> */}
        <div className="mt-6">
          <div className="text-amber-600 text-sm font-normal roboto leading-normal">
            You Pay
          </div>
          <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
            {formatNumber(amountIn)}
            <img src={tokenA.image} alt="S" className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-6">
          <div className="text-amber-600 text-sm font-normal roboto leading-normal">
            You Receive
          </div>
          <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
            {formatNumber(amountOut)}
            <img src={tokenB.image} alt="S" className="w-4 h-4" />
          </div>
        </div>
        {/* </div> */}

        <div className="mt-6 text-gray-40 text-white text-sm font-normal roboto leading-normal">
          Output is estimated. You will receive at least{" "}
          {formatNumber(amountOut)} {tokenB.ticker} or the transaction will
          revert
        </div>

        <div className="flex justify-between gap-3 items-center w-full mt-6">
          <div className="text-gray-400 text-sm font-normal roboto leading-normal">
            Price
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-right text-white text-sm font-normal roboto leading-normal">
              1 {tokenA.ticker} ={" "}
              {singleToken &&
              singleToken.amounts &&
              singleToken.amounts[singleToken.amounts.length - 1]
                ? parseFloat(
                    formatUnits(
                      singleToken.amounts[singleToken.amounts.length - 1],
                      parseInt(tokenB.decimal)
                    )
                  ).toFixed(6)
                : "0"}{" "}
              {tokenB.ticker}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 items-center w-full mt-2">
          <div className="flex gap-2 items-center">
            <div className="text-gray-400 text-sm font-normal roboto leading-normal">
              Minimum received
            </div>
            <img src={Info} alt="Info" />
          </div>
          <div className="text-right text-white text-sm font-normal roboto leading-normal">
            {formatNumber(amountOut)} {tokenB.ticker}
          </div>
        </div>
        {showPriceAlert && (
          <div className="p-4 rounded-lg w-full mt-2 mb-4 border border-[#FF9900]">
            <h3 className="text-lg font-semibold mb-2 text-[#FF9900]">
              Price Update
            </h3>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-300">
                The price has {isIncrease ? 'increased' : 'decreased'} by {" "}
                <span className={isIncrease ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(percentChange).toFixed(2)}%
                </span>
              </p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Original:</span>
                <span className="text-gray-200">{parseFloat(initialQuote || 0).toFixed(6)} {tokenB.ticker}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">New:</span>
                <span className={`font-medium ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(newQuote || 0).toFixed(6)} {tokenB.ticker}
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onAcceptNewQuote}
                className="flex-1 px-4 py-2 bg-[#FF9900] text-black rounded-xl hover:bg-opacity-80 transition-colors text-sm font-bold"
              >
                Accept
              </button>
              {/* <button
                onClick={onRejectNewQuote}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors text-sm"
              >
                Reject
              </button> */}
            </div>
          </div>
        )}

        <button
          onClick={handleClick}
          disabled={disabled || isLoading || showPriceAlert}
          className="w-full rounded-xl px-4 py-4 bg-[#FF9900] flex gap-4 font-bold items-center mt-6 justify-center hover:bg-transparent border border-[#FF9900] hover:text-[#FF9900] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? "Processing..." : "Confirm Swap"}
        </button>

        {isConfirm && <Transaction onClose={() => setConfirm(false)} />}
      </div>
    </div>
  );
};

export default Amount;
