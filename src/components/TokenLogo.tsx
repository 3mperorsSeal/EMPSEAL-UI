import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { LogoService } from "../services/LogoService";

interface TokenLogoProps {
    chainId: number;
    tokenAddress: string;
    symbol?: string;
    className?: string;
}

export const TokenLogo = ({ chainId, tokenAddress, symbol, className = "h-5 w-5" }: TokenLogoProps) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchLogo = async () => {
            if (!tokenAddress) return;
            const url = await LogoService.getTokenLogo(chainId, tokenAddress);
            if (mounted && url) {
                setLogoUrl(url);
            }
        };

        fetchLogo();

        return () => {
            mounted = false;
        };
    }, [chainId, tokenAddress]);

    if (logoUrl) {
        return <img src={logoUrl} alt={symbol} className={`rounded-full ${className}`} />;
    }

    return <Coins className={className} />;
};
