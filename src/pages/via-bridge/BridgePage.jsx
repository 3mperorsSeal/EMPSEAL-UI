import BridgeInterface from "./BridgeInterface";
// import BridgeStats from "./BridgeStats";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

const BridgePage = () => {
  const [activeTab, setActiveTab] = useState("via-bridge");

  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    if (path === "/") setActiveTab("cross");
    if (path === "/native-bridge") setActiveTab("native");
    if (path === "/via-bridge") setActiveTab("viabridge");
  }, [path]);
  return (
    <div
      className={`w-full rounded-xl lg:pt-1 pt-2 2xl:px-16 lg:px-12 md:px-8 px-1 md:mt-0 mt-1 relative 2xl:pb-20 xl:pb-10 lg:pb-0 pb-10`}
    >
      <div className="w-full">
        <div className="md:max-w-[1100px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap lg:mt-1 mt-6 px-3 pb-4 scales8 scales81 top0">
          <h1 className="md:text-5xl text-3xl text-center text-[#FF9900] font-orbitron font-bold mb-2">
            Cross-Chain Bridge
          </h1>
          <p className="text-lg text-gray-400 text-center">
            Seamlessly transfer tokens between PulseChain and Base
          </p>
          <div className="flex justify-center gap-4 mt-7 md:flex-nowrap flex-wrap md:max-w-[600px] w-full mx-auto">
            {/* Cross Chain Swap */}
            <Link to="/" className="w-full">
              <div
                className={`${
                  activeTab === "cross"
                    ? "border-[#FF9900]"
                    : "border-[#3b3c4e]"
                } 
      cursor-pointer w-full h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
              >
                Cross Chain Swap
              </div>
            </Link>

            {/* Native Bridge */}
            <Link to="/native-bridge" className="w-full">
              <div
                className={`${
                  activeTab === "native"
                    ? "border-[#FF9900]"
                    : "border-[#3b3c4e]"
                } 
      px-3 py-2 w-full h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
              >
                Native Bridge
              </div>
            </Link>

            {/* Via Bridge */}
            <Link to="/via-bridge" className="w-full">
              <div
                className={`${
                  activeTab === "viabridge"
                    ? "border-[#FF9900]"
                    : "border-[#3b3c4e]"
                } 
      px-3 py-2 w-full h-[28px] flex justify-center items-center 
      rounded-md border text-white text-[15px] font-bold roboto`}
              >
                Via Bridge
              </div>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {/* <BridgeStats /> */}
        {/* Bridge Interface */}
        <BridgeInterface />
        {/* Info Section */}
        <div className="w-full md:px-0 px-4 scales8 scales81">
          <div className="mt-16 md:max-w-[1300px] w-full mx-auto bg-[#100C06] border border-[#100C06] rounded-xl lg:px-12 px-6 lg:py-12 py-10 sctable">
            <h2 className="md:text-[40px] text-[32px] font-extrabold text-white mb-10 font-orbitron">
              How It Works
            </h2>

            <ol className="space-y-6">
              {/* Step 1 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  1
                </span>
                <span className="text-white text-sm">
                  Connect your wallet and select the source chain
                </span>
              </li>

              {/* Step 2 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  2
                </span>
                <span className="text-white text-sm">
                  Approve USDC for the protocol fee (0.30 USDC)
                </span>
              </li>

              {/* Step 3 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  3
                </span>
                <span className="text-white text-sm">
                  Approve the tokens you want to bridge
                </span>
              </li>

              {/* Step 4 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  4
                </span>
                <span className="text-white text-sm">
                  Execute the bridge and wait 2–10 minutes for cross-chain
                  processing
                </span>
              </li>

              {/* Step 5 */}
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  5
                </span>
                <span className="text-white text-sm">
                  Track your transaction on{" "}
                  <a
                    href="https://scan.vialabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF9900] underline"
                  >
                    VIA Scanner
                  </a>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BridgePage;
