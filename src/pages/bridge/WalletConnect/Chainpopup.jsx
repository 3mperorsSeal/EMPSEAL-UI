import { useState } from "react";
import dummyImage from "../../../assets/images/emp-logo.png";

const ChainPopup = ({
  setShowChainPopup,
  availableChains,
  chain,
  switchChain,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChains = availableChains.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 s_chain flex items-center justify-center z-50 px-4 overflow-y-auto md:pt-10 md:pb-10 pt-[10rem] pb-20">
      <div className="relative text-white md:p-10 p-6 rounded-2xl flex flex-col items-center gap-6 md:max-w-[810px] w-full">
        <svg
          onClick={() => setShowChainPopup(false)}
          className="absolute cursor-pointer md:right-4 right-4 md:top-2 top-2 hover:scale-110 transition-transform"
          width={20}
          height={20}
          viewBox="0 0 18 19"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center roboto text-white md:mb-10 mb-4 tracking-wide">
          Select Chain
        </h2>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search Chain"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-[#382B19]/30 h-16 bg-[#382B19] rounded-[10px] roboto placeholder-[#5C5C5C] px-4 py-2 focus:outline-none focus:border-[#ff9900] text-xs font-normal"
        />

        {/* Chain cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full overflow-y-auto h-[48vh] chain_scroll">
          {filteredChains.map((c) => {
            const isActive = chain?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  switchChain({ chainId: c.id });
                  setShowChainPopup(false);
                }}
                className={`group relative flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl py-6 md:w-[210px] h-[210px] border-2 transition-all ${
                  isActive ? "bg-black sc1" : "bg-black sc1"
                }`}
              >
                <div className="w-12 h-12 bg-white rounded-full flex justify-center items-center">
                  <img
                    src={c.icon || dummyImage}
                    alt={c.name}
                    onError={(e) => (e.currentTarget.src = dummyImage)}
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <span
                  className={`font-orbitron text-xl font-semibold text-center ${
                    isActive
                      ? "text-[#ff9900]"
                      : "text-[#ff9900] group-hover:text-[#b4a895]"
                  }`}
                >
                  {c.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChainPopup;

// import Copy from "../../../assets/images/copy.png";
// import Dis from "../../../assets/images/dis.png";

// const ChainPopup = ({
//   setShowChainPopup,
//   availableChains,
//   chain,
//   switchChain,
// }) => {
//   return (
//     <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
//       <div className="relative bg-black text-white md:p-10 p-6 rounded-2xl flex flex-col items-center gap-6 md:max-w-[430px] w-full clip-bg">
//         {/* Close button */}
//         <svg
//           onClick={() => setShowChainPopup(false)}
//           className="absolute cursor-pointer md:right-10 right-4 md:top-12 top-4 hover:scale-110 transition-transform"
//           width={18}
//           height={19}
//           viewBox="0 0 18 19"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path
//             d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
//             stroke="#ffffff"
//             strokeWidth={2}
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//         </svg>

//         <h2 className="text-2xl text-white roboto mb-2">Select Network</h2>

//         <div className="flex flex-col gap-8 w-full">
//           {availableChains.map((c) => {
//             const isActive = chain?.id === c.id;
//             return (
//               <div
//                 key={c.id}
//                 onClick={() => {
//                   switchChain({ chainId: c.id });
//                   setShowChainPopup(false);
//                 }}
//                 className={`relative w-full text-center px-6 py-3 font-orbitron font-semibold text-xl cursor-pointer hover:opacity-80 transition-all ${
//                   isActive ? "text-black" : "text-[#FF9900]"
//                 }`}
//               >
//                 <img
//                   src={isActive ? Copy : Dis}
//                   alt={isActive ? "Active" : "Inactive"}
//                   className="absolute left-0 right-0 top-0 bottom-0 mx-auto my-auto z-0 pointer-events-none"
//                 />
//                 <span className="relative z-10">{c.name}</span>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChainPopup;
