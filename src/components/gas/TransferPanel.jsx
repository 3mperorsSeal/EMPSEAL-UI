import { useState, useEffect, useRef } from "react";
import { useAccount, useBalance } from "wagmi";
import { useGasBridgeStore } from "../../redux/store/gasBridgeStore";
import { useGetCalldataQuote } from "../../hooks/useGasBridgeAPI";
import { useGasBridgeTx } from "../../hooks/useGasBridgeTx";
import { formatEther, parseEther } from "viem";
import { toast } from "react-toastify";
import Sellbox from "../../assets/images/sell-box.png";
import Buybox from "../../assets/images/buy-bg.png";
import Swapbutton from "../../assets/images/swap-button.svg";
import Rbox from "../../assets/images/r-d.png";
import ChainSelector from "../../components/gas/ChainSelector";
import UpDownAr from "../../assets/images/reverse.svg";

// A simple debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const TransferPanel = () => {
  const { address: connectedAddress } = useAccount();
  const {
    fromChainId,
    toChainId,
    amount,
    recipientAddress,
    setAmount,
    setRecipientAddress,
  } = useGasBridgeStore();

  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address: connectedAddress,
    chainId: fromChainId,
  });

  // console.log(
  //   "calldata input data: ",
  //   fromChainId,
  //   toChainId,
  //   amount,
  //   recipientAddress,
  //   connectedAddress
  // );

  // Set recipient to connected address by default
  useEffect(() => {
    if (connectedAddress) {
      setRecipientAddress(connectedAddress);
    }
  }, [connectedAddress, setRecipientAddress]);

  const debouncedAmount = useDebounce(amount, 500); // 500ms debounce

  const {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useGetCalldataQuote({
    fromChain: fromChainId,
    toChain: toChainId,
    amount: debouncedAmount,
    toAddress: recipientAddress,
    fromAddress: connectedAddress,
  });

  // console.log("Calldata quote data: ", quoteData);

  const { executeBridge, isSending, isConfirming } = useGasBridgeTx();

  const handleBridgeClick = () => {
    const txDetails = quoteData?.contractDepositTxn; // Get the transaction details object

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount to bridge.");
      return;
    }
    if (!txDetails?.to) {
      // Check if the 'to' address is available
      toast.error("Could not get routing address from the API quote.");
      return;
    }
    if (!txDetails?.data) {
      // Check if the 'data' is available
      toast.error("Could not retrieve transaction data from the API quote.");
      return;
    }
    if (!txDetails?.value) {
      // Check if the 'value' is available
      toast.error("Could not retrieve transaction value from the API quote.");
      return;
    }

    executeBridge({
      to: txDetails.to,
      value: BigInt(txDetails.value), // Convert hex string to BigInt for wagmi
      data: txDetails.data,
    });
  };

  const expectedAmountInWei = quoteData?.quotes?.[0]?.expected ?? "0";
  let formattedExpectedAmount = "0.0000";
  if (BigInt(expectedAmountInWei) > 0) {
    const expectedAmountInEth = formatEther(BigInt(expectedAmountInWei));
    formattedExpectedAmount = parseFloat(expectedAmountInEth).toFixed(6);
  }
  const switchRef = useRef(null);

  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const balance = balanceData ? Number(balanceData.formatted) : 0;

  const handlePercentageChange = (percentage) => {
    if (!balance || balance <= 0) return;

    const calculatedAmount = (balance * percentage) / 100;

    setSelectedPercentage(percentage);
    setAmount(calculatedAmount.toString());
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);

    if (!balance || !value || isNaN(value)) {
      setSelectedPercentage(null);
      return;
    }

    const numericValue = Number(value);

    // Clamp amount to balance
    if (numericValue > balance) {
      setAmount(balance.toString());
      setSelectedPercentage(100);
      return;
    }

    const percent = Math.round((numericValue / balance) * 100);

    if ([25, 50, 75, 100].includes(percent)) {
      setSelectedPercentage(percent);
    } else {
      setSelectedPercentage(null);
    }
  };
  // Function to format the number with commas
  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ""); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };
  const getDynamicFontSize = (value, desktop = 48, mobile = 36) => {
    const length = value?.replace(/\D/g, "").length || 0;
    const baseSize = window.innerWidth >= 768 ? desktop : mobile;

    return Math.max(12, baseSize - length * 1.5);
  };
  return (
    <>
      <div className="w-full md;px-0 px-4">
        <div className="relative h-[200px] flex justify-center items-center md:max-w-[730px] w-full py-4 mt-2 mx-auto">
          <div className="flex md:max-w-[730px] w-full py-4 mt-2 relative">
            <div className="flex w-full justify-between rounded-2xl py-4 scales-b scales-top-1 ">
              <img className="bg-sell" src={Sellbox} alt="sellbox" />
              <div className="flex justify-between gap-3 items-center md:pl-8 pl-4">
                <h2 className="font-orbitron text-dark-400 text-2xl font-semibold leading-normal text-black relative md:top-[-35px] top-[-40px]">
                  From
                </h2>
                <div className="text-center absolute top-[-30px] right-0 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 bg-[#FFE6C0] md:text-sm text-xs px-2 py-2 text-black">
                  <span className="font-extrabold font-orbitron leading-normal">
                    BAL
                  </span>
                  <span className="font-bold font-orbitron leading-normal">
                    {" "}
                    :{" "}
                  </span>
                  <span className="rigamesh leading-normal">
                    {isBalanceLoading ? (
                      <span>Fetching balance...</span>
                    ) : balanceData ? (
                      <span>
                        {parseFloat(balanceData.formatted).toFixed(8)}{" "}
                        {balanceData.symbol}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
              <div>
                <div className="relative md:pr-8 pr-5 flex-flex-col justify-end items-end w-full md:top-12 md:mt-0 mt-10">
                  <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-20px] md:ml-0 ml-[-40px] justify-end">
                    {[25, 50, 75, 100].map((value) => (
                      <button
                        key={value}
                        type="button"
                        // disabled={isLoading}
                        disabled={isBalanceLoading || !balance}
                        onClick={() => handlePercentageChange(value)}
                        className={`py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
        ${
          selectedPercentage === value
            ? "bg-black text-white"
            : "bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
        }`}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const formattedValue = formatNumber(
                      amount?.toString() || ""
                    );

                    const defaultFontSize = 48;
                    const minFontSize = 32;

                    const FREE_DIGITS = 7;
                    const SHRINK_RATE = 3;

                    // count digits only (ignore commas & decimals)
                    const outputLength = formattedValue.replace(
                      /\D/g,
                      ""
                    ).length;

                    const excessDigits = Math.max(
                      0,
                      outputLength - FREE_DIGITS
                    );

                    const dynamicFontSize = Math.max(
                      minFontSize,
                      defaultFontSize - excessDigits * SHRINK_RATE
                    );

                    return (
                      <>
                        <input
                          id="amount"
                          type="text"
                          value={amount}
                          onChange={handleAmountChange}
                          placeholder="0.1"
                          className="text-[#000000] py-2 text-sh text-end w-full leading-7 outline-none border-none bg-transparent token_input px-1 rigamesh placeholder-black transition-all duration-200 ease-in-out"
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />
                      </>
                    );
                  })()}
                  {/* {(() => {
                    const inputLength =
                      amount?.toString().replace(/\D/g, "").length || 0;

                    const fontSizeClass =
                      inputLength > 12
                        ? "md:text-[24px] text-xl !text-[#000]"
                        : inputLength > 8
                        ? "md:text-[32px] text-2xl !text-[#000]"
                        : "md:text-[40px] text-2xl !text-[#000]";

                    return (
                      <>
                        <input
                          id="amount"
                          type="text"
                          value={amount}
                          onChange={handleAmountChange}
                          placeholder="0.1"
                          className={`w-full text-[#000] py-2 font-bold text-end leading-7 outline-none border-none bg-transparent px-1 font-orbitron placeholder-black transition-all duration-200 ease-in-out ${fontSizeClass}`}
                          style={{
                            fontSize: `${Math.max(
                              12,
                              40 - amount.toString().length * 1.5
                            )}px`,
                          }}
                        />
                      </>
                    );
                  })()} */}
                </div>
                <div
                  // onClick={() => {
                  //   if (!isBalanceLoading && balanceData) {
                  //     setAmount(balanceData.formatted);
                  //   }
                  // }}
                  onClick={() => {
                    if (!isBalanceLoading && balanceData) {
                      setAmount(balance.toString());
                      setSelectedPercentage(100);
                    }
                  }}
                  className="relative md:pr-8 pr-5 flex-flex-col justify-end items-end w-full cursor-pointer md:top-12"
                >
                  <p className="ml-auto py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[100px] w-[100px] px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black">
                    Max Amount
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute md:left-[-40px] left-[-10px] top-20 z-20">
              <ChainSelector
                onSwitch={(fn) => {
                  switchRef.current = fn;
                }}
              />
            </div>
          </div>
        </div>
        {/*  */}
        <button
          onClick={() => switchRef.current && switchRef.current()}
          className="cursor-pointer md:mt-20 md:mb-8 mt-16 mb-8 flex scales-b scales-top-2 mx-auto md:w-[70px] w-12"
        >
          <img
            src={UpDownAr}
            alt="Ar"
            className="hoverswap transition-all rounded-xl"
          />
        </button>
        {/*  */}
        <div className="relative h-[200px] flex justify-center items-center text-white scales-b scales-top">
          <img className="bg-sell" src={Buybox} alt="Buybox" />

          <div className="md:max-w-[730px] w-full px-4 py-4 mt-2">
            <div className="flex w-full justify-between rounded-2xl py-4 px-1">
              <div className="flex justify-between gap-3 items-center lg:px-2">
                <h2 className="font-orbitron text-dark-400 text-2xl font-semibold leading-normal text-[#FF9900] relative top-[-20px]">
                  You will receive
                </h2>
                {/*  */}
              </div>
            </div>
            <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:mt-0 mt-[-20px] md:ml-0 ml-[-40px] justify-end">
              {[25, 50, 75, 100].map((value) => (
                <button
                  key={value}
                  type="button"
                  // disabled={isLoading}
                  disabled={isBalanceLoading || !balance}
                  onClick={() => handlePercentageChange(value)}
                  className={`py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
        ${
          selectedPercentage === value
            ? "bg-black text-white"
            : "bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
        }`}
                >
                  {value}%
                </button>
              ))}
            </div>
            {(() => {
              const value = formattedExpectedAmount || "";

              const defaultFontSize = 48;
              const minFontSize = 32;

              const FREE_DIGITS = 7;
              const SHRINK_RATE = 3;
              const outputLength = value.replace(/\D/g, "").length;

              const excessDigits = Math.max(0, outputLength - FREE_DIGITS);

              const dynamicFontSize = Math.max(
                minFontSize,
                defaultFontSize - excessDigits * SHRINK_RATE
              );

              return (
                <div className="w-full py-2 text-end px-1 font-orbitron transition-all duration-200 ">
                  <span
                    className={`font-bold text-white`}
                    style={{
                      fontSize: `${dynamicFontSize}px`,
                    }}
                  >
                    {isQuoteLoading ? "Loading quote..." : value}
                  </span>

                  {quoteError && (
                    <p className="text-[#FF9900] text-xs mt-2">
                      Could not fetch quote. Please check inputs.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="md:max-w-[818px] mx-auto w-full md:px-4 px-2 justify-center xl:gap-4 gap-4 items-start 2xl:pt-2 py-2 mt-4 scales-b scales-top">
          <div className="md:my-14 my-7 relative">
            <label className="block md:text-2xl text-sm font-medium text-gray-300 mb-6 roboto">
              Recipient Address
            </label>
            <div className="relative w-full h-[120px]">
              <img className="bg-rb" src={Rbox} alt="Rbox" />
              <input
                type="text"
                id="recipient"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="absolute inset-0 top-0 bottom-0 my-auto w-full h-full pl-10 pr-4 py-3 bg-transparent text-white roboto md:text-2xl text-sm truncate outline-none"
              />
            </div>
          </div>
          <div className="md:px-1 px-4 md:pt-10 pt-5">
            <button
              onClick={handleBridgeClick}
              disabled={!quoteData || isSending || isConfirming}
              type="button"
              className="w-full cursor-pointer button-trans text-center h-[108px] flex justify-center items-center rounded-xl hover:opacity-80 transition-all hover:text-black hover:bg-transparent font-orbitron text-black lg:text-2xl text-base font-extrabold"
            >
              <img
                className="absolute swap-button1 top-0 bottom-0 my-auto"
                src={Swapbutton}
                alt="Swap"
              />
              <span className="h-20">
                {" "}
                {isSending
                  ? "Check Wallet..."
                  : isConfirming
                  ? "Bridging..."
                  : "Bridge"}
              </span>
            </button>
          </div>
        </div>
      </div>
      {/*  */}
    </>
  );
};

export default TransferPanel;
