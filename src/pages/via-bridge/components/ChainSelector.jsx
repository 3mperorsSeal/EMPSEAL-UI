import { ChevronDown } from "lucide-react";
import { LogoService } from "../../../services/LogoService";

const ChainSelector = ({ chain, onClick }) => {
  const logo = LogoService.getChainLogo(chain.id);

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full bg-transparent"
    >
      <div className="flex items-center justify-center gap-2">
        {logo && <img src={logo} alt={chain.name} className="md:w-10 md:h-10 w-6 h-6 rounded-full" />}
        {/* <span className="md:text-xl text-[10px] font-medium">
          {chain.name}
        </span> */}
      </div>
      {/* <span className="md:text-xs text-[10px] text-black">
        <ChevronDown size={16} />
      </span> */}
    </button>
  );
};

export default ChainSelector;
