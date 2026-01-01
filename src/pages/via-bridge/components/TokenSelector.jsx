import { ChevronDown } from "lucide-react";
import { TokenLogo } from "../../../components/TokenLogo";

const TokenSelector = ({ token, chainId, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full bg-transparent"
    >
      <div className="flex items-center">
        <TokenLogo
          chainId={chainId}
          tokenAddress={token.address}
          symbol={token.symbol}
          className="md:w-8 md:h-8 w-5"
        />
        <span className="md:text-2xl text-[10px] font-medium text-white">{token.symbol}</span>
        {/* <ChevronDown size={16} className="text-white ml-1" /> */}
      </div>
    </button>
  );
};

export default TokenSelector;
