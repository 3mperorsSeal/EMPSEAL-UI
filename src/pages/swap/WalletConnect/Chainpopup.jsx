import Copy from "../../../assets/images/copy.png";
import Dis from "../../../assets/images/dis.png";

const ChainPopup = ({
  setShowChainPopup,
  availableChains,
  chain,
  switchChain,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
      <div className="relative bg-black text-white md:p-10 p-6 rounded-2xl flex flex-col items-center gap-6 md:max-w-[430px] w-full clip-bg">
        {/* Close button */}
        <svg
          onClick={() => setShowChainPopup(false)}
          className="absolute cursor-pointer md:right-10 right-4 md:top-12 top-4 hover:scale-110 transition-transform"
          width={18}
          height={19}
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

        <h2 className="text-2xl text-white roboto mb-2">Select Network</h2>

        <div className="flex flex-col gap-8 w-full">
          {availableChains.map((c) => {
            const isActive = chain?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  switchChain({ chainId: c.id });
                  setShowChainPopup(false);
                }}
                className={`relative w-full text-center px-6 py-3 font-orbitron font-semibold text-xl cursor-pointer hover:opacity-80 transition-all ${
                  isActive ? "text-black" : "text-[#FF9900]"
                }`}
              >
                <img
                  src={isActive ? Copy : Dis}
                  alt={isActive ? "Active" : "Inactive"}
                  className="absolute left-0 right-0 top-0 bottom-0 mx-auto my-auto z-0 pointer-events-none"
                />
                <span className="relative z-10">{c.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChainPopup;
