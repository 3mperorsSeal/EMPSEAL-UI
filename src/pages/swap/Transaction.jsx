import React from "react";
import Trans from "../../assets/images/trans.png";
import { swapTokens } from "../../utils/contractCalls";
import { Link } from "react-router-dom";
import Logo from '../../assets/images/swap-emp.png';
import { useChainConfig } from "../../hooks/useChainConfig";

const Transaction = ({ onClose, transactionHash }) => {
  const {blockExplorer, blockExplorerName} = useChainConfig();
  return (
    <>
      <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
        <div className="w-full flex justify-center my-auto items-center">
          <div className="md:max-w-[390px] w-full bg-black border border-white rounded-3xl relative py-6 px-6 mx-auto">
            <svg
              onClick={onClose}
              className="absolute cursor-pointer right-8 top-9"
              width={18}
              height={19}
              viewBox="0 0 18 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
                stroke="#ffff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-10">
              <img src={Logo} alt="Trans" className="mx-auto" />
            </div>
            <div className="text-white text-sm font-bold roboto text-center leading-normal mt-10">
              Transaction Submitted
            </div>
            <div className="rounded-xl px-4 py-4 bg-[#2C2D3A] flex gap-4 items-center mt-6 justify-center">
              <Link target="_blank" to={`${blockExplorer}${transactionHash}`}>
              <div className="text-white text-base font-bold roboto text-center leading-normal">
                
                View on {blockExplorerName}
              </div>
              </Link>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Transaction;
