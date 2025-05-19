// src/contracts/hooks/useQuoteContract.ts
import { useState, useEffect } from 'react';
import { logger } from '../../utils/swapUtils';

// Cache to store recent quotes (simple in-memory cache)
const ratesCache: {
  data: Record<string, any> | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_EXPIRY = 60000; // 1 minute cache

/**
 * Hook to get current token price quote in USD and NGN
 * @param amount - Amount of token as string 
 * @param tokenSymbol - Token symbol or null
 * @returns Quote information and loading state
 */
export function useTokenQuote(
  amount: string,
  tokenSymbol: string | null
): { 
  quoteInUSD: number | null; 
  quoteInNGN: number | null;
  isLoading: boolean;
  error: string | null;
  source: 'api' | 'cache' | 'loading' | 'error';
} {
  const [quoteResult, setQuoteResult] = useState({
    quoteInUSD: null as number | null,
    quoteInNGN: null as number | null,
    isLoading: false,
    error: null as string | null,
    source: 'loading' as 'api' | 'cache' | 'loading' | 'error'
  });
  
  // Skip if no amount or token
  const shouldFetch = Boolean(
    amount && 
    parseFloat(amount) > 0 && 
    tokenSymbol
  );
  
  // Fetch rates from API
  useEffect(() => {
    if (!shouldFetch) {
      setQuoteResult(prev => ({
        ...prev,
        quoteInUSD: null,
        quoteInNGN: null,
        isLoading: false,
        error: null,
        source: 'loading'
      }));
      return;
    }
    
    const fetchRates = async () => {
      try {
        setQuoteResult(prev => ({ ...prev, isLoading: true }));
        
        // Check if cache is valid
        const isCacheValid = ratesCache.data && 
                            (Date.now() - ratesCache.timestamp < CACHE_EXPIRY);
        
        if (isCacheValid && ratesCache.data) {
          // Use cached rates
          calculateQuote(amount, tokenSymbol, ratesCache.data, 'cache');
          return;
        }
        
        // Fetch new rates
        const response = await fetch('https://aboki-api.onrender.com/api/conversion/rates');
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch rates');
        }
        
        // Update cache
        ratesCache.data = data;
        ratesCache.timestamp = Date.now();
        
        // Calculate and set quote
        calculateQuote(amount, tokenSymbol, data, 'api');
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.log('ERROR', `Failed to fetch rates: ${errorMsg}`, error);
        
        setQuoteResult({
          quoteInUSD: null,
          quoteInNGN: null,
          isLoading: false,
          error: errorMsg,
          source: 'error'
        });
      }
    };
    
    fetchRates();
  }, [amount, tokenSymbol, shouldFetch]);
  
  // Helper function to calculate quote from rates
  const calculateQuote = (
    amount: string, 
    tokenSymbol: string | null, 
    data: any,
    source: 'api' | 'cache'
  ) => {
    try {
      const amountNum = parseFloat(amount);
      
      // Check if token exists in API response
      if (!tokenSymbol || !data.rates[tokenSymbol]) {
        setQuoteResult({
          quoteInUSD: null,
          quoteInNGN: null,
          isLoading: false,
          error: `${tokenSymbol} not found in API rates. Exchange rates unavailable.`,
          source: 'error'
        });
        
        logger.log('ERROR', `Token ${tokenSymbol} not found in API rates`, {
          availableTokens: Object.keys(data.rates)
        });
        return;
      }
      
      // Get data for the token - Using only fields directly from the API
      const tokenData = data.rates[tokenSymbol];
      const usdPrice = tokenData.usdPrice;
      
      // Use ngnSellPrice ONLY for display/quoting 
      const ngnPrice = tokenData.ngnSellPrice;
      
      if (!usdPrice || !ngnPrice) {
        setQuoteResult({
          quoteInUSD: null,
          quoteInNGN: null,
          isLoading: false,
          error: `${tokenSymbol} rates incomplete in API response`,
          source: 'error'
        });
        return;
      }
      
      // Calculate quotes
      const usdQuote = amountNum * usdPrice;
      const ngnQuote = amountNum * ngnPrice;
      
      setQuoteResult({
        quoteInUSD: usdQuote,
        quoteInNGN: ngnQuote,
        isLoading: false,
        error: null,
        source
      });
      
      logger.log('QUOTE', `${source} quote for ${tokenSymbol}: $${usdQuote.toFixed(2)}, ₦${ngnQuote.toFixed(2)}`, {
        amount: amountNum,
        usdPrice,
        ngnPrice,
        usdQuote,
        ngnQuote
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.log('ERROR', `Failed to calculate quote: ${errorMsg}`, error);
      
      setQuoteResult({
        quoteInUSD: null,
        quoteInNGN: null,
        isLoading: false,
        error: errorMsg,
        source: 'error'
      });
    }
  };
  
  return quoteResult;
}

// Format balance for display
export function formatBalance(
  balanceStr: string, 
  maxDecimals: number = 4
): string {
  const balance = parseFloat(balanceStr || '0');
  if (isNaN(balance)) return "0.00";
  
  if (balance < 0.0001) {
    return "< 0.0001";
  }
  
  return balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals
  });
}