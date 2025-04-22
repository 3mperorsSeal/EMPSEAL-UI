import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { createChart, LineSeries, LineStyle } from "lightweight-charts";
import { useStore } from "../../redux/store/routeStore";
import { useChainConfig } from '../../hooks/useChainConfig';
import LoadingSpinner from "../../components/LoadingSpinner";
import SpinnerImage from "../../assets/images/spinner_middle.svg";

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const PRICE_CHART_ID = "price-chart-widget-container";

// Chain to GeckoTerminal network mapping
const CHAIN_TO_GECKO = {
  'pulsechain': 'pulsechain',
  'ethereumpow': 'ethw',
};

const PriceChartWidget = ({ tokenAddress }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadWidget = () => {
      try {
        if (typeof window.createMyWidget === "function") {
          window.createMyWidget(PRICE_CHART_ID, {
            autoSize: true,
            chainId: "0x171", // Pulsechain
            tokenAddress,
            defaultInterval: "1D",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Etc/UTC",
            theme: "moralis",
            locale: "en",
            backgroundColor: "#000000",
            gridColor: "#000000",
            textColor: "#ffffff",
            candleUpColor: "#4CE666",
            candleDownColor: "#E64C4C",
            hideLeftToolbar: true,
            hideTopToolbar: false,
            hideBottomToolbar: true,
          });
        } else {
          console.error("createMyWidget function is not defined.");
        }
      } catch (error) {
        console.error("Failed to load widget:", error);
      }
    };

    if (!document.getElementById("moralis-chart-widget")) {
      const script = document.createElement("script");
      script.id = "moralis-chart-widget";
      script.src = "https://moralis.com/static/embed/chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = loadWidget;
      script.onerror = () => {
        console.error("Failed to load the chart widget script.");
      };
      document.body.appendChild(script);
    } else {
      loadWidget();
    }

    return () => {
      // Cleanup if needed
      const script = document.getElementById("moralis-chart-widget");
      if (script) {
        script.remove();
      }
    };
  }, [tokenAddress]);

  return (
    <div className="w-full h-[400px]" id={PRICE_CHART_ID} ref={containerRef} />
  );
};

const ManualChart = ({ finalTokenInfo, geckoNetwork, loading, setLoading, error, setError }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!finalTokenInfo || !chartContainerRef.current) return;

    const cleanupChart = () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };

    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
  
      try {
        const poolSearch = await axios.get(
          `https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/tokens/${finalTokenInfo.toLowerCase()}/pools?page=1`
        );

        if (!poolSearch.data.data || poolSearch.data.data.length === 0) {
          throw new Error("No pool found for token");
        }
  
        const poolAddress = poolSearch.data.data[0].id.replace(`${geckoNetwork}_`, "");
        const ohlcvRes = await axios.get(
          `https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/pools/${poolAddress}/ohlcv/day?aggregate=1`
        );
        const ohlcvList = ohlcvRes.data.data.attributes.ohlcv_list;
  
        const candleData = ohlcvList
          .map(candle => ({
            time: new Date(candle[0]).getTime() / 1000,
            value: parseFloat(candle[4]),
          }))
          .sort((a, b) => a.time - b.time);
  
        const container = chartContainerRef.current;
        if (container) {
          cleanupChart();

          const chartOptions = {
            layout: {
              background: { type: 'solid', color: 'black' },
              textColor: 'white',
              fontSize: 12,
              fontFamily: "'Roboto', sans-serif",
            },
            grid: {
              vertLines: {
                color: 'rgba(255, 255, 255, 0.1)',
                style: LineStyle.Dotted,
              },
              horzLines: {
                color: 'rgba(255, 255, 255, 0.1)',
                style: LineStyle.Dotted,
              },
            },
            crosshair: {
              mode: 1,
              vertLine: {
                width: 1,
                color: 'rgba(255, 153, 0, 0.5)',
                style: LineStyle.Solid,
                labelVisible: true,
                labelBackgroundColor: '#FF9900',
              },
              horzLine: {
                width: 1,
                color: 'rgba(255, 153, 0, 0.5)',
                style: LineStyle.Solid,
                labelBackgroundColor: '#FF9900',
              },
            },
            timeScale: {
              timeVisible: true,
              secondsVisible: false,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            rightPriceScale: {
              borderColor: 'rgba(255, 255, 255, 0.2)',
              autoScale: true,
            },
            width: container.clientWidth,
            height: 400,
            localization: {
              timeFormatter: (time) => {
                const date = new Date(time * 1000);
                return date.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
              },
            },
          };
  
          const chart = createChart(container, chartOptions);
          chartRef.current = chart;

          const series = chart.addSeries(LineSeries,{
            color: '#00ff00',
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBorderColor: '#00ff00',
            crosshairMarkerBackgroundColor: '#000000',
            priceFormat: {
              type: 'price',
              precision: 6,
              minMove: 0.000001,
            },
          });

          series.setData(candleData);
          chart.timeScale().fitContent();

          const handleResize = () => {
            if (chartRef.current) {
              chartRef.current.applyOptions({
                width: container.clientWidth,
              });
            }
          };

          window.addEventListener('resize', handleResize);
          return () => {
            window.removeEventListener('resize', handleResize);
            cleanupChart();
          };
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load chart");
        cleanupChart();
      } finally {
        setLoading(false);
      }
    };
  
    fetchChartData();
  
    return () => {
      cleanupChart();
    };
  }, [finalTokenInfo, geckoNetwork]);

  return <div ref={chartContainerRef} className="w-full h-[400px]" />;
};

export const Graph = ({ padding }) => {
  const path = useStore((state) => state.path);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    chain: currentChain,
  } = useChainConfig();

  const finalTokenInfo = path[0] === EMPTY_ADDRESS ? path[1] : path[0];
  const geckoNetwork = CHAIN_TO_GECKO[currentChain.name.toLowerCase()] || 'pulsechain';
  const isPulsechain = currentChain.name.toLowerCase() === 'pulsechain';

  return (
    <div className={`border-[2px] border-[#FF9900] rounded-xl pt-4 bg-black ${padding}`}>
      {/* {loading && <LoadingSpinner SpinnerImage={SpinnerImage} />} */}
      {error && (
        <div className="flex items-center justify-center py-4 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}
      {isPulsechain ? (
        <PriceChartWidget tokenAddress={finalTokenInfo} />
      ) : (
        <ManualChart
          finalTokenInfo={finalTokenInfo}
          geckoNetwork={geckoNetwork}
          loading={loading}
          setLoading={setLoading}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
};

export default Graph;
