// src/utils/tokenUtils.ts
import { parseUnits, formatUnits } from "viem";
import { supportedTokens } from "../constants/tokens";

/**
 * Convert a token amount to its smallest unit (wei, satoshi, etc)
 * @param amount The amount to convert
 * @param tokenSymbol The token symbol to get decimals for
 * @returns The amount in the token's smallest unit as a BigInt
 */
export const toTokenUnits = (amount: string | number, tokenSymbol: string): bigint => {
  // Handle ETH specially
  if (tokenSymbol === "ETH") {
    return parseUnits(amount.toString(), 18);
  }
  
  // Get token config
  const tokenConfig = supportedTokens[tokenSymbol as keyof typeof supportedTokens];
  if (!tokenConfig) {
    throw new Error(`Token ${tokenSymbol} not supported`);
  }
  
  return parseUnits(amount.toString(), tokenConfig.decimals);
};

/**
 * Convert token units to a human-readable format
 * @param amount The amount in the token's smallest unit
 * @param tokenSymbol The token symbol to get decimals for
 * @returns The formatted amount as a string
 */
export const fromTokenUnits = (amount: bigint, tokenSymbol: string): string => {
  // Handle ETH specially
  if (tokenSymbol === "ETH") {
    return formatUnits(amount, 18);
  }
  
  // Get token config
  const tokenConfig = supportedTokens[tokenSymbol as keyof typeof supportedTokens];
  if (!tokenConfig) {
    throw new Error(`Token ${tokenSymbol} not supported`);
  }
  
  return formatUnits(amount, tokenConfig.decimals);
};

/**
 * Get the address for a token
 * @param tokenSymbol The token symbol
 * @returns The token address
 */
export const getTokenAddress = (tokenSymbol: string): string => {
  // Special case for ETH
  if (tokenSymbol === "ETH") {
    return "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // ETH placeholder address
  }
  
  // Get token config
  const tokenConfig = supportedTokens[tokenSymbol as keyof typeof supportedTokens];
  if (!tokenConfig) {
    throw new Error(`Token ${tokenSymbol} not supported`);
  }
  
  return tokenConfig.address;
};

/**
 * Get token information by symbol
 * @param tokenSymbol The token symbol
 * @returns Full token info
 */
export const getTokenInfo = (tokenSymbol: string) => {
  // Special case for ETH
  if (tokenSymbol === "ETH") {
    return {
      name: "Ethereum",
      symbol: "ETH",
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      decimals: 18,
    };
  }
  
  // Get token config
  const tokenConfig = supportedTokens[tokenSymbol as keyof typeof supportedTokens];
  if (!tokenConfig) {
    throw new Error(`Token ${tokenSymbol} not supported`);
  }
  
  return tokenConfig;
};

/**
 * Format a token amount for display
 * @param amount The amount to format
 * @param tokenSymbol The token symbol (for appropriate decimal display)
 * @returns Formatted amount string
 */
export const formatTokenAmount = (amount: string | number, tokenSymbol: string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0.00';
  }
  
  // Get appropriate decimal places based on token
  let decimalPlaces = 2;
  
  if (tokenSymbol === 'ETH' || tokenSymbol === 'WETH') {
    // ETH often shows 4-6 decimal places
    decimalPlaces = numAmount < 0.01 ? 6 : numAmount < 1 ? 4 : 2;
  } else if (tokenSymbol.includes('USD')) {
    // Stablecoins usually show 2 decimal places
    decimalPlaces = 2;
  } else if (tokenSymbol === 'NGN') {
    // Naira shows 2 decimal places
    decimalPlaces = 2;
  } else {
    // Other tokens default to 4 decimal places for small amounts, 2 for larger
    decimalPlaces = numAmount < 1 ? 4 : 2;
  }
  
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
};

/**
 * Truncate an Ethereum address for display
 * @param address The Ethereum address
 * @returns Truncated address like 0x1234...5678
 */
export const truncateAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};