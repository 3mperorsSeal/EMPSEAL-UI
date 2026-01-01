import { X } from "lucide-react";
import { LogoService } from "../../../services/LogoService";

const SelectionModal = ({ isOpen, onClose, items, onSelect, title }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 z-50 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative text-white md:p-8 p-6 rounded-2xl md:max-w-[618px] w-full clip-bg roboto"
      >
        {/* Header */}
        <div className="flex justify-center items-center mb-4">
          <h3 className="md:text-2xl text-lg font-medium text-white text-center tracking-widest md:mt-10 mt-5">
            {title}
          </h3>

          <button
            onClick={onClose}
            className="absolute md:right-10 right-7 top-14 cursor-pointer"
          >
            <X size={30} />
          </button>
        </div>

        {/* Items */}
        <div className="max-h-60 overflow-y-auto">
          {items.map((item) => {
            const logo = LogoService.getChainLogo(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className="p-3.5 flex items-center gap-3 hoverclip rounded-lg cursor-pointer my-3.5"
              >
                {logo && (
                  <div className="w-[33px] h-[33px] flex justify-center items-center shrink-0">
                    <img
                      src={logo}
                      alt={item.name}
                      className="w-full rounded-full"
                    />
                  </div>
                )}
                <span className="font-medium text-white text-2xl">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SelectionModal;
