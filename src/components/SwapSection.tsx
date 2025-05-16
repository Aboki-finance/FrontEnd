// components/SwapSection.tsx
import React, { useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
   SectionInfo,
   TokenSymbol,
   CurrencySymbol,
   SwapMode,
} from "../types/SwapTypes";
import { FaWallet } from "react-icons/fa";
import { getImageUrl } from "../utils/swapUtils";
import { exchangeRates } from "../constants/swapConstants"; // Still needed for non-USD/NGN conversions
import {
   useTokenQuote,
   formatBalance,
} from "../contracts/hooks/useQuoteContract";
import {
   useCurrencyConversion,
   ConversionCurrency,
} from "../hooks/useCurrencyConversion"; // Import our new hook

interface SwapSectionProps {
   sectionInfo: SectionInfo;
   isInput: boolean;
   sendAmount: string;
   receiveAmount: string;
   onAmountChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
   onReceiveAmountUpdate?: (amount: string) => void; // New prop for updating receive amount
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
   onReceiveAmountUpdate,
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

   // Only fetch quote if this is a token section and we have an amount
   const shouldFetchQuote =
      sectionInfo.isToken && (isInput ? !!sendAmount : !!receiveAmount);

   // Use our token quote hook to get real-time USD value
   const { quoteInUSD, isLoading: isQuoteLoading } = useTokenQuote(
      isInput ? sendAmount : receiveAmount,
      shouldFetchQuote ? (selected as string) : null
   );

   // Determine if we need currency conversion
   // Determine if we need currency conversion
   const shouldConvert =
      selectedCurrency === "NGN" &&
      // Case 1: Token to NGN conversion (in receive section)
      ((swapMode === "tokenToCurrency" && !isInput) ||
         // Case 2: NGN to Token conversion (in send section)
         (swapMode === "currencyToToken" && isInput && !!sendAmount));

   const useAmount =
      swapMode === "tokenToCurrency"
         ? quoteInUSD || parseFloat(sendAmount) || 1 // Use send amount as fallback
         : sendAmount || "1"; // Always have a minimum amount

   // Use our currency conversion hook when needed
   const {
      convertedAmount,
      formattedAmount,
      loading: isConversionLoading,
      error: conversionError,
      rate,
   } = useCurrencyConversion(
      useAmount,
      swapMode === "tokenToCurrency" ? "USD" : "NGN",
      swapMode === "tokenToCurrency" ? "NGN" : "USD",
      true // Force enable for testing
   );

   // Add this debugging after the hook call
   console.log("Currency conversion call:", {
      inputAmount: useAmount,
      fromCurrency: swapMode === "tokenToCurrency" ? "USD" : "NGN",
      toCurrency: swapMode === "tokenToCurrency" ? "NGN" : "USD",
      result: {
         convertedAmount,
         formattedAmount,
         loading: isConversionLoading,
      },
   });
   // Debug logging
   useEffect(() => {
      if (shouldConvert) {
         console.log("Currency conversion result:", {
            convertedAmount,
            formattedAmount,
            rate,
            isLoading: isConversionLoading,
         });
      }
   }, [
      convertedAmount,
      formattedAmount,
      rate,
      isConversionLoading,
      shouldConvert,
   ]);
   // In SwapSection.tsx - Add this after the useCurrencyConversion hook
   useEffect(() => {
      console.log("Conversion Debug:", {
         shouldConvert,
         isConversionLoading,
         convertedAmount,
         formattedAmount,
         swapMode,
         isInput,
         quoteInUSD,
         sendAmount,
      });
   }, [shouldConvert, isConversionLoading, convertedAmount, formattedAmount]);
   // Update receive amount when conversion happens
   useEffect(() => {
      if (
         shouldConvert &&
         !isConversionLoading &&
         parseFloat(convertedAmount) > 0
      ) {
         // If this is the receive section in token->currency mode
         if (
            !isInput &&
            swapMode === "tokenToCurrency" &&
            onReceiveAmountUpdate
         ) {
            onReceiveAmountUpdate(convertedAmount);
         }

         // If this is the USD value in currency->token mode, we can use it for USD display
         // The actual token amount calculation is handled elsewhere
      }
   }, [
      convertedAmount,
      isConversionLoading,
      shouldConvert,
      isInput,
      swapMode,
      onReceiveAmountUpdate,
   ]);

