import React, { useEffect, useState } from 'react';
import Logo from '../../assets/images/swap-emp.png';
import Sett from '../../assets/images/setting.png';
import UpDownAr from '../../assets/images/up-down-arrow.svg';
import Usdc from '../../assets/images/usdc.svg';
import Refresh from '../../assets/images/refresh.svg';
import Info from '../../assets/images/info.svg';
import { Link } from 'react-router-dom';
import Amount from './Amount';
import TokensChains from './TokensChains';
import { formatEther } from 'viem';
import {
  useAccount,
  useSwitchChain,
  useReadContract,
  useWatchBlocks,
  useBalance,
} from 'wagmi';
import { RouterABI } from './routerAbi';
import { formatUnits } from 'viem';
import Tokens from '../tokenList.json';
import { useStore } from '../../redux/store/routeStore';
import Transcation from './Transcation';
import { Copy, Check } from 'lucide-react';

const Emp = ({
  setPadding,
  quoteAll,
  loading,
  selectedRoute,
  quoteData,
  setQuoteData,
}) => {
  const [isAmountVisible, setAmountVisible] = useState(false);
  const [isSlippageApplied, setIsSlippageApplied] = useState(false);
  const [isTokenVisible, setTokenVisible] = useState(false);
  const [order, setOrder] = useState(false);
  const [tokenList, setTokenList] = useState([]);
  const [selectedTokenA, setSelectedTokenA] = useState([]);
  const [isRateReversed, setIsRateReversed] = useState(false);
  const [selectedTokenB, setSelectedTokenB] = useState([]);
  const [isSelectingTokenA, setIsSelectingTokenA] = useState(true);
  const [amountOut, setAmountOut] = useState('0');
  const [amountIn, setAmountIn] = useState('0');
  const [swapStatus, setSwapStatus] = useState('IDLE');
  const [swapHash, setSwapHash] = useState('');
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [tradeInfo, setTradeInfo] = useState(undefined);
  const [selectedPercentage, setSelectedPercentage] = useState('');
  const { address, chain } = useAccount();
  const [balanceAddress, setBalanceAddress] = useState(null);
  const { data: datas } = useBalance({ address });
  const [fees, setFees] = useState(0);
  const [minAmountOut, setMinAmountOut] = useState('0');
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTokenAddress, setActiveTokenAddress] = useState(null);
  const [usdValue, setUsdValue] = useState('0.00');
  const [usdValueTokenB, setUsdValueTokenB] = useState('0.00');
  const [conversionRate, setConversionRate] = useState(null);
  const [conversionRateTokenB, setConversionRateTokenB] = useState(null);
  const [selfAddress, setSelfAddress] = useState('');
  const [selectedChainA, setSelectedChainA] = useState([]);
  const [selectedChainB, setSelectedChainB] = useState([]);
  // const [loading, setLoading] = useState(false);

  const handleCloseSuccessModal = () => {
    setSwapStatus('IDLE'); // Reset status when closing modal
  };
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();

  // console.log('selected Token A: ', selectedTokenA);
  // console.log('selectedRoute: ', selectedRoute);

  useEffect(() => {
    async function getTokens() {
      try {
        const response = await fetch(
          `https://api-v2.rubic.exchange/api/tokens/?network=PULSECHAIN&pageSize=10`
        );
        const data = await response.json();
        if (data?.results) {
          setSelectedTokenA(data.results[0]);
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }
      try {
        const response = await fetch(
          `https://api-v2.rubic.exchange/api/tokens/?network=ETH&pageSize=10`
        );
        const data = await response.json();
        if (data?.results) {
          setSelectedTokenB(data.results[0]);
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }
    }

    getTokens();
  }, []);

  useEffect(() => {
    if (address && datas) {
      setBalanceAddress(formatEther(datas.value));
    } else if (!address) {
      setBalanceAddress('0.00');
    }
  }, [address, datas]);

  const formattedBalance = balanceAddress
    ? `${parseFloat(balanceAddress).toFixed(6)}`
    : '0.00';

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
    : '0.000000';

  const { data: tokenBBalance } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenB.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalanceTokenB = tokenBBalance
    ? parseFloat(tokenBBalance.formatted).toFixed(6) // Format to 6 decimal places
    : '0.000000';

  const handlePercentageChange = (e) => {
    const percentage = e === '' ? '' : parseInt(e);
    setSelectedPercentage(percentage);
    const calculatedAmount = calculateAmount(percentage);
    setAmountIn(calculatedAmount);
  };

  // Calculate the amount based on the selected percentage
  const calculateAmount = (percentage) => {
    if (!percentage) return '';

    let balance;
    if (
      selectedTokenA.address === '0x0000000000000000000000000000000000000000'
    ) {
      // For native token (EMPTY_ADDRESS)
      balance = parseFloat(formattedBalance || 0);
    } else {
      // For other tokens
      balance = parseFloat(tokenBalance?.formatted || 0);
    }
    const calculatedAmount = balance * (percentage / 100);
    if (
      selectedTokenA.address === '0x0000000000000000000000000000000000000000' &&
      percentage === 100
    ) {
      // Leave some balance for gas fees (e.g., 0.01 units)
      return Math.max(0, calculatedAmount - 0.01).toFixed(6);
    }

    return calculatedAmount.toFixed(6);
  };

  const WETH_ADDRESS = '0xa1077a294dde1b09bb078844df40758a5d0f9a27';
  const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

  const handleTokenSelect = (token) => {
    if (isSelectingTokenA) {
      // console.log('selectedTokenA', token);

      setSelectedTokenA(token);
    } else {
      setSelectedTokenB(token);
    }

    setTokenVisible(false);
  };

  const getProvider = async () => {
    const provider = window.phantom?.solana || window.solana;

    if (provider) {
      return provider;
    } else {
      // console.log("❌ Solana provider not found. Please install Phantom Wallet: https://phantom.app/");
      window.open('https://phantom.app/', '_blank');
      return null;
    }
  };

  const handleChainSelect = async (chain) => {
    if (isSelectingTokenA) {
      // console.log('Selected Chain A:', chain);
      setSelectedChainA(chain); // Set Chain A when Token A is selected

      if (chain.name === 'SOLANA') {
        const provider = await getProvider();
        if (!provider) {
          console.error('❌ Phantom provider not found.');
          return;
        }

        try {
          // Connecting to Solana with Phantom
          const response = await provider.connect({ onlyIfTrusted: false }); // Forces the pop-up
          return response.publicKey;
        } catch (error) {
          console.error('❌ Failed to connect to Phantom:', error);
        }
      }

      if (!isConnected) {
        console.error('❌ Wallet not connected!');
        return;
      }

      try {
        // Switching to the selected chain
        switchChain({ chainId: chain.chainId });
      } catch (error) {
        console.error(`❌ Failed to switch to ${chain.name}:`, error);
      }
    } else {
      // console.log('Selected Chain B:', chain);
      setSelectedChainB(chain); // Set Chain B when Token B is selected

      if (chain.name === 'SOLANA') {
        const provider = await getProvider();
        if (!provider) {
          console.error('❌ Phantom provider not found.');
          return;
        }

        try {
          // Connecting to Solana with Phantom
          const response = await provider.connect({ onlyIfTrusted: false }); // Forces the pop-up
          return response.publicKey;
        } catch (error) {
          console.error('❌ Failed to connect to Phantom:', error);
        }
      }

      if (!isConnected) {
        console.error('❌ Wallet not connected!');
        return;
      }
    }
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
      console.error('Error converting to BigInt:', error);
      return BigInt(0);
    }
  };

  // const {
  //   data,
  //   isLoading: quoteLoading,
  //   refetch: quoteRefresh,
  //   error,
  // } = useReadContract({
  //   abi: RouterABI,
  //   address: '',
  //   functionName: 'findBestPath',
  //   args: [
  //     // Add validation for amountIn and selectedTokenA
  //     amountIn && selectedTokenA && !isNaN(parseFloat(amountIn))
  //       ? convertToBigInt(
  //         parseFloat(amountIn),
  //         parseInt(selectedTokenA.decimal) || 18 // Provide default decimal if missing
  //       )
  //       : BigInt(0),
  //     selectedTokenA?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenA?.address || EMPTY_ADDRESS,
  //     selectedTokenB?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenB?.address || EMPTY_ADDRESS,
  //     BigInt('3'),
  //   ],
  // });

  // const { data: singleToken, refetch: singleTokenRefresh } = useReadContract({
  //   abi: RouterABI,
  //   address: '0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52',
  //   functionName: 'findBestPath',
  //   args: [
  //     selectedTokenA?.decimal
  //       ? convertToBigInt(1, parseInt(selectedTokenA.decimal))
  //       : BigInt(0),
  //     selectedTokenA?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenA?.address || EMPTY_ADDRESS,
  //     selectedTokenB?.address === EMPTY_ADDRESS
  //       ? WETH_ADDRESS
  //       : selectedTokenB?.address || EMPTY_ADDRESS,
  //     BigInt('3'),
  //   ],
  // });

  // useWatchBlocks({
  //   onBlock(block) {
  //     singleTokenRefresh();
  //     quoteRefresh();
  //   },
  // });

  // const { data: feeData } = useReadContract({
  //   abi: RouterABI,
  //   address: '0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52',
  //   functionName: 'findBestPath',
  //   args: [
  //     amountIn && selectedTokenA && parseFloat(amountIn)
  //       ? convertToBigInt(parseFloat(amountIn) * 0.0028, 18)
  //       : BigInt(0),
  //     selectedTokenA?.address,
  //     selectedTokenB?.address,
  //     BigInt('3'),
  //   ],
  // });

  // useEffect(() => {
  //   const fetchConversionRateTokenA = async () => {
  //     try {
  //       // Determine which address to use for the API call
  //       const addressToFetch =
  //         selectedTokenA.address === EMPTY_ADDRESS
  //           ? WETH_ADDRESS.toLowerCase()
  //           : selectedTokenA.address.toLowerCase();

  //       const response = await fetch(
  //         `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addressToFetch}`
  //       );

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       }

  //       const data = await response.json();

  //       // Validate and extract token prices
  //       const tokenPrices = data?.data?.attributes?.token_prices;
  //       if (!tokenPrices) {
  //         throw new Error('Token prices not found');
  //       }

  //       // Use the correct address to look up the price
  //       const tokenPrice =
  //         selectedTokenA.address === EMPTY_ADDRESS
  //           ? tokenPrices[WETH_ADDRESS.toLowerCase()]
  //           : tokenPrices[addressToFetch];

  //       setConversionRate(tokenPrice);
  //     } catch (error) {
  //       console.error('Error fetching token price:', error.message);
  //     }
  //   };

  //   fetchConversionRateTokenA();
  // }, [selectedTokenA.address]);

  // useEffect(() => {
  //   const fetchConversionRateTokenB = async () => {
  //     try {
  //       const addressToFetch =
  //         selectedTokenB.address === EMPTY_ADDRESS
  //           ? WETH_ADDRESS.toLowerCase()
  //           : selectedTokenB.address.toLowerCase();

  //       const response = await fetch(
  //         `https://api.geckoterminal.com/api/v2/simple/networks/pulsechain/token_price/${addressToFetch}`
  //       );

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       }

  //       const data = await response.json();

  //       // Validate and extract token prices
  //       const tokenPrices = data?.data?.attributes?.token_prices;
  //       if (!tokenPrices) {
  //         throw new Error('Token prices not found');
  //       }

  //       // Use the correct address to look up the price
  //       const tokenPrice =
  //         selectedTokenB.address === EMPTY_ADDRESS
  //           ? tokenPrices[WETH_ADDRESS.toLowerCase()]
  //           : tokenPrices[addressToFetch];

  //       setConversionRateTokenB(tokenPrice);
  //     } catch (error) {
  //       console.error('Error fetching token price:', error.message);
  //     }
  //   };

  //   fetchConversionRateTokenB();
  // }, [selectedTokenB.address]);

  // console.log("data debug: ", data);

  // useEffect(() => {
  //   if (!data || !data.amounts || data.amounts.length === 0) {
  //     handleEmptyData();
  //     return;
  //   }

  //   if (!selectedTokenB) {
  //     setAmountOut('0');
  //     setTradeInfo(undefined);
  //     return;
  //   }

  //   // handleValidData();
  // }, [data, selectedTokenA, selectedTokenB, amountIn]);

  // Helper Functions
  // const handleEmptyData = () => {
  //   setAmountOut('0');
  //   setTradeInfo(undefined);
  //   setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  // };

  // const handleValidData = () => {
  //   const isDirectRoute =
  //     (selectedTokenA?.address === EMPTY_ADDRESS &&
  //       selectedTokenB?.address === WETH_ADDRESS) ||
  //     (selectedTokenA?.address === WETH_ADDRESS &&
  //       selectedTokenB?.address === EMPTY_ADDRESS);

  //   if (isDirectRoute) {
  //     setDirectRoute();
  //   } else {
  //     // setCalculatedRoute();
  //   }
  // };

  // const setDirectRoute = () => {
  //   setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  //   setAdapter([]);
  //   // setAmountOut(amountIn);
  // };

  // const setCalculatedRoute = () => {
  //   const amountOutValue = formatUnits(
  //     data.amounts[data.amounts.length - 1],
  //     parseInt(selectedTokenB.decimal)
  //   );
  //   const amountOutToTrimmed = (amountOutValue * 975) / 1000;
  //   // setAmountOut(amountOutToTrimmed);
  //   setAmountOut(amountOutValue);

  //   const trade = {
  //     amountIn: data.amounts[0],
  //     amountOut:
  //       (data.amounts[data.amounts.length - 1] * BigInt(98)) / BigInt(100),
  //     // data.amounts[data.amounts.length - 1],
  //     amounts: data.amounts,
  //     path: data.path,
  //     pathTokens: data.path.map(
  //       (pathAddress) =>
  //         Tokens.find((token) => token.address === pathAddress) || Tokens[0]
  //     ),
  //     adapters: data.adapters,
  //   };
  //   setRoute(data.path);
  //   setAdapter(data.adapters);
  //   setTradeInfo(trade);
  //   setIsSlippageApplied(false);
  // };

  useEffect(() => {
    setTimeout(() => {
      setPath([selectedTokenA.address, selectedTokenB.address]);
    }, 9000);
    setQuoteData(null);
    setAmountOut(null);
  }, [amountIn, selectedTokenA, selectedTokenB, selfAddress]);

  // useEffect(() => {
  //   if (conversionRate && !isNaN(conversionRate)) {
  //     const valueInUSD = (
  //       parseFloat(amountIn || 0) * parseFloat(conversionRate)
  //     ).toFixed(6);
  //     setUsdValue(valueInUSD);
  //   } else {
  //     console.error('Missing or invalid conversion rate:', conversionRate);
  //   }
  // }, [amountIn, conversionRate]);

  // useEffect(() => {
  //   if (conversionRateTokenB && !isNaN(conversionRateTokenB)) {
  //     const valueInUSD = (
  //       parseFloat(amountOut || 0) * parseFloat(conversionRateTokenB)
  //     ).toFixed(6);
  //     setUsdValueTokenB(valueInUSD);
  //   } else {
  //     console.error(
  //       'Missing or invalid conversion rate:',
  //       conversionRateTokenB
  //     );
  //   }
  // }, [amountOut, conversionRateTokenB]);

  // const confirmSwap = async () => {
  //   if (selectedTokenA.address == selectedTokenB.address) {
  //     return null;
  //   }
  //   await swapTokens(
  //     (_swapStatus) => {
  //       setSwapStatus(_swapStatus);
  //     },
  //     (hash) => {
  //       setSwapHash(hash);
  //     },
  //     selectedTokenA?.address,
  //     selectedTokenB?.address,
  //     address,
  //     tradeInfo
  //   )
  //     .then(() => {
  //       setSwapSuccess(true); // Set success on transaction completion
  //       setAmountVisible(false);
  //     })
  //     .catch((error) => {
  //       console.error('Swap failed', error);
  //       setSwapSuccess(false);
  //     });
  // };
  // const getRateDisplay = () => {
  //   if (!singleToken?.amounts?.[singleToken.amounts.length - 1]) return '0';

  //   const rate = parseFloat(
  //     formatUnits(
  //       singleToken.amounts[singleToken.amounts.length - 1],
  //       parseInt(selectedTokenB.decimal)
  //     )
  //   );

  //   return isRateReversed ? (1 / rate).toFixed(6) : rate.toFixed(6);
  // };

  useEffect(() => {
    setSelectedPercentage('');
    setAmountIn('');
  }, [selectedTokenA]);

  const symbiosisRoute = selectedRoute?.type === "evm";
  // console.log("symbiosisRouteCheck", symbiosisRoute);

  const rangoRoute = typeof selectedRoute?.requestId === 'string';
  // console.log("rangoRouteCheck:", rangoRoute);

  const rubicRoute = selectedRoute?.swapType === "cross-chain" || "on-chain";
  // console.log("rubicRouteCheck: ", rubicRoute);

  const formatTokenAmount = (amount, decimals) => {
    return (parseFloat(amount) / 10 ** decimals).toFixed(6);
  };

  // useEffect(() => {
  //   // console.log('selectedRoute', selectedRoute);
  //   if (selectedRoute !== null) {
  //     setAmountOut(selectedRoute?.estimate?.destinationTokenAmount);
  //   }
  // }, [selectedRoute]);

  useEffect(() => {
    if (selectedRoute) {
      let amountOutValue;
  
      if (symbiosisRoute) {
        // Symbiosis route
        amountOutValue = formatTokenAmount(selectedRoute?.tokenAmountOut?.amount, selectedRoute?.tokenAmountOut?.decimals);
      } else if (rangoRoute) {
        // Rango route
        amountOutValue = selectedRoute?.outputAmount;
      } else if (rubicRoute) {
        // Rubic route
        amountOutValue = selectedRoute?.estimate?.destinationTokenAmount;
      }
      setAmountOut(amountOutValue);
    }
  }, [selectedRoute]);

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
      console.error('Failed to copy address:', err);
    }
  };

  const isInsufficientBalance = () => {
    const inputAmount = parseFloat(amountIn) || 0;
    if (selectedTokenA.address === EMPTY_ADDRESS) {
      return inputAmount > parseFloat(formattedBalance);
    } else {
      return inputAmount > parseFloat(tokenBalance?.formatted || '0');
    }
  };

  const getButtonText = () => {
    if (isInsufficientBalance()) {
      return 'Insufficient Balance';
    }
    if (!amountOut || amountOut === '0') {
      return 'Select the provider';
    }
    return 'Swap';
  };

  // Function to format the number with commas
  const formatNumber = (value) => {
    if (!value) return ''; // Handle empty input

    const [integerPart, decimalPart] = value.split('.'); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, '') // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ','); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, '')}` // Remove non-numeric from decimal
      : formattedInteger;
  };

  // Function to handle input changes
  const handleInputChange = (value) => {
    // Remove commas before updating state
    const rawValue = value.replace(/,/g, '');
    setAmountIn(rawValue); // Update the state with the raw number
  };

  const handleSelfButtonClick = () => {
    setSelfAddress(address); // Set the wallet address to the input field
  };

  // const minToReceive = amountOut * 0.0024;
  // const minToReceiveAfterFee = amountOut - minToReceive;
  // const receiver = '0xCa397C293789F97d77c6bc665DaF7aaAF3336BE3';

  // const quoteAll = async () => {
  //   setLoading(true);
  //   try {
  //     const response = await fetch(
  //       'https://api-v2.rubic.exchange/api/routes/quoteAll',
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           dstTokenAddress: selectedTokenB.address,
  //           dstTokenBlockchain:
  //             selectedTokenB?.blockchainNetwork?.toUpperCase(),
  //           referrer: 'rubic.exchange',
  //           srcTokenAddress: selectedTokenA.address,
  //           srcTokenAmount: amountIn,
  //           srcTokenBlockchain:
  //             selectedTokenA?.blockchainNetwork?.toUpperCase(),
  //           receiver: receiver,
  //         }),
  //       }
  //     );

  //     if (!response.ok) {
  //       console.error(`HTTP error! Status: ${response.status}`);
  //       return;
  //     }

  //     const data = await response.json();
  //     console.log('API Response:', data);
  //   } catch (error) {
  //     console.error('Error calling API:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  return (
    <>
      <div className='w-full border border-white rounded-xl py-10  lg:px-10 md:px-8 px-4 bg-black md:mt-0 mt-4'>
        <img src={Logo} alt='Logo' className=' mx-auto' />

        {isTokenVisible ? (
          <TokensChains
            onClose={() => setTokenVisible(false)}
            onSelect={handleTokenSelect}
            onChainSelect={handleChainSelect}
          />
        ) : (
          <div>
            <div className='flex md:justify-between justify-center gap-3 items-center md:flex-nowrap flex-wrap my-6 lg:px-1 px-0'>
              {/* <div
                onClick={() => {
                  setOrder(false);
                  setPadding('lg:h-[295px] h-full');
                }}
                className={`${
                  order ? 'border-[#3b3c4e]' : 'border-[#FF9900]'
                } cursor-pointer md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
              >
                Cross Chain Swap
              </div>

              <div
                onClick={() => {
                  // setOrder(true);
                  // setPadding("md:pb-[160px] pb-10");
                }}
                className={`${
                  order
                    ? 'border-[#FF9900]'
                    : 'border-[#3b3c4e] opacity-50 cursor-not-allowed'
                }  md:max-w-[200px] w-full h-[28px] flex justify-center items-center rounded-md border text-white text-[15px] font-bold roboto`}
              >
                Native Bridge
              </div> */}
            </div>
            <div className='flex justify-between gap-3 items-center mt-10'>
              <div className='text-center'>
                <span className='text-gray-400 text-base font-normal roboto leading-normal'>
                  From
                </span>
              </div>
              <div className='text-zinc-200 text-base font-normal roboto  leading-normal flex gap-2'>
                <span>Bal:</span>
                {[25, 50, 100].map((value) => (
                  <button
                    key={value}
                    className={`w-full border border-[#FF9900] flex justify-center  items-center rounded-xl text-sm font-normal  roboto px-4
          ${
            selectedPercentage === value
              ? ' text-black bg-[#FF9900]'
              : 'bg-transparent text-white hover:bg-[#FF9900] hover:text-black'
          }`}
                    onClick={() => handlePercentageChange(value)}
                    disabled={isLoading}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>

            <div className='flex w-full border border-[#3b3c4e]  rounded-2xl mt-2 p-2'>
              <div
                onClick={() => {
                  setIsSelectingTokenA(true);
                  setTokenVisible(true);
                  setSelectedPercentage('');
                  setAmountIn('');
                }}
                className='flex justify-between gap-4 items-center cursor-pointer bg-[#191919] px-3 py-2 rounded-lg'
              >
                <div
                  className={`relative flex gap-2 items-center ${
                    selectedChainA.image ? 'pe-3' : ''
                  }`}
                >
                  {/* Chain Image */}
                  {selectedChainA.image && (
                    <div className='absolute top-0 left-0'>
                      <img
                        className='w-10 h-8' // Chain image slightly bigger
                        src={selectedChainA.image}
                        alt={selectedChainA.name}
                      />
                    </div>
                  )}

                  {/* Token Image */}
                  {selectedTokenA.image && (
                    <div
                      className={`relative ${
                        selectedChainA.image ? 'left-5' : ''
                      }`}
                    >
                      <img
                        className='w-9 h-7' // Token image smaller
                        src={selectedTokenA.image}
                        alt={selectedTokenA.name}
                      />
                    </div>
                  )}
                </div>

                <svg
                  className='pointer-events-none'
                  width={11}
                  height={7}
                  viewBox='0 0 11 7'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M1.5 1.56934L5.5 5.56934L9.5 1.56934'
                    stroke='white'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>

              <input
                type='text' // Changed from "number" to "text" for better formatting control
                placeholder={
                  formattedChainBalance === '0.000000'
                    ? '0'
                    : calculateAmount(selectedPercentage)
                }
                value={formatNumber(amountIn)}
                onChange={(e) => handleInputChange(e.target.value)}
                className='text-white text-xl font-bold roboto text-start w-full leading-7 outline-none border-none bg-transparent token_input ps-3'
              />
            </div>
            <div className='flex justify-between gap-3 items-center lg:px-2 mt-2'>
              <div className='text-center'>
                <span className='text-gray-400 text-base font-normal roboto leading-normal'>
                  Bal
                </span>
                <span className='text-gray-400 text-base font-normal roboto leading-normal'>
                  {' '}
                  :{' '}
                </span>
                <span className='text-white text-base font-normal roboto leading-normal'>
                  {isLoading
                    ? 'Loading..'
                    : selectedTokenA.address === EMPTY_ADDRESS
                    ? `${formatNumber(formattedBalance)}`
                    : `${
                        tokenBalance
                          ? formatNumber(
                              parseFloat(tokenBalance.formatted).toFixed(6)
                            )
                          : '0.00'
                      }`}
                </span>
              </div>
            </div>

            <div
              className='cursor-pointer'
              onClick={() => {
                const _tokenA = selectedTokenA;
                const _tokenB = selectedTokenB;
                const _chainA = selectedChainA;
                const _chainB = selectedChainB;
                setSelectedTokenA(_tokenB);
                setSelectedTokenB(_tokenA);
                setSelectedChainA(_chainB);
                setSelectedChainB(_chainA);
              }}
            >
              <img src={UpDownAr} alt='Ar' className='mx-auto mt-6' />
            </div>
            <div className='flex justify-between gap-3 items-center'>
              <div className='text-zinc-200 text-base font-normal roboto leading-normal'>
                To
              </div>
            </div>

            <div className='flex w-full border border-[#3b3c4e] p-2 rounded-2xl mt-3 p-2'>
              <div
                onClick={() => {
                  setIsSelectingTokenA(false);
                  setTokenVisible(true);
                }}
                className='flex justify-between gap-4 items-center cursor-pointer bg-[#191919] px-3 py-2 rounded-lg'
              >
                <div
                  className={`relative flex gap-2 items-center ${
                    selectedChainB.image ? 'pe-3' : ''
                  }`}
                >
                  {/* Chain Image */}
                  {selectedChainB.image && (
                    <div className='absolute top-0 left-0'>
                      <img
                        className='w-10 h-8' // Chain image slightly bigger
                        src={selectedChainB.image}
                        alt={selectedChainB.name}
                      />
                    </div>
                  )}

                  {/* Token Image */}
                  {selectedTokenB.image && (
                    <div
                      className={`relative ${
                        selectedChainB.image ? 'left-5' : ''
                      }`}
                    >
                      <img
                        className='w-9 h-7' // Token image smaller
                        src={selectedTokenB.image}
                        alt={selectedTokenB.name}
                      />
                    </div>
                  )}
                </div>
                <svg
                  className='pointer-events-none'
                  width={11}
                  height={7}
                  viewBox='0 0 11 7'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M1.5 1.56934L5.5 5.56934L9.5 1.56934'
                    stroke='white'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>

              <input
                type='text'
                placeholder='0'
                value={
                  amountOut === '0' || !amountOut
                    ? ''
                    : parseFloat(amountOut).toFixed(6)
                } // Ensure 0 or empty will display a blank field
                className='text-white text-xl font-bold roboto text-start w-full leading-7 outline-none border-none bg-transparent ps-3'
              />
            </div>
            <div className='flex justify-between gap-3 items-center mt-2'>
              <div className='text-center'>
                <span className='text-gray-400 text-base font-normal roboto leading-normal'>
                  Bal
                </span>
                <span className='text-gray-400 text-base font-normal roboto leading-normal'>
                  {' '}
                  :{' '}
                </span>
                <span className='text-white text-base font-normal roboto leading-normal'>
                  {isLoading
                    ? 'Loading..'
                    : selectedTokenA.address === EMPTY_ADDRESS
                    ? `${formatNumber(formattedChainBalanceTokenB)}`
                    : `${
                        tokenBBalance
                          ? formatNumber(
                              parseFloat(tokenBBalance.formatted).toFixed(2)
                            )
                          : '0.00'
                      }`}
                </span>
              </div>
            </div>
            <div className='grid grid-cols-[65%_30%] justify-between w-full my-6'>
              <div className=' border border-[#3b3c4e] p-3 rounded-2xl  '>
                <input
                  type='text'
                  placeholder='To Address'
                  value={selfAddress}
                  // value={address} // Bind the input field to the state
                  onChange={(e) => setSelfAddress(e.target.value)} // Allow the user to change the value manually
                  className='text-white text-sm font-bold roboto text-start w-full leading-7 outline-none border-none bg-transparent ps-3'
                />
              </div>
              <button
                className={` flex justify-center items-center rounded-xl px-2 
                   bg-[#FF9900] hover:text-[#FF9900] hover:bg-transparent
                 roboto text-black text-base font-bold border border-[#FF9900]`}
                onClick={handleSelfButtonClick}
              >
                Self
              </button>
            </div>
            <button
              onClick={() =>
                quoteAll(
                  selectedTokenA,
                  selectedTokenB,
                  amountIn,
                  selfAddress,
                  address
                )
              }
              disabled={
                loading || amountIn === '0' || !amountIn || !selfAddress
              }
              className={`w-full h-14 flex justify-center items-center rounded-xl  ${
                loading || amountIn === '0' || !amountIn || !selfAddress
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-[#FF9900] hover:text-[#FF9900] hover:bg-transparent'
              } roboto text-black text-base font-bold border border-[#FF9900]`}
            >
              {loading ? 'Processing...' : 'Estimate Trade'}
            </button>
            <button
              onClick={() => setAmountVisible(true)}
              disabled={isInsufficientBalance()}
              className={`w-full h-14 flex justify-center items-center rounded-xl mt-4 ${
                isInsufficientBalance() || !amountOut || amountOut === '0'
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-[#FF9900] hover:text-[#FF9900] hover:bg-transparent'
              } roboto text-black text-base font-bold border border-[#FF9900]`}
            >
              {getButtonText()}
            </button>
          </div>
        )}
      </div>

      {/* <div aria-label='Modal Success'>
        {swapSuccess && (
          <Transcation
            transactionHash={swapHash}
            onClose={() => setSwapSuccess(false)} // Close modal when clicked
          />
        )}
      </div> */}

      <div aria-label='Modal'>
        {isAmountVisible && (
          <Amount
            onClose={() => setAmountVisible(false)}
            amountIn={amountIn}
            tokenA={selectedTokenA}
            tokenB={selectedTokenB}
            fromAddress={address}
            selectedRoute={selectedRoute}
            quoteData={quoteData}
            toAddress={selfAddress}
          />
        )}
      </div>
      {/* <div aria-label='Modal1'>
        {isTokenVisible && (
          <Token
           
          />
        )}
      </div> */}
    </>
  );
};

export default Emp;
