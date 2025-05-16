// constants/swapConstants.ts
import { Token, Currency, ExchangeRates } from "../types/SwapTypes";
import { supportedTokens } from "./tokens";

// Create token objects using the supportedTokens data
export const tokens: Token[] = [
   {
      symbol: "ETH",
      name: "Ethereum",
      balance: "0", // Placeholder, will be replaced with real balance
      icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/eth.svg",
      address: "ETH", // Special indicator for native token
      decimals: 18,
   },
   {
      symbol: "USDC",
      name: supportedTokens.USDC.name,
      balance: "0", // Placeholder, will be replaced with real balance
      icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/usdc.svg",
      address: supportedTokens.USDC.address,
      decimals: supportedTokens.USDC.decimals,
   },
   {
      symbol: "USDT",
      name: supportedTokens.USDT.name,
      balance: "0", // Placeholder, will be replaced with real balance
      icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/usdt.svg",
      address: supportedTokens.USDT.address,
      decimals: supportedTokens.USDT.decimals,
   },
   {
      symbol: "WETH",
      name: supportedTokens.WETH.name,
      balance: "0", // Placeholder, will be replaced with real balance
      icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/eth.svg",
      address: supportedTokens.WETH.address,
      decimals: supportedTokens.WETH.decimals,
   },
   {
      symbol: "ZORA",
      name: supportedTokens.ZORA.name,
      balance: "0",
      icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/generic.svg", // Using generic icon
      address: supportedTokens.ZORA.address,
      decimals: supportedTokens.ZORA.decimals,
   },
   {
      symbol: "DEGEN",
      name: supportedTokens.DEGEN.name,
      balance: "0",
      icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/generic.svg", // Using generic icon
      address: supportedTokens.DEGEN.address,
      decimals: supportedTokens.DEGEN.decimals,
   },
];

// Keep currencies as they are
export const currencies: Currency[] = [
   {
      symbol: "NGN",
      name: "Naira",
      flag: "https://flagcdn.com/w40/ng.png",
   },
   {
      symbol: "KES",
      name: "Pounds",
      flag: "https://flagcdn.com/w40/gb.png",
   },
   {
      symbol: "GHS",
      name: "Cedis",
      flag: "https://flagcdn.com/w40/gh.png",
   },
   {
      symbol: "USD",
      name: "Dollar",
      flag: "https://flagcdn.com/w40/us.png",
   },
];

// Update exchange rates for all tokens
export const exchangeRates: ExchangeRates = {
   // Token to Currency rates
   ETH: { NGN: 7500000, GBP: 3500, GHS: 68000, USD: 4500 },
   USDC: { NGN: 1595, GBP: 0.78, GHS: 14.5, USD: 1 },
   USDT: { NGN: 1595, GBP: 0.78, GHS: 14.5, USD: 1 },
   WETH: { NGN: 7500000, GBP: 3500, GHS: 68000, USD: 4500 },
   ZORA: { NGN: 15000, GBP: 7, GHS: 135, USD: 9 },
   DEGEN: { NGN: 800, GBP: 0.4, GHS: 7, USD: 0.5 },

   // Currency to Token rates
   NGN: {
      ETH: 0.00000013,
      USDC: 0.00063,
      USDT: 0.00063,
      WETH: 0.00000013,
      ZORA: 0.000067,
      DEGEN: 0.00125,
   },
   GBP: {
      ETH: 0.00029,
      USDC: 1.28,
      USDT: 1.28,
      WETH: 0.00029,
      ZORA: 0.143,
      DEGEN: 2.5,
   },
   GHS: {
      ETH: 0.000015,
      USDC: 0.069,
      USDT: 0.069,
      WETH: 0.000015,
      ZORA: 0.0074,
      DEGEN: 0.143,
   },
   USD: {
      ETH: 0.00022,
      USDC: 1,
      USDT: 1,
      WETH: 0.00022,
      ZORA: 0.111,
      DEGEN: 2.0,
   },
};
