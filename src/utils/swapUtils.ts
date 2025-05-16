import {
   Token,
   Currency,
   TokenSymbol,
   CurrencySymbol,
   SwapMode,
} from "../types/SwapTypes";
import { exchangeRates } from "../constants/swapConstants";

export const getImageUrl = (
   item: Token | Currency | undefined,
   imageKey: "icon" | "flag"
): string => {
   if (!item) return "";
   if (imageKey === "icon" && "icon" in item) {
      return item.icon;
   } else if (imageKey === "flag" && "flag" in item) {
      return item.flag;
   }
   return "";
};

export const getCurrentExchangeRate = (
   swapMode: SwapMode,
   selectedToken: TokenSymbol | null,
   selectedCurrency: CurrencySymbol | null
): number => {
   if (!selectedToken || !selectedCurrency) return 1;
   if (swapMode === "tokenToCurrency") {
      return exchangeRates[selectedToken]?.[selectedCurrency] || 1;
   } else {
      return exchangeRates[selectedCurrency]?.[selectedToken] || 1;
   }
};

export const calculateReceiveAmount = (
   sendAmount: string,
   swapMode: SwapMode,
   selectedToken: TokenSymbol | null,
   selectedCurrency: CurrencySymbol | null
): string => {
   const numericValue = parseFloat(sendAmount) || 0;
   if (numericValue <= 0 || !selectedToken || !selectedCurrency) {
      return "";
   }
   const rate = getCurrentExchangeRate(
      swapMode,
      selectedToken,
      selectedCurrency
   );
   const calculatedValue = numericValue * rate;

   // Updated condition to remove BTC reference
   const decimals =
      swapMode === "currencyToToken" &&
      (selectedToken === "ETH" || selectedToken === "WETH") // Changed to check for ETH and WETH
         ? 8
         : 2;

   return calculatedValue.toFixed(decimals);
};

export const isSwapValid = (
   sendAmount: string,
   receiveAmount: string,
   selectedToken: TokenSymbol | null,
   selectedCurrency: CurrencySymbol | null
): boolean => {
   return !!(
      sendAmount &&
      receiveAmount &&
      selectedToken &&
      selectedCurrency &&
      parseFloat(sendAmount) > 0 &&
      parseFloat(receiveAmount) > 0
   );
};
