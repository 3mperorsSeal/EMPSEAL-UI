import React, { useEffect, useState } from "react";
import Logo from "../../assets/images/swap-emp.png";
import Sett from "../../assets/images/setting.png";
import Ar from "../../assets/images/arrow.svg";
import Usdc from "../../assets/images/usdc.svg";
import Refresh from "../../assets/images/refresh.svg";
import Info from "../../assets/images/info.svg";
import { Link } from "react-router-dom";
import Amount from "./Amount";
import Token from "./Token";
import { formatEther } from "viem";
import { useAccount, useReadContract, useWatchBlocks, useBalance } from "wagmi";
import SlippageCalculator from "./SlippageCalculator";
import { RouterABI } from "./routerAbi";
import { formatUnits } from "viem";
import Tokens from "../tokenList.json";
import { swapTokens } from "../../utils/contractCalls";
import { useStore } from "../../redux/store/routeStore";
import Transcation from "./Transcation";
import { Copy, Check } from "lucide-react";

const Emp = ({ setPadding }) => {
  const [isAmountVisible, setAmountVisible] = useState(false);
  const [isSlippageVisible, setSlippageVisible] = useState(false);
  const [isSlippageApplied, setIsSlippageApplied] = useState(false);
  const [isTokenVisible, setTokenVisible] = useState(false);
  const [order, setOrder] = useState(false);
  const [selectedTokenA, setSelectedTokenA] = useState(Tokens[0]);
  const [isRateReversed, setIsRateReversed] = useState(false);
  const [selectedTokenB, setSelectedTokenB] = useState(Tokens[1]);
  const [isSelectingTokenA, setIsSelectingTokenA] = useState(true);
  const [amountOut, setAmountOut] = useState("0");
  const [amountIn, setAmountIn] = useState("0");
  const [swapStatus, setSwapStatus] = useState("IDLE");
  const [swapHash, setSwapHash] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [tradeInfo, setTradeInfo] = useState(undefined);
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const { address, chain } = useAccount();
  const [balanceAddress, setBalanceAddress] = useState(null);
  const { data: datas } = useBalance({ address });
  const [fees, setFees] = useState(0);
  const [minAmountOut, setMinAmountOut] = useState("0");
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTokenAddress, setActiveTokenAddress] = useState(null);
  const [usdValue, setUsdValue] = useState("0.00");
  const [usdValueTokenB, setUsdValueTokenB] = useState("0.00");
  const [conversionRate, setConversionRate] = useState(null);
  const [conversionRateTokenB, setConversionRateTokenB] = useState(null);
  const handleCloseSuccessModal = () => {
    setSwapStatus("IDLE"); // Reset status when closing modal
  };

  useEffect(() => {
    if (address && datas) {
      setBalanceAddress(formatEther(datas.value));
    } else if (!address) {
      setBalanceAddress("0.00");
    }
  }, [address, datas]);

  const formattedBalance = balanceAddress
    ? `${parseFloat(balanceAddress).toFixed(6)}`
    : "0.00";

  function setRoute(path) {
    useStore.setState({ route: path });
  }

  function setPath(path) {
    useStore.setState({ path: path });
  }

  function setAdapter(adapter) {
    useStore.setState({ adapter: adapter });
  }

  const { data: tokenBalance, isLoading } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenA.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalance = tokenBalance
    ? parseFloat(tokenBalance.formatted).toFixed(6) // Format to 6 decimal places
    : "0.000000";

  const { data: tokenBBalance } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenB.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalanceTokenB = tokenBBalance
    ? parseFloat(tokenBBalance.formatted).toFixed(6) // Format to 6 decimal places
    : "0.000000";

  const handlePercentageChange = (e) => {
    const percentage = e.target.value === "" ? "" : parseInt(e.target.value);
    setSelectedPercentage(percentage);
    const calculatedAmount = calculateAmount(percentage);
    setAmountIn(calculatedAmount);
  };

  // Calculate the amount based on the selected percentage
  const calculateAmount = (percentage) => {
    if (!percentage) return "";

    let balance;
    if (
      selectedTokenA.address === "0x0000000000000000000000000000000000000000"
    ) {
      // For native token (EMPTY_ADDRESS)
      balance = parseFloat(formattedBalance || 0);
    } else {
      // For other tokens
      balance = parseFloat(tokenBalance?.formatted || 0);
    }
    const calculatedAmount = balance * (percentage / 100);
    if (
      selectedTokenA.address === "0x0000000000000000000000000000000000000000" &&
      percentage === 100
    ) {
      // Leave some balance for gas fees (e.g., 0.01 units)
      return Math.max(0, calculatedAmount - 0.000001).toFixed(6);
    }
    return calculatedAmount.toFixed(6);
  };

  const WETH_ADDRESS = "0xa1077a294dde1b09bb078844df40758a5d0f9a27";
  const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

  const handleTokenSelect = (token) => {
    if (isSelectingTokenA) {
      setSelectedTokenA(token);
    } else {
      setSelectedTokenB(token);
    }
    setTokenVisible(false);
  };

  const convertToBigInt = (amount, decimals) => {
    // Add input validation
    if (!amount || isNaN(amount) || !decimals || isNaN(decimals)) {
      return BigInt(0);
    }

    try {
      const parsedAmount = parseFloat(amount);
      const parsedAmountIn = BigInt(Math.floor(parsedAmount * Math.pow(10, 6)));

      if (decimals >= 6) {
        return parsedAmountIn * BigInt(10) ** BigInt(decimals - 6);
      } else {
        return parsedAmountIn / BigInt(10) ** BigInt(6 - decimals);
      }
    } catch (error) {
      console.error("Error converting to BigInt:", error);
      return BigInt(0);
    }
  };

  const {
    data,
    isLoading: quoteLoading,
    refetch: quoteRefresh,
    error,
  } = useReadContract({
    abi: RouterABI,
    address: "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52",
    functionName: "findBestPath",
    args: [
      // Add validation for amountIn and selectedTokenA
      amountIn && selectedTokenA && !isNaN(parseFloat(amountIn))
        ? convertToBigInt(
            parseFloat(amountIn),
            parseInt(selectedTokenA.decimal) || 18 // Provide default decimal if missing
          )
        : BigInt(0),
      selectedTokenA?.address === EMPTY_ADDRESS
        ? WETH_ADDRESS
        : selectedTokenA?.address || EMPTY_ADDRESS,
      selectedTokenB?.address === EMPTY_ADDRESS
        ? WETH_ADDRESS
        : selectedTokenB?.address || EMPTY_ADDRESS,
      BigInt("3"),
    ],
  });

  const { data: singleToken, refetch: singleTokenRefresh } = useReadContract({
    abi: RouterABI,
    address: "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52",
    functionName: "findBestPath",
    args: [
      selectedTokenA?.decimal
        ? convertToBigInt(1, parseInt(selectedTokenA.decimal))
        : BigInt(0),
      selectedTokenA?.address === EMPTY_ADDRESS
        ? WETH_ADDRESS
        : selectedTokenA?.address || EMPTY_ADDRESS,
      selectedTokenB?.address === EMPTY_ADDRESS
        ? WETH_ADDRESS
        : selectedTokenB?.address || EMPTY_ADDRESS,
      BigInt("3"),
    ],
  });

  useWatchBlocks({
    onBlock(block) {
      singleTokenRefresh();
      quoteRefresh();
    },
  });

  const { data: feeData } = useReadContract({
    abi: RouterABI,
    address: "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52",
    functionName: "findBestPath",
    args: [
      amountIn && selectedTokenA && parseFloat(amountIn)
        ? convertToBigInt(parseFloat(amountIn) * 0.0028, 18)
        : BigInt(0),
      selectedTokenA?.address,
      selectedTokenB?.address,
      BigInt("3"),
    ],
  });

  const handleSlippageCalculated = (adjustedAmount) => {
    const tokenDecimals = selectedTokenB.decimal;
    const decimalAdjusted = Number(adjustedAmount) / 10 ** tokenDecimals;

    // Update states
    setMinAmountOut(adjustedAmount);
    setAmountOut(decimalAdjusted);

    // Update tradeInfo state
    setTradeInfo((prevTradeInfo) => ({
      ...prevTradeInfo,
      amountOut: adjustedAmount,
    }));

    // Reset minAmountOut if needed
    setMinAmountOut("0");
  };

  // Track tradeInfo updates
  // useEffect(() => {
  //   console.log("Updated tradeInfo:", tradeInfo);
  // }, [tradeInfo]);

  useEffect(() => {
    const fetchConversionRateTokenA = async () => {
      try {
        // Determine which address to use for the API call
        const addressToFetch =
          selectedTokenA.address === EMPTY_ADDRESS
            ? WETH_ADDRESS.toLowerCase()
            : selectedTokenA.address.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addressToFetch}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Validate and extract token prices
        const tokenPrices = data?.data?.attributes?.token_prices;
        if (!tokenPrices) {
          throw new Error("Token prices not found");
        }

        // Use the correct address to look up the price
        const tokenPrice =
          selectedTokenA.address === EMPTY_ADDRESS
            ? tokenPrices[WETH_ADDRESS.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRate(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenA();
  }, [selectedTokenA.address]);

  useEffect(() => {
    const fetchConversionRateTokenB = async () => {
      try {
        const addressToFetch =
          selectedTokenB.address === EMPTY_ADDRESS
            ? WETH_ADDRESS.toLowerCase()
            : selectedTokenB.address.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addressToFetch}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Validate and extract token prices
        const tokenPrices = data?.data?.attributes?.token_prices;
        if (!tokenPrices) {
          throw new Error("Token prices not found");
        }

        // Use the correct address to look up the price
        const tokenPrice =
          selectedTokenB.address === EMPTY_ADDRESS
            ? tokenPrices[WETH_ADDRESS.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRateTokenB(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenB();
  }, [selectedTokenB.address]);

  useEffect(() => {
    if (!data || !data.amounts || data.amounts.length === 0) {
      handleEmptyData();
      return;
    }

    if (!selectedTokenB) {
      setAmountOut("0");
      setTradeInfo(undefined);
      return;
    }

    handleValidData();
  }, [data, selectedTokenA, selectedTokenB, amountIn]);

  // Helper Functions
  const handleEmptyData = () => {
    setAmountOut("0");
    setTradeInfo(undefined);
    setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  };

  const handleValidData = () => {
    const isDirectRoute =
      (selectedTokenA?.address === EMPTY_ADDRESS &&
        selectedTokenB?.address === WETH_ADDRESS) ||
      (selectedTokenA?.address === WETH_ADDRESS &&
        selectedTokenB?.address === EMPTY_ADDRESS);

    if (isDirectRoute) {
      setDirectRoute();
    } else {
      setCalculatedRoute();
    }
  };

  const setDirectRoute = () => {
    setRoute([selectedTokenA?.address, selectedTokenB?.address]);
    setAdapter([]);
    setAmountOut(amountIn);
  };

  const setCalculatedRoute = () => {
    const amountOutValue = formatUnits(
      data.amounts[data.amounts.length - 1],
      parseInt(selectedTokenB.decimal)
    );
    const amountOutToTrimmed = (amountOutValue * 975) / 1000;
    // setAmountOut(amountOutToTrimmed);
    setAmountOut(amountOutValue);

    const trade = {
      amountIn: data.amounts[0],
      amountOut:
        (data.amounts[data.amounts.length - 1] * BigInt(98)) / BigInt(100),
      // data.amounts[data.amounts.length - 1],
      amounts: data.amounts,
      path: data.path,
      pathTokens: data.path.map(
        (pathAddress) =>
          Tokens.find((token) => token.address === pathAddress) || Tokens[0]
      ),
      adapters: data.adapters,
    };
    setRoute(data.path);
    setAdapter(data.adapters);
    setTradeInfo(trade);
    setIsSlippageApplied(false);
  };

  // useEffect(() => {
  //   quoteRefresh();
  //   setPath([selectedTokenA.address, selectedTokenB.address]);
  // }, [amountIn, selectedTokenA, selectedTokenB]);

  useEffect(() => {
    setTimeout(() => {
      quoteRefresh();
      setPath([selectedTokenA.address, selectedTokenB.address]);
    }, 9000);
  }, [amountIn, selectedTokenA, selectedTokenB]);

  useEffect(() => {
    if (conversionRate && !isNaN(conversionRate)) {
      const valueInUSD = (
        parseFloat(amountIn || 0) * parseFloat(conversionRate)
      ).toFixed(6);
      setUsdValue(valueInUSD);
    } else {
      console.error("Missing or invalid conversion rate:", conversionRate);
    }
  }, [amountIn, conversionRate]);

  useEffect(() => {
    if (conversionRateTokenB && !isNaN(conversionRateTokenB)) {
      const valueInUSD = (
        parseFloat(amountOut || 0) * parseFloat(conversionRateTokenB)
      ).toFixed(6);
      setUsdValueTokenB(valueInUSD);
    } else {
      console.error(
        "Missing or invalid conversion rate:",
        conversionRateTokenB
      );
    }
  }, [amountOut, conversionRateTokenB]);

  const confirmSwap = async () => {
    if (selectedTokenA.address == selectedTokenB.address) {
      return null;
    }
    await swapTokens(
      (_swapStatus) => {
        setSwapStatus(_swapStatus);
      },
      (hash) => {
        setSwapHash(hash);
      },
      selectedTokenA?.address,
      selectedTokenB?.address,
      address,
      tradeInfo
    )
      .then(() => {
        setSwapSuccess(true); // Set success on transaction completion
        setAmountVisible(false);
      })
      .catch((error) => {
        console.error("Swap failed", error);
        setSwapSuccess(false);
      });
  };
  const getRateDisplay = () => {
    if (!singleToken?.amounts?.[singleToken.amounts.length - 1]) return "0";

    const rate = parseFloat(
      formatUnits(
        singleToken.amounts[singleToken.amounts.length - 1],
        parseInt(selectedTokenB.decimal)
      )
    );

    return isRateReversed ? (1 / rate).toFixed(6) : rate.toFixed(6);
  };

  useEffect(() => {
    setSelectedPercentage("");
    setAmountIn("");
  }, [selectedTokenA]);

  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setActiveTokenAddress(address);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setActiveTokenAddress(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const isInsufficientBalance = () => {
    const inputAmount = parseFloat(amountIn) || 0;
    if (selectedTokenA.address === EMPTY_ADDRESS) {
      return inputAmount >= parseFloat(formattedBalance);
    } else {
      return inputAmount >= parseFloat(tokenBalance?.formatted || "0");
    }
  };

  const getButtonText = () => {
    return isInsufficientBalance()
      ? "Insufficient Balance"
      : quoteLoading
      ? "Loading..."
      : "Swap";
  };

  // Function to format the number with commas
  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };

  // Function to handle input changes
  const handleInputChange = (value) => {
    // Remove commas before updating state
    const rawValue = value.replace(/,/g, "");
    setAmountIn(rawValue); // Update the state with the raw number
  };

  const minToReceive = amountOut * 0.0024;
  const minToReceiveAfterFee = amountOut - minToReceive;
  return (
    <>
      <div className="w-full border border-white rounded-xl py-10 2xl:px-16 lg:px-12 md:px-8 px-4 bg-black md:mt-0 mt-4">
        <img src={Logo} alt="Logo" className=" mx-auto" />
        <div className="flex md:justify-between justify-center gap-3 items-center md:flex-nowrap flex-wrap my-6 lg:px-1 px-0">
          <div
            onClick={() => {
              setOrder(false);
              setPadding("lg:h-[295px] h-full");
            }}
            className={`${
              order ? "border-[#3b3c4e]" : "border-[#FF9900]"
            } cursor-pointer md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
          >
            SWAP
          </div>

          <div
            onClick={() => setSlippageVisible(true)}
            className="min-w-[27px] h-[25px]"
          >
            <img
              src={Sett}
              alt="Sett"
              className="w-full h-full cursor-pointer"
            />
          </div>
          <div
            onClick={() => {
              // setOrder(true);
              // setPadding("md:pb-[160px] pb-10");
            }}
            className={`${
              order
                ? "border-[#FF9900]"
                : "border-[#3b3c4e] opacity-50 cursor-not-allowed"
            }  md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
          >
            LIMIT ORDER
          </div>
        </div>
        <div className="flex justify-between gap-3 items-center lg:px-2">
          <div className="text-zinc-200 text-base font-normal roboto leading-normal">
            Pay
            <select
              className="text-white bg-black border border-[#3b3c4e] rounded-lg ms-2 py-1 cursor-pointer"
              value={selectedPercentage}
              onChange={handlePercentageChange}
              disabled={isLoading}
            >
              <option value="">Select</option>
              <option value={25}>25%</option>
              <option value={50}>50%</option>
              <option value={100}>100%</option>
            </select>
          </div>

          <div className="text-center">
            <span className="text-gray-400 text-base font-normal roboto leading-normal">
              Bal
            </span>
            <span className="text-gray-400 text-base font-normal roboto leading-normal">
              {" "}
              :{" "}
            </span>
            <span className="text-white text-base font-normal roboto leading-normal">
              {isLoading
                ? "Loading.."
                : selectedTokenA.address === EMPTY_ADDRESS
                ? `${formatNumber(formattedBalance)}`
                : `${
                    tokenBalance
                      ? formatNumber(
                          parseFloat(tokenBalance.formatted).toFixed(6)
                        )
                      : "0.00"
                  }`}
            </span>
          </div>
        </div>
        <div className="flex w-full border border-[#3b3c4e] px-4 py-4 rounded-2xl mt-2">
          <div
            onClick={() => {
              setIsSelectingTokenA(true);
              setTokenVisible(true);
              setSelectedPercentage("");
              setAmountIn("");
            }}
            className="flex justify-between gap-4 items-center cursor-pointer"
          >
            <div className="flex gap-2 items-center">
              <img
                className="w-4 h-4"
                src={selectedTokenA.image}
                alt={selectedTokenA.name}
              />
              <div className="text-white text-base font-bold roboto leading-normal bg-black appearance-none outline-none">
                {selectedTokenA.ticker}
              </div>
            </div>
            <svg
              className="pointer-events-none"
              width={11}
              height={7}
              viewBox="0 0 11 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.5 1.56934L5.5 5.56934L9.5 1.56934"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <button
            onClick={() => handleCopyAddress(selectedTokenA.address)}
            className="p-1 hover:bg-gray-800 rounded-md transition-colors ms-2"
          >
            {copySuccess && activeTokenAddress === selectedTokenA.address ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
            )}
          </button>

          <input
            type="text" // Changed from "number" to "text" for better formatting control
            placeholder={
              formattedChainBalance === "0.000000"
                ? "0"
                : calculateAmount(selectedPercentage)
            }
            value={formatNumber(amountIn)}
            onChange={(e) => handleInputChange(e.target.value)}
            className="text-white text-xl font-bold roboto text-right w-full leading-7 outline-none border-none bg-transparent token_input"
          />

          {/* <input
            type="number"
            placeholder={
              formattedChainBalance === "0.000000"
                ? "0"
                : calculateAmount(selectedPercentage)
            }
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            className="text-white text-xl font-bold roboto text-right w-full leading-7 outline-none border-none bg-transparent token_input"
          /> */}
        </div>
        <div className="text-right text-gray-400 text-sm mt-2 pe-1 roboto">
          {conversionRate
            ? `$${formatNumber(usdValue)} USD`
            : "Fetching Rate..."}
        </div>
        <div
          className={`lg:px-1 mt-3 flex gap-4 lg:flex-nowrap flex-wrap items-center ${
            order ? "" : "hidden"
          }`}
        >
          <div className="md:w-[300px] w-full">
            <div className="text-center mb-2">
              <span className="text-[#DCDDE5] text-base font-normal roboto leading-[18.31px]">
                Sell {selectedTokenA.ticker} at rate(
              </span>
              <span className="text-amber-500 text-base font-normal roboto leading-[18.31px]">
                -57%
              </span>
              <span className="text-[#DCDDE5] text-base font-normal roboto leading-[18.31px]">
                )
              </span>
            </div>
            <div className="w-full border border-[#3b3c4e] px-4 py-[10px] rounded-xl flex justify-between">
              <input
                type="text"
                placeholder="0"
                className="text-white text-xl font-bold roboto text-left w-full leading-7 outline-none border-none bg-transparent"
              />
              <div className="flex gap-2 items-center">
                <img src={selectedTokenA.image} alt={selectedTokenA.name} />
                <select className="text-white text-base font-bold roboto leading-normal bg-black appearance-none outline-none w-[50px]">
                  <option value="0">{selectedTokenA.name}</option>
                  <option value="1">USDT</option>
                </select>
              </div>
            </div>
          </div>
          <div className="md:w-[142px] w-full">
            <div className="text-center mb-3">
              <div className="text-center text-gray-400 text-base font-normal roboto leading-[18.31px]">
                Expiry
              </div>
            </div>
            <div className="w-full border border-[#3b3c4e] px-4 py-[13px] rounded-xl flex justify-between">
              <select className="text-white text-base font-bold roboto leading-normal bg-black w-full outline-none">
                <option value="0"> 0 days</option>
                <option value="1"> 1 days</option>
              </select>
            </div>
          </div>
        </div>
        <div
          className="cursor-pointer"
          onClick={() => {
            const _tokenA = selectedTokenA;
            const _tokenB = selectedTokenB;
            setSelectedTokenA(_tokenB);
            setSelectedTokenB(_tokenA);
          }}
        >
          <img src={Ar} alt="Ar" className="mx-auto mt-6" />
        </div>
        <div className="flex justify-between gap-3 items-center">
          <div className="text-zinc-200 text-base font-normal roboto leading-normal">
            Receive
          </div>
          <div className="text-center">
            <span className="text-gray-400 text-base font-normal roboto leading-normal">
              Bal
            </span>
            <span className="text-gray-400 text-base font-normal roboto leading-normal">
              {" "}
              :{" "}
            </span>
            <span className="text-white text-base font-normal roboto leading-normal">
              {isLoading
                ? "Loading.."
                : selectedTokenA.address === EMPTY_ADDRESS
                ? `${formatNumber(formattedChainBalanceTokenB)}`
                : `${
                    tokenBBalance
                      ? formatNumber(
                          parseFloat(tokenBBalance.formatted).toFixed(6)
                        )
                      : "0.00"
                  }`}
            </span>
          </div>
        </div>

        <div className="flex w-full border border-[#3b3c4e] px-4 py-4 rounded-2xl mt-3">
          <div
            onClick={() => {
              setIsSelectingTokenA(false);
              setTokenVisible(true);
            }}
            className="flex justify-between gap-4 items-center cursor-pointer"
          >
            <div className="flex gap-2 items-center">
              <img
                className="w-4 h-4"
                src={selectedTokenB.image}
                alt={selectedTokenB.name}
              />
              <div className="text-white text-base font-bold roboto leading-normal bg-black appearance-none outline-none">
                {selectedTokenB.ticker}
              </div>
            </div>
            <svg
              className="pointer-events-none"
              width={11}
              height={7}
              viewBox="0 0 11 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.5 1.56934L5.5 5.56934L9.5 1.56934"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <button
            onClick={() => handleCopyAddress(selectedTokenB.address)}
            className="p-1 hover:bg-gray-800 rounded-md transition-colors ms-2"
          >
            {copySuccess && activeTokenAddress === selectedTokenB.address ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
            )}
          </button>
          <input
            type="text"
            placeholder="0"
            value={formatNumber(parseFloat(amountOut).toFixed(6))}
            className="text-white text-xl font-bold roboto text-right w-full leading-7 outline-none border-none bg-transparent"
          />
        </div>
        <div className="text-right text-gray-400 text-sm mt-2 pe-1 roboto">
          {conversionRateTokenB
            ? `$${formatNumber(usdValueTokenB)} USD`
            : "Fetching Rate..."}
        </div>
        <div className="flex justify-center items-center gap-2 my-4">
          <div className="text-white text-base font-normal roboto leading-normal">
            1 {isRateReversed ? selectedTokenB.ticker : selectedTokenA.ticker} ={" "}
            {getRateDisplay()}{" "}
            {isRateReversed ? selectedTokenA.ticker : selectedTokenB.ticker}
          </div>
          <div
            className="cursor-pointer"
            onClick={() => setIsRateReversed(!isRateReversed)}
          >
            <img src={Refresh} alt="Refresh" />
          </div>
        </div>
        <button
          onClick={() => setAmountVisible(true)}
          disabled={isInsufficientBalance()}
          className={`w-full h-14 flex justify-center items-center rounded-xl ${
            isInsufficientBalance()
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-[#FF9900] hover:text-[#FF9900] hover:bg-transparent"
          } roboto text-black text-base font-bold border border-[#FF9900]`}
        >
          {getButtonText()}
        </button>
        <div className="md:max-w-[403px] w-full mx-auto my-5 h-px relative bg-gray-700" />
        <div className="px-1 w-full mx-auto">
          <div className="flex justify-between gap-2 items-center">
            <div className="text-gray-400 text-[12px] font-normal roboto leading-none flex gap-1 items-center">
              Amount to Send
              <img src={Info} alt="Info" />
            </div>
            <div className="text-right text-white text-[12px] font-normal roboto leading-none">
              {formatNumber(amountIn)} {selectedTokenA.ticker}
            </div>
          </div>
          {/* <div className="flex justify-between gap-2 items-center my-2">
            <div className="text-gray-400 text-[12px] font-normal roboto leading-none flex gap-1 items-center">
              Min. to Receive
              <img src={Info} alt="Info" />
            </div>
            <div className="text-right text-white text-[12px] font-normal roboto leading-none">
              {formatNumber(parseFloat(amountOut).toFixed(6))}{" "}
              {selectedTokenB.ticker}
            </div>
          </div> */}
          <div className="flex justify-between gap-2 items-center my-2">
            <div className="text-gray-400 text-[12px] font-normal roboto leading-none flex gap-1 items-center">
              Min. To Receive
              <img src={Info} alt="Info" />
            </div>
            <div className="text-right text-white text-[12px] font-normal roboto leading-none">
              ~ {formatNumber(parseFloat(minToReceiveAfterFee).toFixed(6))}{" "}
              {selectedTokenB.ticker}
            </div>
          </div>
        </div>
      </div>

      {isSlippageVisible && (
        <SlippageCalculator
          tradeInfo={tradeInfo}
          onSlippageCalculated={handleSlippageCalculated}
          onClose={() => setSlippageVisible(false)}
        />
      )}

      <div aria-label="Modal Success">
        {swapSuccess && (
          <Transcation
            transactionHash={swapHash}
            onClose={() => setSwapSuccess(false)} // Close modal when clicked
          />
        )}
      </div>

      <div aria-label="Modal">
        {isAmountVisible && (
          <Amount
            onClose={() => setAmountVisible(false)}
            amountIn={amountIn}
            amountOut={parseFloat(amountOut).toFixed(6)}
            tokenA={selectedTokenA}
            tokenB={selectedTokenB}
            singleToken={singleToken}
            refresh={quoteRefresh}
            confirm={confirmSwap}
          />
        )}
      </div>
      <div aria-label="Modal1">
        {isTokenVisible && (
          <Token
            onClose={() => setTokenVisible(false)}
            onSelect={handleTokenSelect}
          />
        )}
      </div>
    </>
  );
};

export default Emp;
