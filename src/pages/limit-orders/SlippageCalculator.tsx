import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

interface SlippageCalculatorProps {
  onSlippageChange: (slippage: number) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  slippage: number;
}

export function SlippageCalculator({
  onSlippageChange,
  isOpen,
  onOpenChange,
  slippage = 0.5,
}: SlippageCalculatorProps) {
  const [customSlippage, setCustomSlippage] = useState(
    [0.5, 1.0, 2.0].includes(slippage) ? "" : String(slippage)
  );

  useEffect(() => {
    const isPreset = [0.5, 1.0, 2.0].includes(slippage);
    if (!isPreset) {
      setCustomSlippage(String(slippage));
    } else {
      setCustomSlippage("");
    }
  }, [slippage]);

  const handleSelect = (value: number) => {
    onSlippageChange(value);
    onOpenChange(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomSlippage(value);
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 5) {
      onSlippageChange(parsedValue);
    }
  };

  const handleReset = () => {
    const defaultValue = 0.5;
    onSlippageChange(defaultValue);
    onOpenChange(false);
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Slippage Tolerance</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Slippage tolerance is the maximum percentage of price movement you
            are willing to accept for your order to be executed.
          </p>
          <div className="flex items-center justify-between gap-2">
            {[0.5, 1.0, 2.0].map((preset) => (
              <Button
                key={preset}
                variant={
                  slippage === preset && !customSlippage ? "default" : "outline"
                }
                onClick={() => handleSelect(preset)}
                className="flex-1"
              >
                {preset}%
              </Button>
            ))}
            <div className="relative flex-1">
              <Input
                id="custom-slippage"
                placeholder="Custom"
                value={customSlippage}
                onChange={handleCustomChange}
                className="pr-8 text-center"
                type="number"
                step="0.1"
                min="0"
                max="5"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
          {parseFloat(customSlippage) > 5 && (
            <p className="text-sm text-destructive">
              Custom slippage cannot exceed 5%.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" onClick={handleDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
