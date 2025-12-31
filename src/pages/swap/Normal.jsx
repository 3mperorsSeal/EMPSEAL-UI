import React, { useState } from "react";
import Emp from "./Emp";
import Wallet from "./Wallet";
import Graph from "./Graph";
import X from "../../assets/images/x.svg";
import L from "../../assets/images/linked.svg";
import Y from "../../assets/images/youtube.svg";
import RoutingButton from "./RoutingButton";

const Normal = () => {
  const [padding, setPadding] = useState("lg:min-h-[429px] h-full");
  const [bestRoute, setBestRoute] = useState(null);

  return (
    <>
      <div className="pt-3 pb-10 relative">
        <div className="mx-auto w-full px-4 flex flex-col justify-start xl:gap-4 gap-4 items-start 2xl:pt-1 py-2 md:flex-nowrap flex-wrap">
          <div className="w-full">
            <div className="md:hidden block">
              <Wallet />
            </div>
            <Emp setPadding={setPadding} setBestRoute={setBestRoute} />
          </div>
          <div className="md:max-w-[474px] w-full">
            <div className="md:block hidden">
              <Wallet />
            </div>
            <div className="mt-3 lg:fixed absolute md:left-0 lefts lefts01 2xl:bottom-[32%] lg:bottom-[33%] md:bottom-[27%] bottom-[312px]">
              <RoutingButton bestRoute={bestRoute} />
            </div>
            <div className="mt-3 hidden">
              <Graph padding={padding} />
            </div>
          </div>
        </div>
        {/* Social buttons */}
        <div className="md:flex hidden md:justify-end justify-center gap-4 items-center md:max-w-[1400px] w-full mx-auto px-4 lg:fixed bottom-6 2xl:right-[6%] right-[1%]">
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-16 h-16 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={X} alt="x" className="2xl:w-6 2xl:h-6 w-4 h-4" />
          </button>
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-16 h-16 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={L} alt="x" className="2xl:w-6 2xl:h-6 w-4 h-4" />
          </button>
          <button className="flex justify-center items-center 2xl:w-16 2xl:h-16 w-16 h-16 rounded-[10px] border border-[#FF9900] bg-transparent hover:opacity-80 transition-all">
            <img src={Y} alt="x" className="2xl:w-6 2xl:h-6 w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Normal;