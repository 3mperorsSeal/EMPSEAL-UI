import { useRef, useEffect } from "react";
import Min from "../../../assets/images/min.png";
import Dis from "../../../assets/images/dis.png";
import Copy from "../../../assets/images/copy.png";

export default function AddressCard({
  address,
  onCopy,
  onDisconnect,
  onClose,
}) {
  const popupRef = useRef(null);
  const shortAddress =
    address && address.length > 8
      ? `${address.slice(0, 4)}...${address.slice(-4)}`
      : address;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="relative bg-black text-white md:p-12 p-6 rounded-2xl clip-bg flex flex-col items-center gap-4 md:max-w-[430px] w-full border border-[#FF9900]"
    >
      <svg
        onClick={onClose}
        className="absolute cursor-pointer md:right-10 right-4 md:top-12 top-4 tilt"
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
      <img
        src={Min}
        alt="Avatar"
        className="md:w-[100px] md:h-[100px] w-16 h-16 rounded-full object-cover"
      />
      <p className="text-2xl font-bold roboto">{shortAddress}</p>
      <p className="text-gray-400 font-medium text-xl mb-5">0 PLS</p>
      <div
        className="relative text-black px-6 py-2 rounded-md w-full font-semibold text-2xl font-orbitron text-center cursor-pointer hover:opacity-90 transition-all"
        onClick={onCopy}
      >
        <img
          src={Copy}
          alt="Copy"
          className="absolute left-0 right-0 top-0 bottom-0 mx-auto my-auto z-0"
        />
        <span className="relative z-10">Copy Address</span>
      </div>
      <div
        className="mt-5 relative text-[#FF9900] bg-transparent px-6 py-2 rounded-md w-full font-semibold text-2xl text-center font-orbitron cursor-pointer hover:opacity-80 transition-all"
        onClick={onDisconnect}
      >
        <img
          src={Dis}
          alt="Disconnect"
          className="absolute left-0 right-0 top-0 bottom-0 mx-auto my-auto"
        />
        <span className="relative z-10">Disconnect</span>
      </div>
    </div>
  );
}
