import { ChevronDown } from "lucide-react";

const ChainSelector = ({ chain, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full bg-transparent"
    >
      <div className="flex items-center justify-center">
        <span className="md:text-xs text-[10px] font-medium text-black">
          {chain.name}
        </span>
      </div>
      <span className="md:text-xs text-[10px] text-black">
        <ChevronDown size={16} />
      </span>
    </button>
  );
};

export default ChainSelector;
