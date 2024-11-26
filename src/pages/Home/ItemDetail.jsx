import React from 'react';
import ItemImage from '../../assets/images/item-detail.svg';
import ActivityImage from '../../assets/images/activity_img.svg';
import ItemDetails from '../../components/ItemDetails';
const ItemDetail = () => {
  return (
    <div className="container p-10">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-4">
          <div className="border_gradient p-5 bg-[#222222]">
            <div className="relative z-10">
              <img
                src={ItemImage}
                alt="Milady #872"
                className="w-full h-auto"
              />
            </div>

            <div className="p-4 relative z-10 roboto">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-[#FF9900]">
                  Milady #872
                </h2>
                <div className="flex items-center gap-2">
                  <img
                    src={ActivityImage}
                    alt="Activity"
                    className="h-8 w-8 rounded-full"
                  />
                  <span className="text-sm text-white">Milady_Erbsu</span>
                </div>
              </div>

              <div className="border border-white p-3 rounded-lg mb-4">
                <div className="text-sm text-gray-400">Current Price:</div>
                <div className="text-xl font-bold text-white">
                  255 SEI{' '}
                  <span className="text-sm text-gray-400">($108.33)</span>
                </div>
              </div>

              <div className="text-sm text-gray-400 mb-4">
                Listing ends on:{' '}
                <span className="text-white">
                  November 19th 2024, 1:58:22 PM
                </span>
              </div>

              <div className="gap-4">
                <div>
                  <button className="bg-[#FF9900] hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded w-full">
                    BUY NOW
                  </button>
                </div>
                <div className="mt-4">
                  <button className="border border-[#FF9900] text-[#FF9900] hover:bg-[#FF9900] hover:text-black font-medium py-2 px-4 rounded w-full">
                    PLACE BID
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-8">
          <ItemDetails />
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
