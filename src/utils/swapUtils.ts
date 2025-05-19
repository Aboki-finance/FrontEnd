// src/utils/swapUtils.ts
import { TokenSymbol, CurrencySymbol, SwapMode } from "../types/SwapTypes";
import { exchangeRates } from "../constants/swapConstants";

// Enhanced logger with timestamp and category
export const logger = {
  log: (category: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${category}] ${message}`;
    
    if (data) {
      console.groupCollapsed(formattedMessage);
      console.log(data);
      console.groupEnd();
    } else {
      console.log(formattedMessage);
    }
  }
};

// Get current exchange rate between token and currency
export const getCurrentExchangeRate = (
  swapMode: SwapMode,
  token: TokenSymbol | null,
  currency: CurrencySymbol | null
): number => {
  if (!token || !currency) return 0;

  if (swapMode === "tokenToCurrency") {
    return exchangeRates?.[token]?.[currency] || 0;
  } else {
    return exchangeRates?.[currency]?.[token] || 0;
  }
};

// Calculate receive amount based on send amount and exchange rate
export const calculateReceiveAmount = (
  amount: string,
  swapMode: SwapMode,
  token: TokenSymbol | null,
  currency: CurrencySymbol | null
): string => {
  if (!amount || !token || !currency) return "";

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount === 0) return "";

  const rate = getCurrentExchangeRate(swapMode, token, currency);
  if (rate === 0) return "";

  return (numericAmount * rate).toFixed(2);
};

// Validate if swap is valid based on inputs and selections
export const isSwapValid = (
  sendAmount: string,
  receiveAmount: string,
  token: TokenSymbol | null,
  currency: CurrencySymbol | null
): boolean => {
  return (
    !!sendAmount &&
    !!receiveAmount &&
    parseFloat(sendAmount) > 0 &&
    parseFloat(receiveAmount) > 0 &&
    !!token &&
    !!currency
  );
};

// Format balance to avoid overflow
export const formatBalance = (balanceStr: string, maxDecimals: number = 4): string => {
  const balance = parseFloat(balanceStr);
  if (isNaN(balance)) return "0.00";
  
  if (balance < 0.0001) {
    return "< 0.0001";
  }
  
  // Format with commas for thousands and limit decimals
  return balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals
  });
};

// Get image URL for token or currency
export const getImageUrl = (
  item: any,
  imageKey: "icon" | "flag"
): string => {
  if (!item) return "https://placehold.co/24x24";
  return item[imageKey] || "https://placehold.co/24x24";
};