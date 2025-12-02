import { X } from "lucide-react";

const SelectionModal = ({ isOpen, onClose, items, onSelect, title }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 z-50 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative text-white md:p-8 p-6 rounded-2xl md:max-w-[520px] w-full clip-bg roboto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300"
          >
            <X />
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="p-3 flex items-center hover:bg-[#FF9900]/10 rounded-lg cursor-pointer"
            >
              <span className="text-sm font-medium text-white">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectionModal;
