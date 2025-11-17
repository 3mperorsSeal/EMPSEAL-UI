import { useState } from "react";
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
}

export function SlippageCalculator({
  onSlippageChange,
}: SlippageCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlippage, setCurrentSlippage] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState("");

  const presets = [0.5, 1.0, 2.0];

  const handleSelect = (value: number) => {
    setCurrentSlippage(value);
    setCustomSlippage("");
    onSlippageChange(value);
    setIsOpen(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomSlippage(value);
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 5) {
      setCurrentSlippage(parsedValue);
      onSlippageChange(parsedValue);
    }
  };

  const handleReset = () => {
    setCurrentSlippage(0);
    setCustomSlippage("");
    onSlippageChange(0);
    setIsOpen(false);
  };

  const handleDone = () => {
    onSlippageChange(currentSlippage);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
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
            {presets.map((preset) => (
              <Button
                key={preset}
                variant={
                  currentSlippage === preset && !customSlippage
                    ? "default"
                    : "outline"
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
