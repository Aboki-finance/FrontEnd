// components/SwapSection.tsx
import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
   SectionInfo,
   TokenSymbol,
   CurrencySymbol,
   SwapMode,
} from "../types/SwapTypes";
import { FaWallet } from "react-icons/fa";
import { getImageUrl } from "../utils/swapUtils";
import { getExchangeRates, calculateWithExchangeRate } from "../constants/swapConstants";
import {
   useTokenQuote,
   formatBalance,
} from "../contracts/hooks/useQuoteContract";

interface SwapSectionProps {
   sectionInfo: SectionInfo;
   isInput: boolean;
   sendAmount: string;
   receiveAmount: string;
   onAmountChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
   selectedToken: TokenSymbol | null;
   selectedCurrency: CurrencySymbol | null;
   swapMode: SwapMode;
   authenticated: boolean;
   getTokenBalance: (symbol: TokenSymbol | null) => string;
   isBalanceLoading?: boolean;
}

const SwapSection: React.FC<SwapSectionProps> = ({
   sectionInfo,
   isInput,
   sendAmount,
   receiveAmount,
   onAmountChange,
   selectedToken,
   selectedCurrency,
   swapMode,
   authenticated,
   getTokenBalance,
   isBalanceLoading = false,
}) => {
   const sectionTitle = sectionInfo.title;
   const selected = sectionInfo.selected;
   const selectLabel = sectionInfo.isToken ? "Select token" : "Select currency";
   const selectedItem = selected ? sectionInfo.findItem(selected) : undefined;
   const imageUrl = getImageUrl(selectedItem, sectionInfo.imageKey);

   // State for exchange rate and USD values
   const [usdValue, setUsdValue] = useState("0.00");
   const [exchangeRateText, setExchangeRateText] = useState<string | null>(null);
   const [isRateLoading, setIsRateLoading] = useState(false);
   const [rateError, setRateError] = useState<string | null>(null);

   // Only fetch quote if this is a token section and we have an amount
   const shouldFetchQuote =
      sectionInfo.isToken && (isInput ? !!sendAmount : !!receiveAmount);

   // Use our custom hook to get real-time USD value
   const { quoteInUSD, quoteInNGN, isLoading: isQuoteLoading, error: quoteError } = useTokenQuote(
      isInput ? sendAmount : receiveAmount,
      shouldFetchQuote ? (selected as string) : null
   );

   // Update exchange rate text
   useEffect(() => {
      if (!selectedToken || !selectedCurrency) {
         setExchangeRateText(null);
         return;
      }

      const updateRateText = async () => {
         try {
            setIsRateLoading(true);
            setRateError(null);
            
            const rates = await getExchangeRates();
            let rateText: string | null = null;

            if (swapMode === "tokenToCurrency" && isInput && selected) {
               const rate = rates[selected as TokenSymbol]?.[selectedCurrency];
               if (rate) {
                  rateText = `1 ${selected} ≈ ${rate.toLocaleString()} ${selectedCurrency}`;
               }
            } else if (swapMode === "currencyToToken" && isInput && selected) {
               const rate = rates[selected as CurrencySymbol]?.[selectedToken];
               if (rate) {
                  rateText = `1 ${selected} ≈ ${rate.toLocaleString()} ${selectedToken}`;
               }
            } else if (swapMode === "tokenToCurrency" && !isInput && selected) {
               const rate = rates[selectedToken]?.[selected as CurrencySymbol];
               if (rate && rate > 0) {
                  rateText = `1 ${selected} ≈ ${(1 / rate).toFixed(8)} ${selectedToken}`;
               }
            } else if (swapMode === "currencyToToken" && !isInput && selected) {
               const rate = rates[selected as CurrencySymbol]?.[selectedToken];
               if (rate && rate > 0) {
                  rateText = `1 ${selected} ≈ ${(1 / rate).toFixed(8)} ${selectedCurrency}`;
               }
            }

            setExchangeRateText(rateText);
         } catch (error) {
            console.error("Failed to get exchange rate:", error);
            setRateError("Rate unavailable");
            setExchangeRateText(null);
         } finally {
            setIsRateLoading(false);
         }
      };

      updateRateText();
   }, [selectedToken, selectedCurrency, swapMode, isInput, selected]);

   // Update USD value when amount changes
   useEffect(() => {
      const updateUsdValue = async () => {
         if (!selected || (!sendAmount && !receiveAmount)) {
            setUsdValue("0.00");
            return;
         }

         try {
            // If we have a quote from the API, use it
            if (sectionInfo.isToken && quoteInUSD !== null && !isQuoteLoading) {
               setUsdValue(
                  quoteInUSD.toLocaleString("en-US", {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                  })
               );
               return;
            }

            // Otherwise calculate from exchange rates
            const amount = isInput ? sendAmount : receiveAmount;
            if (!amount || parseFloat(amount) === 0) {
               setUsdValue("0.00");
               return;
            }

            const usdAmount = await calculateWithExchangeRate(
               amount,
               selected,
               "USD"
            ).catch(() => 0);

            setUsdValue(
               usdAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
               })
            );
         } catch (error) {
            console.error("Failed to calculate USD value:", error);
            setUsdValue("--");
         }
      };

      updateUsdValue();
   }, [
      sendAmount,
      receiveAmount,
      selected,
      sectionInfo.isToken,
      isInput,
      quoteInUSD,
      isQuoteLoading,
   ]);

   // Format the balance to avoid overflow
   const balanceValue =
      authenticated && sectionInfo.isToken && selected
         ? formatBalance(getTokenBalance(selected as TokenSymbol), 8)
         : null;

   // Check if the balance is insufficient
   const isInsufficientBalance =
      isInput &&
      sectionInfo.isToken &&
      authenticated &&
      selected &&
      sendAmount &&
      parseFloat(sendAmount) >
         parseFloat(balanceValue?.replace(/,/g, "") || "0") &&
      !isBalanceLoading;

   return (
      <div className="bg-[#fafafa] rounded-2xl p-4 shadow-md">
         {/* Title and Balance Row */}
         <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 text-sm font-medium">
               {sectionTitle}
            </span>
            {sectionInfo.isToken && (
               <span className="text-xs text-gray-400">
                  {!authenticated ? (
                     <FaWallet className="text-purple-500 text-sm" />
                  ) : !selected ? (
                     "Select token to view balance"
                  ) : isBalanceLoading ? (
                     "Loading balance..."
                  ) : (
                     `Balance: ${balanceValue}`
                  )}
               </span>
            )}
         </div>

         {/* Amount Input/Display */}
         <div className="mb-3">
            {isInput ? (
               <input
                  type="text"
                  value={sendAmount}
                  onChange={onAmountChange}
                  className="w-full text-4xl font-light text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400"
                  placeholder="0"
               />
            ) : (
               <div className="text-4xl font-light text-gray-900">
                  {receiveAmount || "0"}
               </div>
            )}
         </div>

         {/* Token/Currency Selector */}
         <div className="flex items-center justify-between">
            {/* USD Value or Exchange Rate Info */}
            <div className="text-xs text-gray-400">
               {(sendAmount || receiveAmount) && selectedToken && selectedCurrency && (
                  <span>
                     {isInput
                        ? isQuoteLoading || isRateLoading
                           ? "Loading price..."
                           : quoteError || rateError
                           ? "Price unavailable"
                           : `$${usdValue}`
                        : isRateLoading
                        ? "Loading rate..."
                        : rateError
                        ? "Rate unavailable"
                        : exchangeRateText}
                  </span>
               )}
            </div>

            {/* Select Button */}
            <button
               onClick={sectionInfo.selectAction}
               className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all ${
                  selected
                     ? "bg-gray-100 hover:bg-gray-200"
                     : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
               }`}>
               {selected ? (
                  <>
                     <img
                        src={imageUrl}
                        alt={selected}
                        className="w-6 h-6 rounded-full"
                     />
                     <span className="font-medium text-gray-900">
                        {selected}
                     </span>
                     <ChevronDown size={16} className="text-gray-600" />
                  </>
               ) : (
                  <>
                     <span className="font-medium">{selectLabel}</span>
                     <ChevronDown size={16} />
                  </>
               )}
            </button>
         </div>

         {/* Warning for insufficient balance */}
         {isInsufficientBalance && (
            <div className="mt-2 text-xs text-red-500 font-medium">
               Insufficient balance
            </div>
         )}
      </div>
   );
};

export default SwapSection;