import { ChevronDown } from "lucide-react";

const TokenSelector = ({ token, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full bg-transparent"
    >
      <div className="flex items-center">
        <span className="md:text-xs text-[10px] font-medium text-white">{token.symbol}</span>
        <ChevronDown size={16} className="text-white ml-1" />
      </div>
    </button>
  );
};

export default TokenSelector;