   const getExchangeRateText = () => {
      // If we have a direct rate from the API, use it
      if (shouldConvert && rate !== null) {
         if (swapMode === "tokenToCurrency" && !isInput) {
            return `1 USD ≈ ${rate.toLocaleString()} NGN`;
         } else if (swapMode === "currencyToToken" && isInput) {
            return `1 NGN ≈ ${(1 / rate).toFixed(8)} USD`;
         }
      }

      // Fallback to previous implementation for other currencies
      if (!selectedToken || !selectedCurrency) return null;

      if (swapMode === "tokenToCurrency" && isInput && selected) {
         return `1 ${selected} ≈ ${
            exchangeRates[selected as TokenSymbol]?.[
               selectedCurrency
            ]?.toLocaleString() || "0"
         } ${selectedCurrency}`;
      } else if (swapMode === "currencyToToken" && isInput && selected) {
         return `1 ${selected} ≈ ${
            exchangeRates[selected as CurrencySymbol]?.[
               selectedToken
            ]?.toLocaleString() || "0"
         } ${selectedToken}`;
      } else if (swapMode === "tokenToCurrency" && !isInput && selected) {
         return `1 ${selected} ≈ ${(
            1 /
            (exchangeRates[selectedToken]?.[selected as CurrencySymbol] || 1)
         ).toFixed(8)} ${selectedToken}`;
      } else if (swapMode === "currencyToToken" && !isInput && selected) {
         return `1 ${selected} ≈ ${(
            1 /
            (exchangeRates[selected as CurrencySymbol]?.[selectedToken] || 1)
         ).toFixed(8)} ${selectedCurrency}`;
      }
      return null;
   };

   const calculateUSDValue = (
      amount: string,
      symbol: string | null,
      isToken: boolean
   ): string => {
      // If we have a real-time quote from the smart contract, use it
      if (isToken && quoteInUSD && !isQuoteLoading) {
         return quoteInUSD.toLocaleString("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
         });
      }

      // If this is NGN in a currency->token swap, use our conversion
      if (
         !isToken &&
         symbol === "NGN" &&
         swapMode === "currencyToToken" &&
         !isConversionLoading
      ) {
         // Return converted USD amount
         return formattedAmount;
      }

      // Fallback to previous calculation method
      if (!amount || !symbol || parseFloat(amount) === 0) return "0.00";

      const numericAmount = parseFloat(amount);

      if (isToken) {
         // For tokens, get the USD rate directly
         const usdRate = exchangeRates[symbol]?.USD || 0;
         return (numericAmount * usdRate).toLocaleString("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
         });
      } else {
         // For currencies, convert to USD
         if (symbol === "USD") return numericAmount.toFixed(2);

         // Convert currency to USD using token as intermediate
         // We'll use USDC as the intermediate since it's pegged to USD
         const currencyToUSDC = exchangeRates[symbol]?.USDC || 0;
         return (numericAmount * currencyToUSDC).toLocaleString("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
         });
      }
   };

   // Determine what value to display in receive section
   const displayAmount = () => {
      if (!isInput) {
         // If this is NGN in a token->currency swap, show conversion result
         if (
            selectedCurrency === "NGN" &&
            swapMode === "tokenToCurrency" &&
            shouldConvert
         ) {
            if (isConversionLoading) {
               return (
                  <div className="flex items-center gap-2">
                     <div className="animate-pulse bg-gray-200 h-9 w-32 rounded"></div>
                  </div>
               );
            }
            // Show formatted amount with commas
            return formattedAmount;
         }
         // Default to regular receive amount
         return receiveAmount || "0";
      }
      return null; // Not needed for input section
   };

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
   console.log("Key variables check:", {
      selectedCurrency,
      swapMode,
      isInput,
      quoteInUSD,
   });
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
                  {displayAmount()}
               </div>
            )}
         </div>

         {/* Token/Currency Selector */}
         <div className="flex items-center justify-between">
            {/* USD Value or Exchange Rate Info */}
            <div className="text-xs text-gray-400">
               {sendAmount && selectedToken && selectedCurrency && (
                  <span>
                     {isInput
                        ? isQuoteLoading || isConversionLoading
                           ? "Loading price..."
                           : `$${calculateUSDValue(
                                sendAmount,
                                selected,
                                sectionInfo.isToken
                             )}`
                        : getExchangeRateText()}
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
