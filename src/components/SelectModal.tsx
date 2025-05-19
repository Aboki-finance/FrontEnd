import React from "react";
import { Search } from "lucide-react";
import { Token, Currency, TokenSymbol } from "../types/SwapTypes";
import { formatBalance } from "../contracts/hooks/useQuoteContract";

interface SelectModalProps {
   isOpen: boolean;
   onClose: () => void;
   title: string;
   items: Token[] | Currency[];
   searchQuery: string;
   onSearchChange: (value: string) => void;
   onItemSelect: (symbol: string) => void;
   isToken: boolean;
   authenticated?: boolean;
   getTokenBalance?: (symbol: TokenSymbol) => string;
}

const SelectModal: React.FC<SelectModalProps> = ({
   isOpen,
   onClose,
   title,
   items,
   searchQuery,
   onSearchChange,
   onItemSelect,
   isToken,
   authenticated = false,
   getTokenBalance,
}) => {
   if (!isOpen) return null;

   const isTokenItem = (item: Token | Currency): item is Token => {
      return "icon" in item;
   };

   return (
      <div
         className="fixed inset-0 bg-white/70 flex items-center justify-center z-50"
         onClick={onClose}>
         <div
            className="bg-gray-800 border border-white rounded-xl w-[90%] max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="my-4 p-4 border-b border-gray-800 flex justify-between items-center">
               <h3 className="text-xl font-semibold text-white">{title}</h3>
               <button
                  className="text-gray-400 hover:text-white"
                  onClick={onClose}>
                  <svg
                     xmlns="http://www.w3.org/2000/svg"
                     className="h-6 w-6"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor">
                     <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                     />
                  </svg>
               </button>
            </div>
            <div className="p-4 border-b border-gray-800 relative">
               <input
                  type="text"
                  placeholder={`Search ${isToken ? "tokens" : "currencies"}...`}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={`w-full ${
                     isToken
                        ? "bg-[#ffffff] text-black"
                        : "bg-[#161b2b] text-white"
                  } border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500`}
               />
               <Search
                  size={20}
                  className="absolute top-7 left-8 text-gray-400"
               />
            </div>
            <div className="max-h-[40vh] overflow-y-auto p-2">
               {items.map((item) => (
                  <div
                     key={item.symbol}
                     className="flex justify-between items-center p-3 hover:bg-[#21273a] rounded-lg cursor-pointer"
                     onClick={() => onItemSelect(item.symbol)}>
                     <div className="flex items-center gap-3">
                        <img
                           src={isTokenItem(item) ? item.icon : item.flag}
                           alt={item.symbol}
                           className={`w-8 h-8 ${
                              !isTokenItem(item)
                                 ? "object-cover rounded-full border border-gray-800"
                                 : ""
                           }`}
                        />
                        <div>
                           <div className="text-white font-medium">
                              {item.symbol}
                           </div>
                           <div className="text-sm text-gray-400">
                              {item.name}
                           </div>
                        </div>
                     </div>
                     {isToken && authenticated && getTokenBalance && (
                       <div className="text-purple-300">
                       {/* {getTokenBalance(item.symbol as TokenSymbol)} */}
                       {formatBalance(
                       getTokenBalance(item.symbol as TokenSymbol),
                       5
                       )}
                       </div>
                     )}
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

export default SelectModal;
