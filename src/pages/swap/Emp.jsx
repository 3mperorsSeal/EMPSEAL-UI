import { useEffect, useState, useMemo } from "react";
import Logo from "../../assets/images/swap-emp.png";
import Sett from "../../assets/images/setting.svg";
import Ar from "../../assets/images/reverse.svg";
import Sellbox from "../../assets/images/sell-box.png";
import Buybox from "../../assets/images/buy-bg.png";
import Swapbutton from "../../assets/images/swap-button.svg";

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
import Transaction from "./Transaction";
import { Copy, Check } from "lucide-react";
import { useChainConfig } from "../../hooks/useChainConfig";
import ProvidersListNew from "../bridge/ProvidersList-new";

const Emp = ({ setPadding }) => {
  const [isAmountVisible, setAmountVisible] = useState(false);
  const [isSlippageVisible, setSlippageVisible] = useState(false);
  const [isSlippageApplied, setIsSlippageApplied] = useState(false);
  const [isTokenVisible, setTokenVisible] = useState(false);
  const [order, setOrder] = useState(false);
  const [isRateReversed, setIsRateReversed] = useState(false);
  const [selectedTokenA, setSelectedTokenA] = useState(Tokens[0]);
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
  const [usdValueTokenA, setUsdValueTokenA] = useState("0.00");
  const [conversionRate, setConversionRate] = useState(null);
  const [conversionRateTokenB, setConversionRateTokenB] = useState(null);
  const [isPartialFill, setIsPartialFill] = useState(false);
  // Toggle function
  const togglePartialFill = () => {
    setIsPartialFill((prev) => !prev);
  };
  const {
    chain: currentChain,
    chainId,
    symbol,
    tokenList,
    adapters,
    routerAddress,
    wethAddress,
    featureTokens,
    blockExplorer,
    blockExplorerName,
    maxHops,
  } = useChainConfig();
  // const [isDirectRoute, setIsDirectRoute] = useState(false);

  // console.log("Chain Config:", { chain,wethAddress, routerAddress, currentChain, chainId, tokenList, adapters, blockExplorer, blockExplorerName });

  const handleCloseSuccessModal = () => {
    setSwapStatus("IDLE"); // Reset status when closing modal
  };

  useEffect(() => {
    if (tokenList?.length > 0) {
      setSelectedTokenA(tokenList[0]);
      setSelectedTokenB(tokenList[1]);
    }
  }, [tokenList]);

  useEffect(() => {
    if (address && datas) {
      setBalanceAddress(formatEther(datas.value));
    } else if (!address) {
      setBalanceAddress("0.00");
    }
  }, [address, datas]);

  const formattedBalance = balanceAddress
    ? `${parseFloat(balanceAddress).toFixed(3)}`
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
    ? parseFloat(tokenBalance.formatted).toFixed(3) // Format to 6 decimal places
    : "0.000";

  const { data: tokenBBalance } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenB.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalanceTokenB = tokenBBalance
    ? parseFloat(tokenBBalance.formatted).toFixed(3) // Format to 6 decimal places
    : "0.000";

  const handlePercentageChange = (e) => {
    const percentage = e === "" ? "" : parseInt(e);
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
      return Math.max(0, calculatedAmount).toFixed(3);
    }
    return calculatedAmount.toFixed(3);
  };

  // const WETH_ADDRESS = "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990";
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

  const isDirectRoute = useMemo(() => {
    return (
      (selectedTokenA?.address === EMPTY_ADDRESS &&
        selectedTokenB?.address === wethAddress) ||
      (selectedTokenA?.address === wethAddress &&
        selectedTokenB?.address === EMPTY_ADDRESS)
    );
  }, [selectedTokenA?.address, selectedTokenB?.address, wethAddress]);

  const {
    data,
    isLoading: quoteLoading,
    refetch: quoteRefresh,
    error,
  } = useReadContract({
    abi: RouterABI,
    address: routerAddress,
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
        ? wethAddress
        : selectedTokenA?.address || EMPTY_ADDRESS,
      selectedTokenB?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenB?.address || EMPTY_ADDRESS,
      BigInt(maxHops.toString()),
    ],
    enabled: !isDirectRoute, // call when not a direct route
  });

  // Near your useReadContract for findBestPath
  // console.log("Current isDirectRoute:", isDirectRoute, "findBestPath Data:", data, "Quote Loading:", quoteLoading);

  // And perhaps rename the tradeInfo log if it's global
  // console.log("Current TradeInfo:", tradeInfo);

  // console.log("Data: ", data);

  const { data: singleToken, refetch: singleTokenRefresh } = useReadContract({
    abi: RouterABI,
    address: routerAddress,
    functionName: "findBestPath",
    args: [
      selectedTokenA?.decimal
        ? convertToBigInt(1, parseInt(selectedTokenA.decimal))
        : BigInt(0),
      selectedTokenA?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenA?.address || EMPTY_ADDRESS,
      selectedTokenB?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenB?.address || EMPTY_ADDRESS,
      BigInt(maxHops.toString()),
    ],
  });

  // useWatchBlocks({
  //   onBlock(block) {
  //     singleTokenRefresh();
  //     quoteRefresh();
  //   },
  // });

  const { data: feeData } = useReadContract({
    abi: RouterABI,
    address: routerAddress,
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
        // Check if required values are available
        if (!currentChain?.name || !selectedTokenA?.address) {
          console.error("Missing required data for token A price fetch");
          return;
        }

        // Determine which address to use for the API call
        const addressToFetch =
          selectedTokenA?.address === EMPTY_ADDRESS && wethAddress
            ? wethAddress?.toLowerCase()
            : selectedTokenA?.address?.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`
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
          selectedTokenA?.address === EMPTY_ADDRESS
            ? tokenPrices[wethAddress?.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRate(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenA();
  }, [chainId, selectedTokenA?.address, wethAddress]);

  useEffect(() => {
    const fetchConversionRateTokenB = async () => {
      try {
        // Check if required values are available
        if (!currentChain?.name || !selectedTokenB?.address) {
          console.error("Missing required data for token B price fetch");
          return;
        }

        // Determine which address to use for the API call
        const addressToFetch =
          selectedTokenB?.address === EMPTY_ADDRESS && wethAddress
            ? wethAddress?.toLowerCase()
            : selectedTokenB?.address?.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`
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
          selectedTokenB?.address === EMPTY_ADDRESS
            ? tokenPrices[wethAddress?.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRateTokenB(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenB();
  }, [chainId, selectedTokenB?.address, wethAddress]);

  useEffect(() => {
    if (isDirectRoute) {
      setDirectRoute();
      return;
    }

    if (!data || !data.amounts || data.amounts.length === 0) {
      handleEmptyData();
      return;
    }

    if (!selectedTokenB) {
      setAmountOut("0");
      setTradeInfo(undefined);
      return;
    }

    setCalculatedRoute();
  }, [data, selectedTokenA, selectedTokenB, amountIn, isDirectRoute]);

  // Helper Functions
  const handleEmptyData = () => {
    setAmountOut("0");
    setTradeInfo(undefined);
    setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  };

  const handleValidData = () => {
    if (!data || !data.amounts || data.amounts.length === 0) {
      handleEmptyData();
      return;
    }

    if (!selectedTokenB) {
      setAmountOut("0");
      setTradeInfo(undefined);
      return;
    }

    // Check for direct route (native token <-> wrapped token)
    const isDirectRoute =
      (selectedTokenA?.address === EMPTY_ADDRESS &&
        selectedTokenB?.address === wethAddress) ||
      (selectedTokenA?.address === wethAddress &&
        selectedTokenB?.address === EMPTY_ADDRESS);

    // console.log("Chain:", currentChain?.name, "Is direct route:", isDirectRoute);

    // Handle routing based on whether it's a direct route or not
    if (isDirectRoute) {
      // For direct routes (native <-> wrapped) on all chains, use direct deposit/withdraw
      setDirectRoute();
    } else {
      // For all other routes, use calculated route with hops
      setCalculatedRoute();
    }
  };

  const setDirectRoute = () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut("0");
      return;
    }

    const tokenAAddress =
      selectedTokenA?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenA?.address || EMPTY_ADDRESS;

    const tokenBAddress =
      selectedTokenB?.address === EMPTY_ADDRESS
        ? wethAddress
        : selectedTokenB?.address || EMPTY_ADDRESS;

    // Set route with replaced native token address
    setRoute([tokenAAddress, tokenBAddress]);
    setAdapter([]); // No adapters needed for direct routes

    // For direct routes, amount out should be same as amount in
    setAmountOut(amountIn);

    // Create trade object directly without using findBestPath data
    const amountInBigInt =
      amountIn && selectedTokenA && !isNaN(parseFloat(amountIn))
        ? convertToBigInt(
            parseFloat(amountIn),
            parseInt(selectedTokenA.decimal) || 18
          )
        : BigInt(0);

    const trade = {
      amountIn: amountInBigInt,
      amountOut: amountInBigInt, // Same as input for direct routes
      amounts: [amountInBigInt, amountInBigInt], // Only start and end amounts
      path: [tokenAAddress, tokenBAddress],
      pathTokens: [selectedTokenA, selectedTokenB],
      adapters: [], // No adapters for direct routes
    };

    setTradeInfo(trade);
    setIsSlippageApplied(false);
  };

  const setCalculatedRoute = () => {
    if (isDirectRoute) return;
    if (!data || !data.amounts || data.amounts.length === 0) {
      console.error("Invalid swap data received");
      return;
    }

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
          tokenList.find((token) => token.address === pathAddress) ||
          tokenList[0]
      ),
      adapters: data.adapters,
    };
    setRoute(data.path);
    setAdapter(data.adapters);
    setTradeInfo(trade);
    setIsSlippageApplied(false);
  };
  // console.log("Trade info ", tradeInfo);

  useEffect(() => {
    quoteRefresh();
    setPath([selectedTokenA.address, selectedTokenB.address]);
  }, [amountIn, selectedTokenA, selectedTokenB]);

  useEffect(() => {
    // setTimeout(() => {
    // quoteRefresh();
    setPath([selectedTokenA.address, selectedTokenB.address]);
    // }, 9000);
  }, [amountIn, selectedTokenA, selectedTokenB]);

  useEffect(() => {
    if (conversionRate && !isNaN(conversionRate)) {
      const valueInUSD = (
        parseFloat(amountIn || 0) * parseFloat(conversionRate)
      ).toFixed(3);
      setUsdValue(valueInUSD);
      setUsdValueTokenA(valueInUSD);
    } else {
      console.error("Missing or invalid conversion rate:", conversionRate);
    }
  }, [amountIn, conversionRate]);

  useEffect(() => {
    if (conversionRateTokenB && !isNaN(conversionRateTokenB)) {
      const valueInUSD = (
        parseFloat(amountOut || 0) * parseFloat(conversionRateTokenB)
      ).toFixed(3);
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
      tradeInfo,
      chainId
    )
      .then(() => {
        setSwapSuccess(true);
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

    return isRateReversed ? (1 / rate).toFixed(3) : rate.toFixed(3);
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

  // const isInsufficientBalance = () => {
  //   const inputAmount = parseFloat(amountIn) || 0;
  //   if (selectedTokenA.address === EMPTY_ADDRESS) {
  //     return inputAmount > parseFloat(formattedBalance);
  //   } else {
  //     return inputAmount > parseFloat(tokenBalance?.formatted || "0");
  //   }
  // };

  const isInsufficientBalance = () => {
    const inputAmount = parseFloat(amountIn) || 0;
    const balance =
      selectedTokenA.address === EMPTY_ADDRESS
        ? parseFloat(formattedBalance)
        : parseFloat(tokenBalance?.formatted || "0");

    //small precision difference
    return inputAmount > balance && Math.abs(inputAmount - balance) > 1e-6;
  };

  // const getButtonText = () => {
  //   return isInsufficientBalance()
  //     ? "Insufficient Balance"
  //     : quoteLoading
  //       ? "Loading..."
  //       : "Swap";
  // };
  const getButtonText = () => {
    if (isInsufficientBalance()) return "Insufficient Balance";
    if (quoteLoading) return "Loading...";
    if (order) return "Place Order";
    return "Swap";
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

  // Function to handle input changes
  const handleInputChange = (value) => {
    // Remove commas before updating state
    const rawValue = value.replace(/,/g, "");
    setAmountIn(rawValue); // Update the state with the raw number
  };

  const minToReceive = amountOut * 0.0024;
  const minToReceiveAfterFee = amountOut - minToReceive;

  // effect to clear amountOut when tokens are swapped
  useEffect(() => {
    setAmountOut("0");
  }, [selectedTokenA, selectedTokenB]);

  // Market
  const calculateLimitPrice1 = () => {
    if (!selectedPercentage1) {
      return "24.277";
    }

    const priceMapping = {
      25: "18.208",
      50: "21.242",
      75: "24.277",
      100: "27.312",
    };

    return priceMapping[selectedPercentage1] || "24.277";
  };

  const calculateExpiryDays1 = () => {
    if (!selectedPercentage1) {
      return "1101";
    }
    const expiryMapping = {
      25: 275,
      50: 550,
      75: 825,
      100: 1101,
    };

    return expiryMapping[selectedPercentage1] || "1101";
  };
  const handlePercentageChange1 = (percentage1) => {
    setSelectedPercentage1(percentage1);
    const calculatedAmount = calculateAmount(percentage1);
    setAmountIn(calculatedAmount);
  };
  const [selectedPercentage1, setSelectedPercentage1] = useState("");

  // Market
  const handleOutputChange = () => {
    // This input is read-only, so we don't need an onChange handler
  };
  // For Price Impact
  const priceImpact =
    usdValueTokenA > 0
      ? (
          ((parseFloat(usdValueTokenA) - parseFloat(usdValueTokenB)) /
            parseFloat(usdValueTokenA)) *
          100
        ).toFixed(2)
      : 0;
  // Determine color based on value
  const getPriceImpactColor = (impact) => {
    const value = parseFloat(impact);

    if (value < 2) return "text-black";
    if (value >= 2 && value <= 5) return "text-yellow-500";
    return "text-red-500";
  };
  //
  return (
    <>
      {/* <div
          className={`w-full rounded-xl xl:py-10 pt-20 2xl:px-16 lg:px-12 md:px-8 px-1 md:mt-0 mt-4 relative`}
        > */}
      <div
        className={`w-full rounded-xl xl:pb-10 lg:pt-1 pt-20 2xl:px-16 lg:px-12 md:px-8 px-1 md:mt-0 mt-4 relative ${
          order ? "pb-[0px]" : "2xl:pb-20 xl:pb-10 lg:pb-0 pb-80"
        }`}
      >
        <div className="scales8">
          <div className="md:max-w-[1100px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap lg:mt-1 mt-6 px-3 pb-4">
            {/* <div
              onClick={() => setActiveTab('cross')}
              className={`${
                activeTab === 'cross' ? 'border-[#FF9900]' : 'border-[#3b3c4e]'
              } cursor-pointer md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
            >
              Cross Chain Swap
            </div>
            <Link to={'/native-bridge'}>
              <div
                className={`${
                  activeTab === 'native'
                    ? 'border-[#FF9900]'
                    : 'border-[#3b3c4e] '
                }   opacity-50 px-3 py-2 md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
              >
                Native Bridge
              </div>
            </Link> */}
            <h1 className="md:text-5xl text-3xl text-center text-[#FF9900] font-orbitron font-bold mb-2">
              Seamless
            </h1>
            <h2 className="md:text-5xl text-3xl text-center text-white font-orbitron font-bold">
              Cross Chain Swaps
            </h2>
          </div>
          <div className="flex gap-3 items-center md:justify-start justify-center md:flex-nowrap flex-wrap my-6 lg:px-1 px-0">
            <div
              onClick={() => {
                setOrder(false);
                setPadding("lg:h-[295px] h-full");
              }}
              className={`${
                order
                  ? "border-white text-[#FF9900]"
                  : "border-[#FF9900] bg-swap-grad text-black"
              } cursor-pointer md:max-w-[100px] w-full h-[47px] flex justify-center items-center rounded-lg border text-sm font-bold font-orbitron`}
            >
              SWAP
            </div>
            <div
              onClick={() => {
                setOrder(true);
                setPadding("md:pb-[160px] pb-10");
              }}
              className={`${
                order
                  ? "border-[#FF9900] bg-swap-grad text-black"
                  : "border-white "
              }  md:max-w-[154px] w-full h-[47px] flex justify-center items-center rounded-lg border text-[#FF9900] text-sm font-bold font-orbitron cursor-pointer`}
            >
              LIMIT ORDER
            </div>
            <div
              onClick={() => setSlippageVisible(true)}
              className="w-[47px] h-[47px] border border-white rounded-lg flex justify-center items-center"
            >
              <img src={Sett} alt="Sett" className="w-[26px] cursor-pointer" />
            </div>
            {/* <div
              onClick={() => setSlippageVisible(true)}
              className="min-w-[27px] h-[25px] ms-auto"
            >
              <img
                src={Sett}
                alt="Sett"
                className="w-full h-full cursor-pointer"
              />
            </div> */}
          </div>
          <div className="relative">
            <img className="bg-sell" src={Sellbox} alt="sellbox" />
            <div className="flex justify-between gap-3 items-center lg:px-2">
              <div className="font-orbitron text-dark-400 ps-4 pt-4 text-2xl font-semibold leading-normal">
                You Sell
                {/* <select
                  className="text-white bg-black border border-[#3b3c4e] rounded-lg ms-2 py-1 cursor-pointer"
                  value={selectedPercentage}
                  onChange={handlePercentageChange}
                  disabled={isLoading}
                >
                  <option value="">Select</option>
                  <option value={25}>25%</option>
                  <option value={50}>50%</option>
                  <option value={100}>100%</option>
                </select> */}
              </div>
              <div className="text-center absolute -top-4 right-0 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 bg-[#FFE6C0] md:text-sm text-xs px-2 py-2">
                <span className="font-bold font-orbitron leading-normal">
                  BAL
                </span>
                <span className="font-bold font-orbitron leading-normal">
                  {" "}
                  :{" "}
                </span>
                <span className=" font-bold font-orbitron leading-normal">
                  {isLoading
                    ? "Loading.."
                    : selectedTokenA.address === EMPTY_ADDRESS
                    ? `${formatNumber(formattedBalance)}`
                    : `${
                        tokenBalance
                          ? formatNumber(
                              parseFloat(tokenBalance.formatted).toFixed(3)
                            )
                          : "0.00"
                      }`}
                </span>
              </div>
            </div>
            <div className="flex w-full px-4 py-4 mt-2">
              <div className="w-1/2">
                <div className="flex justify-between gap-4 items-center cursor-pointer">
                  <div className="flex gap-2 items-center mt-7">
                    {/* md:w-[220px] w-[160px] */}
                    <div className="flex md:gap-3 gap-1 items-center bg-black border border-white rounded-lg md:px-6 px-2 md:py-3 py-2 margin_left">
                      <div
                        onClick={() => {
                          setIsSelectingTokenA(true);
                          setTokenVisible(true);
                          setSelectedPercentage("");
                          setAmountIn("");
                        }}
                        className="flex items-center md:gap-3 gap-1"
                      >
                        <img
                          className="md:w-9 md:h-9 w-4 h-4"
                          src={selectedTokenA.image}
                          alt={selectedTokenA.name}
                        />
                        <div className="text-[#FF9900] lg:text-base text-xs font-bold font-orbitron leading-normal bg-black appearance-none outline-none">
                          {selectedTokenA.ticker}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleCopyAddress(selectedTokenA.address)
                        }
                        className="rounded-md transition-colorss"
                      >
                        {copySuccess &&
                        activeTokenAddress === selectedTokenA.address ? (
                          <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:max-w-1/2 w-full me-3">
                <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex gap-2 md:ml-0 ml-[-40px] justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] font-medium font-orbitron md:w-[70px] w-11 px-2
            ${
              selectedPercentage === value
                ? " text-white bg-black"
                : "bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
            }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                {(() => {
                  const inputLength =
                    formatNumber(amountIn)?.replace(/\D/g, "").length || 0;
                  const fontSizeClass =
                    inputLength > 12
                      ? "md:text-[24px] text-xl !text-[#000000]"
                      : inputLength > 8
                      ? "md:text-[32px] text-2xl !text-[#000000]"
                      : "md:text-[40px] text-2xl !text-[#000000]";

                  return (
                    <input
                      type="text"
                      placeholder={
                        formattedChainBalance === "0.000"
                          ? "0"
                          : calculateAmount(selectedPercentage)
                      }
                      value={formatNumber(amountIn)}
                      onChange={(e) => handleInputChange(e.target.value)}
                      className="text-[#000000] py-2 font-bold text-end w-full leading-7 outline-none border-none bg-transparent token_input ps-3 font-orbitron placeholder-black transition-all duration-200 ease-in-out"
                      style={{
                        fontSize: `${Math.max(
                          12,
                          40 - amountIn.toString().length * 1.5
                        )}px`,
                      }}
                    />
                  );
                })()}
              </div>

              {/* <input
              type="number"
              placeholder={
                formattedChainBalance === "0.000"
                  ? "0"
                  : calculateAmount(selectedPercentage)
              }
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="text-white text-xl font-bold roboto text-right w-full leading-7 outline-none border-none bg-transparent token_input"
            /> */}
            </div>
            <div className="text-right text-white font-bold text-sm -mt-[14px] pe-8 roboto truncate">
              {conversionRate
                ? `$${formatNumber(usdValue)}`
                : "Fetching Rate..."}
            </div>
          </div>

          {/* <div
            className={`lg:px-1 mt-3 flex gap-4 lg:flex-nowrap flex-wrap items-center ${order ? "" : "hidden"
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
          </div> */}
          <div
            className="cursor-pointer"
            onClick={() => {
              const _tokenA = selectedTokenA;
              const _tokenB = selectedTokenB;
              setSelectedTokenA(_tokenB);
              setSelectedTokenB(_tokenA);
              setAmountOut("0");
            }}
          >
            <img
              src={Ar}
              alt="Ar"
              className="mx-auto my-4 md:pt-7 pt-[44px] md:w-[70px] w-12"
            />
          </div>

          <div className="relative">
            <img className="bg-sell" src={Buybox} alt="Buybox" />
            <div className="flex justify-between gap-3 items-center">
              <div className="font-orbitron text-white ps-6 pt-4 text-2xl font-semibold leading-normal">
                You Buy
              </div>
              <div className="text-center absolute -top-4 right-0 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 bg-[#FFE6C0] md:text-sm text-xs px-2 py-2">
                <span className="font-bold font-orbitron leading-normal">
                  BAL
                </span>
                <span className="font-bold font-orbitron leading-normal">
                  {" "}
                  :{" "}
                </span>
                <span className="font-bold font-orbitron leading-normal">
                  {isLoading
                    ? "Loading.."
                    : selectedTokenA.address === EMPTY_ADDRESS
                    ? `${formatNumber(formattedChainBalanceTokenB)}`
                    : `${
                        tokenBBalance
                          ? formatNumber(
                              parseFloat(tokenBBalance.formatted).toFixed(3)
                            )
                          : "0.00"
                      }`}
                </span>
              </div>
            </div>

            <div className="flex w-full px-4 pt-4 pb-1 mt-2">
              <div className="w-1/2">
                <div className="flex justify-between gap-4 items-center cursor-pointer">
                  <div className="flex gap-2 items-center md:mt-4 mt-8">
                    {/* md:w-[220px] w-[160px] */}
                    <div className="flex md:gap-3 gap-1 items-center bg-[#FFE6C0]  border border-white rounded-lg md:px-6 px-2 md:py-3 py-2 margin_left">
                      <div
                        onClick={() => {
                          setIsSelectingTokenA(false);
                          setTokenVisible(true);
                        }}
                        className="flex items-center md:gap-3 gap-1"
                      >
                        <img
                          className="md:w-9 md:h-9 w-4 h-4"
                          src={selectedTokenB.image}
                          alt={selectedTokenB.name}
                        />
                        <div className="text-dark lg:text-base text-xs font-bold font-orbitron leading-normal appearance-none outline-none">
                          {selectedTokenB.ticker}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleCopyAddress(selectedTokenB.address)
                        }
                        className="rounded-md transition-colors"
                      >
                        {copySuccess &&
                        activeTokenAddress === selectedTokenB.address ? (
                          <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="md:w-4 md:h-4 w-3 h-3 text-black hover:text-black" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:max-w-1/2 w-full me-3">
                {/*  */}
                <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex gap-2 mb-2 md:ml-0 ml-[-40px] justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={` py-1 border border-[#FF9900] flex justify-center items-center rounded-xl text-[10px] md:w-[70px] w-11 font-medium font-orbitron px-2
            ${
              selectedPercentage === value
                ? " text-white bg-black"
                : "bg-[#FF9900] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
            }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                {/*  */}
                <input
                  type="text"
                  placeholder="0"
                  value={formatNumber(parseFloat(amountOut).toFixed(3))}
                  onChange={handleOutputChange}
                  readOnly
                  className="truncate text-white font-bold font-orbitron text-end w-full leading-7 outline-none border-none bg-transparent ps-0 transition-all duration-200 ease-in-out"
                  style={{
                    fontSize: `${Math.max(
                      12,
                      40 -
                        formatNumber(
                          parseFloat(amountOut).toFixed(3)
                        ).toString().length *
                          1.5
                    )}px`,
                  }}
                />
              </div>
            </div>
            <div className="text-right text-white font-bold text-sm -mt-[0px] pe-8 roboto truncate">
              {conversionRateTokenB
                ? `$${formatNumber(usdValueTokenB)}`
                : "Fetching Rate..."}
            </div>
          </div>
          {/* <div className="flex justify-center items-center gap-2 mb-4 mt-12">
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
          </div> */}
          <div
            className={`relative flex justify-center flex-row md:mt-28 mt-11 xl:pt-0 ${
              order
                ? "xl:pt-[0px] lg:pt-[20px] pt-[350px] ttt xl:top-0 lg:top-[-140px] top-[-315px]"
                : "pt-0 top-0"
            }`}
          >
            <button
              onClick={() => setAmountVisible(true)}
              disabled={isInsufficientBalance()}
              className={`w-full button-trans mt-12 h- flex justify-center items-center rounded-xl hover:opacity-80 transition-all ${
                isInsufficientBalance()
                  ? "opacity-50 cursor-not-allowed"
                  : " hover:text-black hover:bg-transparent"
              } font-orbitron text-black lg:text-3xl text-2xl font-bold`}
            >
              <img
                className="absolute swap-button"
                src={Swapbutton}
                alt="Swap"
              />
              <span className="ps-7">{getButtonText()}</span>
            </button>
          </div>
        </div>
        {/* <div className="md:max-w-[403px] w-full mx-auto my-5 h-px relative bg-gray-700" /> */}
        {/* <div className="px-1 w-full mx-auto">
            <div className="flex justify-between gap-2 items-center">
              <div className="text-gray-400 text-[12px] font-normal roboto leading-none flex gap-1 items-center">
                Amount to Send
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-[12px] font-normal roboto leading-none">
                {formatNumber(amountIn)} {selectedTokenA.ticker}
              </div>
            </div>
            <div className="flex justify-between gap-2 items-center my-2">
              <div className="text-gray-400 text-[12px] font-normal roboto leading-none flex gap-1 items-center">
                Min. to Receive
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-[12px] font-normal roboto leading-none">
                {formatNumber(parseFloat(amountOut).toFixed(3))}{" "}
                {selectedTokenB.ticker}
              </div>
            </div>
            <div className="flex justify-between gap-2 items-center my-2">
                <div className="text-gray-400 text-[12px] font-normal roboto leading-none flex gap-1 items-center">
                Min. To Receive
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-[12px] font-normal roboto leading-none">
                ~ {formatNumber(parseFloat(minToReceiveAfterFee).toFixed(3))}{" "}
                {selectedTokenB.ticker}
              </div>
            </div>
          </div> */}
      </div>
      {order && (
        <div className={`${isPartialFill ? "w-[245px]" : "w-[160px]"} absolute 2xl:right-[12vw] xl:right-[3vw] md:right-2 lefts11 2xl:top-[25%] xl:top-[25%] md:top-[40%] mdlg top-[54%] h-[200px] bg-[#FF9900] rounded-lg font-orbitron shadow-md border borer-white`}>
          <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto] text-black p-4">
            <div className="w-[120px] relative top-8">
              <p className="text-base text-center">Link</p>
              <p className="text-base text-center">Limit Price</p>
            </div>
            <div className="flex flex-col justify-center items-center w-[120px] mt-7">
              <p className="text-sm font-bold leading-none">
                {calculateLimitPrice1()}{" "}
              </p>
              <span className="text-sm font-semibold">
                {selectedTokenB.ticker}
              </span>{" "}
            </div>
            {isPartialFill && (
              <div className="text-right realtive z-20 w-[75px] ml-auto">
                <p className="text-[10px] font-semibold uppercase text-center">
                  Expiry
                </p>
                <p className="text-xs font-bold text-center">
                  {calculateExpiryDays1()} DAYS
                </p>
              </div>
            )}
            {/* <button
              onClick={togglePartialFill}
              className="mb-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
            >
              {isPartialFill ? "Hide Partial Fill" : "Show Partial Fill"}
            </button> */}
            <div className="absolute bottom-4 flex items-center gap-2 left-6">
              <p className="font-orbitron text-xs font-medium">Partial Fill :</p>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isPartialFill}
                  onChange={togglePartialFill}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
          {isPartialFill && (
            <>
              <div className="absolute top-0 right-0 h-full w-[40%] bg-white flex flex-col justify-start pt-4 items-center space-y-2 rounded-r-lg">
                {[25, 50, 75, 100].map((percentage1) => (
                  <button
                    key={percentage1}
                    onClick={() => handlePercentageChange1(percentage1)}
                    className={`bg-[#F4AC3F] text-black text-[10px] font-medium px-4 py-1 rounded-full hover:opacity-90 transition ${
                      selectedPercentage1 === percentage1
                        ? "ring-2 ring-black"
                        : ""
                    }`}
                  >
                    {percentage1}%
                  </button>
                ))}
              </div>
              <div className="absolute top-1/2 left-[60%] transform -translate-x-1/2 -translate-y-1/2 bg-black text-[#FF9900] rounded-md w-[27px] h-12 flex justify-center items-center font-bold">
                <svg
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M19.4928 12.5951C19.8051 12.8673 19.8375 13.3411 19.5653 13.6533L14.4744 19.4929C14.2689 19.7286 13.9387 19.812 13.6459 19.7023C13.3531 19.5926 13.1591 19.3127 13.1591 19V5C13.1591 4.58579 13.4949 4.25 13.9091 4.25C14.3233 4.25 14.6591 4.58579 14.6591 5V16.9984L18.4347 12.6676C18.7069 12.3554 19.1806 12.3229 19.4928 12.5951Z"
                    fill="#FF9900"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.50712 11.4049C4.19482 11.1327 4.16242 10.6589 4.43462 10.3467L9.52552 4.50719C9.73102 4.27148 10.0612 4.188 10.354 4.29772C10.6468 4.40745 10.8408 4.68733 10.8408 5.00004L10.8408 19C10.8408 19.4142 10.505 19.75 10.0908 19.75C9.67662 19.75 9.34082 19.4142 9.34082 19V7.00165L5.56522 11.3324C5.29302 11.6446 4.81932 11.6771 4.50712 11.4049Z"
                    fill="#FF9900"
                  />
                </svg>
              </div>
              <div className="absolute top-1/2 right-[-56px] transform -translate-y-1/2 bg-white text-black border border-white rounded-t-md w-[80px] h-[32px] flex justify-center items-center rotate-90 font-bold text-sm cursor-pointer">
                Market
              </div>
            </>
          )}
        </div>
      )}
      {order && (
        // {/* For Limit Order */}
        <div className="w-full md:pb-20 pb-10 md:max-w-[1000px] mx-auto">
          <div className="mt-3 w-full">
            <ProvidersListNew />
          </div>
        </div>
      )}
      {isSlippageVisible && (
        <SlippageCalculator
          tradeInfo={tradeInfo}
          onSlippageCalculated={handleSlippageCalculated}
          onClose={() => setSlippageVisible(false)}
        />
      )}

      <div aria-label="Modal Success">
        {swapSuccess && (
          <Transaction
            transactionHash={swapHash}
            onClose={() => setSwapSuccess(false)}
          />
        )}
      </div>

      <div aria-label="Modal">
        {isAmountVisible && (
          <Amount
            onClose={() => setAmountVisible(false)}
            amountIn={amountIn}
            amountOut={parseFloat(amountOut).toFixed(3)}
            tokenA={selectedTokenA}
            tokenB={selectedTokenB}
            singleToken={singleToken}
            refresh={quoteRefresh}
            confirm={confirmSwap}
            usdValueTokenA={usdValue}
            usdValueTokenB={usdValueTokenB}
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
      <div className="absolute bg-white left-0 lefts mw300 lg:bottom-20 bottom-[100px] scale8 border-4 border-l-2 border-[#FF9900] md:p-6 p-4 rounded-xl-view">
        <h6 className="font-orbitron text-sm">
          <span>
            <span className="font-semibold">Min Received</span> :{" "}
            <span className="font-bold truncate">
              {formatNumber(parseFloat(minToReceiveAfterFee).toFixed(3))}{" "}
            </span>
            {selectedTokenB.ticker}
          </span>
        </h6>
        <h6 className="font-orbitron text-sm py-3">
          <span>
            <span className="font-semibold">Rate :</span>{" "}
            <span className="font-bold">1</span>{" "}
            {isRateReversed ? selectedTokenB.ticker : selectedTokenA.ticker} ={" "}
            <span className="font-bold truncate">{getRateDisplay()}</span>{" "}
            {isRateReversed ? selectedTokenA.ticker : selectedTokenB.ticker}
          </span>
        </h6>
        <h6 className="font-orbitron text-sm">
          <span>
            <span className="font-semibold">Price Impact:</span>{" "}
            <span
              className={`font-bold truncate ${getPriceImpactColor(
                priceImpact
              )}`}
            >
              {" "}
              {/* {((amountOut / 1000) * 0.01).toFixed(3)} % */}
              {priceImpact} %
            </span>
          </span>
        </h6>
      </div>
    </>
  );
};

export default Emp;
