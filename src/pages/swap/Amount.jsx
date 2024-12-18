import React, { useState } from "react";
import S from "../../assets/images/s.svg";
import Three from "../../assets/images/324.svg";
import Refresh from "../../assets/images/refresh.svg";
import Info from "../../assets/images/info.svg";
import { formatUnits } from "viem";
import Transcation from "./Transcation";
const Amount = ({ onClose, amountIn, amountOut, tokenA, singleToken, tokenB, refresh, confirm }) => {
  const [isConfirm, setConfirm] = useState(false);

  return (
    <>
      <div className="bg-black bg-opacity-40 py-10 flex justify-center items-center overflow-y-auto h-full my-auto fixed top-0 px-4 left-0 right-0 bottom-0 z-[9999] fade-in-out fade-out">
        <div className="w-full flex justify-center my-auto items-center">
          <div className="md:max-w-[390px] w-full bg-black border border-white rounded-3xl relative py-6 px-6 mx-auto">
            <svg
              className="absolute cursor-pointer right-8 top-6"
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.91 10.09C14.4166 10.5966 14.7012 11.2836 14.7012 12C14.7012 12.7164 14.4166 13.4034 13.91 13.91C13.4034 14.4166 12.7164 14.7012 12 14.7012C11.2836 14.7012 10.5966 14.4166 10.09 13.91C9.58344 13.4034 9.29886 12.7164 9.29886 12C9.29886 11.6453 9.36873 11.294 9.50447 10.9663C9.64022 10.6386 9.83918 10.3408 10.09 10.09C10.3408 9.83918 10.6386 9.64022 10.9663 9.50447C11.294 9.36873 11.6453 9.29886 12 9.29886C12.7164 9.29886 13.4034 9.58344 13.91 10.09"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.24999 12C5.24999 12.297 5.27699 12.594 5.31299 12.882L3.72499 14.124C3.55467 14.2574 3.43823 14.4478 3.39708 14.6602C3.35592 14.8725 3.39282 15.0926 3.50099 15.28L4.91299 17.723C5.02113 17.9101 5.1931 18.0519 5.39736 18.1224C5.60161 18.193 5.82445 18.1875 6.02499 18.107L7.44699 17.536C7.58542 17.4824 7.73483 17.4634 7.88226 17.4807C8.02969 17.4979 8.17068 17.5509 8.29299 17.635C8.51299 17.781 8.74099 17.915 8.97699 18.035C9.24699 18.172 9.44299 18.417 9.48599 18.717L9.70299 20.23C9.76599 20.672 10.145 21 10.591 21H13.408C13.6239 21 13.8326 20.9221 13.9957 20.7807C14.1588 20.6393 14.2654 20.4437 14.296 20.23L14.513 18.718C14.5366 18.5712 14.5956 18.4323 14.6848 18.3134C14.774 18.1944 14.8907 18.0989 15.025 18.035C15.26 17.917 15.487 17.784 15.706 17.639C15.8286 17.554 15.9702 17.5002 16.1183 17.4825C16.2665 17.4647 16.4167 17.4834 16.556 17.537L17.975 18.107C18.1756 18.1873 18.3983 18.1927 18.6025 18.1221C18.8067 18.0516 18.9787 17.9099 19.087 17.723L20.499 15.28C20.6072 15.0926 20.6441 14.8725 20.6029 14.6602C20.5618 14.4478 20.4453 14.2574 20.275 14.124L18.687 12.882C18.723 12.594 18.75 12.297 18.75 12C18.75 11.703 18.723 11.406 18.687 11.118L20.275 9.876C20.4453 9.74261 20.5618 9.55222 20.6029 9.33984C20.6441 9.12745 20.6072 8.90735 20.499 8.72L19.087 6.277C18.9789 6.08991 18.8069 5.94809 18.6026 5.87755C18.3984 5.80702 18.1755 5.8125 17.975 5.893L16.556 6.463C16.4167 6.51634 16.2665 6.53492 16.1184 6.51715C15.9703 6.49938 15.8287 6.44578 15.706 6.361C15.4871 6.21555 15.2597 6.08332 15.025 5.965C14.8907 5.90113 14.774 5.8056 14.6848 5.68663C14.5956 5.56766 14.5366 5.4288 14.513 5.282L14.297 3.77C14.2664 3.55627 14.1598 3.36074 13.9967 3.2193C13.8336 3.07785 13.6249 2.99999 13.409 3H10.592C10.3761 2.99999 10.1674 3.07785 10.0043 3.2193C9.84119 3.36074 9.73456 3.55627 9.70399 3.77L9.48599 5.284C9.46234 5.43026 9.40371 5.56865 9.31509 5.68739C9.22647 5.80613 9.11048 5.90171 8.97699 5.966C8.74099 6.086 8.51299 6.221 8.29299 6.366C8.1703 6.44971 8.02912 6.50236 7.88158 6.51943C7.73404 6.5365 7.58456 6.51748 7.44599 6.464L6.02499 5.893C5.82445 5.8125 5.60161 5.80702 5.39736 5.87755C5.1931 5.94809 5.02113 6.08991 4.91299 6.277L3.50099 8.72C3.39282 8.90735 3.35592 9.12745 3.39708 9.33984C3.43823 9.55222 3.55467 9.74261 3.72499 9.876L5.31299 11.118C5.27379 11.4104 5.25274 11.705 5.24999 12V12Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex gap-3 items-center">
              <svg
                className="cursor-pointer"
                onClick={onClose}
                width={14}
                height={11}
                viewBox="0 0 14 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M13.5 5.96344C13.5 6.37765 13.1642 6.71344 12.75 6.71344L0.75 6.71344C0.335786 6.71344 -5.08894e-08 6.37765 -3.27835e-08 5.96344C-1.46777e-08 5.54923 0.335786 5.21344 0.75 5.21344L12.75 5.21344C13.1642 5.21344 13.5 5.54923 13.5 5.96344Z"
                  fill="white"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.56689 1.14652C5.85978 1.43941 5.85978 1.91429 5.56689 2.20718L1.81065 5.96342L5.56689 9.71966C5.85978 10.0126 5.85978 10.4874 5.56689 10.7803C5.274 11.0732 4.79912 11.0732 4.50623 10.7803L0.219658 6.49375C-0.0732348 6.20086 -0.0732348 5.72598 0.219658 5.43309L4.50623 1.14652C4.79912 0.853626 5.274 0.853626 5.56689 1.14652Z"
                  fill="white"
                />
              </svg>
              <div className="text-white text-lg font-bold roboto leading-7">
                Select Amount
              </div>
            </div>
            <div className="mt-6">
              <div className="text-amber-600 text-sm font-normal roboto leading-normal">
                You Pay
              </div>
              <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
                {amountIn}
                <img src={tokenA.image} alt="Three" className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-6">
              <div className="text-amber-600 text-sm font-normal roboto leading-normal">
                You Receive
              </div>
              <div className="text-white text-2xl font-bold roboto leading-9 flex gap-3 items-center">
                {amountOut}
                <img src={tokenB.image} alt="S" className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-6 text-gray-40 text-white text-sm font-normal robotoleading-normal">
              Output is estimated. You will receive at least {amountOut} {tokenB.ticker} or the
              transaction will revert
            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-6">
              <div className="text-gray-400 text-sm font-normal roboto leading-normal">
                Price
              </div>
              <div className="flex gap-2 items-center">
        <div className="text-right text-white text-sm font-normal roboto leading-normal">
          1 {tokenA.ticker} ={" "}
          {singleToken && singleToken.amounts && singleToken.amounts[singleToken.amounts.length - 1]
            ? parseFloat(
                formatUnits(
                  singleToken.amounts[singleToken.amounts.length - 1],
                  parseInt(tokenB.decimal)
                )
              ).toFixed(6)
            : "0"}{" "}
          {tokenB.ticker}
        </div>
        <div className="cursor-pointer" onClick={() => refresh()}>
          <img src={Refresh} alt="Refresh" />
        </div>
      </div>


            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-gray-400 text-sm font-normal roboto leading-normal">
                  Minimum received
                </div>
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-sm font-normal roboto leading-normal">
                {amountOut} {tokenB.ticker}
              </div>
            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-gray-400 text-sm font-normal roboto leading-normal">
                  Price Impact
                </div>
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-sm font-normal roboto leading-normal">
                0.01%
              </div>
            </div>
            <div className="flex justify-between gap-3 items-center w-full mt-2">
              <div className="flex gap-2 items-center">
                <div className="text-gray-400 text-sm font-normal roboto leading-normal">
                  Liquidity Provider Fee
                </div>
                <img src={Info} alt="Info" />
              </div>
              <div className="text-right text-white text-sm font-normal roboto leading-normal">
                {(amountIn * 0.0028).toFixed(6)} {tokenA.ticker}
              </div>
            </div>
            <button
              onClick={() => confirm()}
              className="w-full rounded-xl px-4 py-4 bg-[#FF9900] flex gap-4 items-center mt-6 justify-center hover:bg-transparent border border-[#FF9900] hover:text-[#FF9900]"
            >
              <div className="text-white text-base font-bold roboto text-center leading-normal">
                Confirm
              </div>
            </button>
          </div>
        </div>
      </div>
      <div aria-label="Modal">
        {isConfirm && <Transcation onClose={() => setConfirm(false)} />}
      </div>
    </>
  );
};

export default Amount;
