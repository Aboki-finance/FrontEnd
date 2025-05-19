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
      name: "Shilling",
      flag: "https://flagcdn.com/w40/ke.png",
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

// Export a function that returns exchange rates - this forces components to wait
// for API data rather than providing fallbacks
export let exchangeRates: ExchangeRates | null = null;

// Cache for rate updates
let lastRateUpdate = 0;
const RATE_UPDATE_INTERVAL = 60000; // 1 minute
let updatePromise: Promise<ExchangeRates> | null = null;

/**
 * Fetch and update exchange rates from API
 * @returns Promise that resolves with exchange rates
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
   // If we already have a running update, return that promise
   if (updatePromise) {
      return updatePromise;
   }
   
   // Check if rates are fresh enough
   const now = Date.now();
   if (exchangeRates && (now - lastRateUpdate < RATE_UPDATE_INTERVAL)) {
      return exchangeRates;
   }
   
   // Create new update promise
   updatePromise = (async (): Promise<ExchangeRates> => {
      try {
         // Fetch rates from API
         const response = await fetch('https://aboki-api.onrender.com/api/conversion/rates');
         
         if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
         }
         
         const data = await response.json();
         
         if (!data.success) {
            throw new Error(data.message || 'Failed to fetch rates');
         }
         
         // Process rates data
         const newRates: ExchangeRates = {
            // Initialize token rates
            ETH: { NGN: 0, KES: 0, GHS: 0, USD: 0 },
            USDC: { NGN: 0, KES: 0, GHS: 0, USD: 0 },
            USDT: { NGN: 0, KES: 0, GHS: 0, USD: 0 },
            WETH: { NGN: 0, KES: 0, GHS: 0, USD: 0 },
            ZORA: { NGN: 0, KES: 0, GHS: 0, USD: 0 },
            DEGEN: { NGN: 0, KES: 0, GHS: 0, USD: 0 },
            
            // Initialize currency rates
            NGN: { ETH: 0, USDC: 0, USDT: 0, WETH: 0, ZORA: 0, DEGEN: 0 },
            KES: { ETH: 0, USDC: 0, USDT: 0, WETH: 0, ZORA: 0, DEGEN: 0 },
            GHS: { ETH: 0, USDC: 0, USDT: 0, WETH: 0, ZORA: 0, DEGEN: 0 },
            USD: { ETH: 0, USDC: 0, USDT: 0, WETH: 0, ZORA: 0, DEGEN: 0 },
         };
         
         // Extract rates from API data
         const apiRates = data.rates;
         
         // Process each token's rates - using only ngnBuyPrice and ngnSellPrice
         const processTokenRates = (symbol: string, data: any) => {
            if (!data) return;
            
            // Get direct values from API
            const usdPrice = data.usdPrice || 0;
            const ngnBuyPrice = data.ngnBuyPrice || 0;
            const ngnSellPrice = data.ngnSellPrice || 0;
            
            // For other currencies, use exchange rate from API if available
            const kesRate = (data.kesPrice !== undefined) ? data.kesPrice : 0;
            const ghsRate = (data.ghsPrice !== undefined) ? data.ghsPrice : 0;
            
            // Set token to currency rates - for standard rate use SELL price
            newRates[symbol].USD = usdPrice;
            newRates[symbol].NGN = ngnSellPrice; // Default to sell price for display
            newRates[symbol].KES = kesRate;
            newRates[symbol].GHS = ghsRate;
            
            // Set currency to token rates (inverse) - only if rate is non-zero
            if (usdPrice > 0) newRates.USD[symbol] = 1 / usdPrice;
            if (ngnSellPrice > 0) newRates.NGN[symbol] = 1 / ngnSellPrice;
            if (kesRate > 0) newRates.KES[symbol] = 1 / kesRate;
            if (ghsRate > 0) newRates.GHS[symbol] = 1 / ghsRate;
            
            // Store buy/sell rates separately for direct access
            // These will be used in the getExchangeRate function
            (newRates as any)[`${symbol}_BUY`] = ngnBuyPrice;
            (newRates as any)[`${symbol}_SELL`] = ngnSellPrice;
         };
         
         // Process each token - ONLY if it exists in the API response
         if (apiRates.ETH) processTokenRates('ETH', apiRates.ETH);
         if (apiRates.WETH) processTokenRates('WETH', apiRates.WETH);
         if (apiRates.USDC) processTokenRates('USDC', apiRates.USDC);
         if (apiRates.USDT) processTokenRates('USDT', apiRates.USDT);
         if (apiRates.ZORA) processTokenRates('ZORA', apiRates.ZORA);
         if (apiRates.DEGEN) processTokenRates('DEGEN', apiRates.DEGEN);
         
         // Update the exported exchangeRates object
         exchangeRates = newRates;
         
         // Update timestamp
         lastRateUpdate = now;
         
         console.log('Exchange rates updated successfully', {
            timestamp: new Date(now).toISOString(),
            availableTokens: Object.keys(apiRates)
         });
         
         return newRates;
      } catch (error) {
         console.error('Failed to update exchange rates:', error);
         
         // If we've never loaded rates before, throw the error
         if (!exchangeRates) {
            throw error;
         }
         
         // Otherwise return the last known rates
         return exchangeRates;
      } finally {
         // Clear the promise so we can make new requests
         updatePromise = null;
      }
   })();
   
   return updatePromise;
}

/**
 * Get exchange rate between two tokens/currencies
 * @param type 'buy' or 'sell' - Required when one currency is NGN
 * @throws Error if rate not available
 */
export async function getExchangeRate(
   fromToken: string, 
   toToken: string,
   type: 'buy' | 'sell'
): Promise<number> {
   // Get latest rates
   const rates = await getExchangeRates();
   
   // Special case for NGN conversions - ALWAYS use the specific buy/sell rate
   if (fromToken === 'NGN' || toToken === 'NGN') {
      const tokenSymbol = fromToken === 'NGN' ? toToken : fromToken;
      
      // When converting from NGN to token, use buy rate
      // When converting from token to NGN, use sell rate
      const rateType = fromToken === 'NGN' ? 'BUY' : 'SELL';
      
      // Get the appropriate rate
      const specialRate = (rates as any)[`${tokenSymbol}_${rateType}`];
      
      if (!specialRate) {
         throw new Error(`${rateType.toLowerCase()} rate not available for ${tokenSymbol}/NGN`);
      }
      
      // If converting from NGN to token, we need the inverse rate
      return fromToken === 'NGN' ? 1 / specialRate : specialRate;
   }
   
   // For other currency pairs, use the standard rate logic
   if (!(fromToken in rates) || !(toToken in rates[fromToken])) {
      throw new Error(`Exchange rate not available for ${fromToken}/${toToken}`);
   }
   
   const rate = rates[fromToken][toToken];
   
   if (rate === 0) {
      throw new Error(`Exchange rate not available for ${fromToken}/${toToken}`);
   }
   
   return rate;
}

/**
 * Calculate amount based on exchange rate
 * @param type 'buy' or 'sell' - Required when one currency is NGN
 * @throws Error if rate not available
 */
export async function calculateWithExchangeRate(
   amount: string | number,
   fromToken: string,
   toToken: string,
   type: 'buy' | 'sell'
): Promise<number> {
   const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
   
   if (isNaN(numericAmount) || numericAmount <= 0) {
      return 0;
   }
   
   const rate = await getExchangeRate(fromToken, toToken, type);
   return numericAmount * rate;
}