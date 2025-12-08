import { useState, useEffect } from "react";
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

  console.log(
    "calldata input data: ",
    fromChainId,
    toChainId,
    amount,
    recipientAddress,
    connectedAddress
  );

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

  console.log("Calldata quote data: ", quoteData);

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
  let formattedExpectedAmount = "0.000000";
  if (BigInt(expectedAmountInWei) > 0) {
    const expectedAmountInEth = formatEther(BigInt(expectedAmountInWei));
    formattedExpectedAmount = parseFloat(expectedAmountInEth).toFixed(6);
  }

  return (
    <>
      <div className="w-full">
        <div className="relative h-[200px] flex justify-center items-center">
          <img className="bg-sell" src={Sellbox} alt="sellbox" />

          <div className="flex md:max-w-[700px] w-full px-4 py-4 mt-2">
            <div className="flex w-full justify-between rounded-2xl py-4 lg:px-8 px-3">
              <div className="flex justify-between gap-3 items-center lg:px-2">
                <h2 className="font-orbitron text-dark-400 text-2xl font-semibold leading-normal text-black">
                  Source
                </h2>
              </div>
              <div className="">
                <div className="flex justify-center gap-4 items-center cursor-pointer md:h-[56px] h-12 md:w-[170px] w-[100px] bg-[#FFE6C0] md:px-3 px-1 py-0 rounded-lg relative">
                  <ChainSelector />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative h-[200px] flex justify-center items-center text-white mt-16">
          <img className="bg-sell" src={Buybox} alt="Buybox" />

          <div className="md:max-w-[700px] w-full px-4 py-4 mt-2">
            <div className="flex w-full justify-between rounded-2xl py-4 lg:px-8 px-3">
              <div className="flex justify-between gap-3 items-center lg:px-2">
                <h2 className="font-orbitron text-dark-400 text-2xl font-semibold leading-normal text-[#FF9900]">
                  Amount Per Chain
                </h2>
                <div className="text-center absolute -top-4 right-0 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 bg-[#FFE6C0] md:text-sm text-xs px-2 py-2 text-black">
                  <span className="font-bold font-orbitron leading-normal">
                    BAL
                  </span>
                  <span className="font-bold font-orbitron leading-normal">
                    {" "}
                    :{" "}
                  </span>
                  <span className="font-bold font-orbitron leading-normal">
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
            </div>
            <div className="relative md:pr-5 pr-5 flex-flex-col justify-end items-end w-full">
              {(() => {
                const inputLength =
                  amount?.toString().replace(/\D/g, "").length || 0;

                const fontSizeClass =
                  inputLength > 12
                    ? "md:text-[24px] text-xl !text-[#fff]"
                    : inputLength > 8
                    ? "md:text-[32px] text-2xl !text-[#fff]"
                    : "md:text-[40px] text-2xl !text-[#fff]";

                return (
                  <>
                    <input
                      id="amount"
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.1"
                      className={`w-full text-[#fff] py-2 font-bold text-end leading-7 outline-none border-none bg-transparent px-1 font-orbitron placeholder-white transition-all duration-200 ease-in-out ${fontSizeClass}`}
                      style={{
                        fontSize: `${Math.max(
                          12,
                          40 - amount.toString().length * 1.5
                        )}px`,
                      }}
                    />
                  </>
                );
              })()}
            </div>
            <div
              onClick={() => {
                if (!isBalanceLoading && balanceData) {
                  setAmount(balanceData.formatted);
                }
              }}
              className="relative md:pr-5 pr-5 flex-flex-col justify-end items-end w-full cursor-pointer"
            >
              <p className="roboto uppercase text-white font-semibold text-right">
                (max)
              </p>
            </div>
          </div>
        </div>
        <div className="md:mt-20 mt-10 relative">
          <label className="block md:text-2xl text-sm font-medium text-gray-300 mb-6 roboto">
            You will receive:
          </label>
          <div className="relative w-full h-[120px]">
            <img className="bg-rb" src={Rbox} alt="Rbox" />
            <div className="absolute inset-0 top-0 bottom-0 my-auto w-full h-full flex items-center pl-10 pr-4 py-3 bg-transparent text-white roboto md:text-2xl text-sm truncate outline-none">
              {isQuoteLoading ? (
                <span>Loading quote...</span>
              ) : (
                <span>{formattedExpectedAmount}</span>
              )}
            </div>
          </div>
        </div>
        {quoteError && (
          <p className="text-[#FF9900] text-xs mt-2">
            Could not fetch quote. Please check inputs.
          </p>
        )}
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
            className="w-full cursor-pointer button-trans text-center h-[108px] flex justify-center items-center rounded-xl hover:opacity-80 transition-all hover:text-black hover:bg-transparent font-orbitron text-black lg:text-2xl text-base font-bold"
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
      {/*  */}
    </>
  );
};

export default TransferPanel;
