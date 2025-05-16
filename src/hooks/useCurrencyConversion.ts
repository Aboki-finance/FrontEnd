// hooks/useCurrencyConversion.ts
import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE_URL = "http://170.187.143.46:6000/api/conversion";
const CACHE_DURATION = 60 * 1000; // 1 minute cache
const DEBOUNCE_DELAY = 300; // 300ms debounce

// Type definitions for clarity
export type ConversionCurrency = "USD" | "NGN";

// Cache interface
interface CacheEntry {
   value: number;
   timestamp: number;
}

interface ConversionResult {
   convertedAmount: string;
   formattedAmount: string;
   rate: number | null;
   loading: boolean;
   error: Error | null;
}

// Simple cache implementation with direction awareness
const conversionCache: Record<string, CacheEntry> = {};

export function useCurrencyConversion(
   amount: string | number,
   fromCurrency: ConversionCurrency,
   toCurrency: ConversionCurrency,
   enabled: boolean = true
): ConversionResult {
   const [convertedAmount, setConvertedAmount] = useState<string>("0");
   const [formattedAmount, setFormattedAmount] = useState<string>("0");
   const [loading, setLoading] = useState<boolean>(false);
   const [error, setError] = useState<Error | null>(null);
   const [rate, setRate] = useState<number | null>(null);

   // For debouncing
   const timerRef = useRef<NodeJS.Timeout | null>(null);

   // Skip conversion if amount is empty or zero, or if currencies are the same
   const shouldConvert =
      enabled &&
      !!amount &&
      parseFloat(String(amount)) > 0 &&
      fromCurrency !== toCurrency;

   // Format converted amount for display
   const formatAmount = (value: number): string => {
      return value.toLocaleString("en-US", {
         minimumFractionDigits: 2,
         maximumFractionDigits: 2,
      });
   };

   // Convert between currencies using the API
   const fetchConversion = async (numericAmount: number) => {
      if (!shouldConvert) return;

      setLoading(true);
      setError(null);

      // Create cache key that's aware of conversion direction
      const cacheKey = `${numericAmount}_${fromCurrency}_${toCurrency}`;
      const cachedResult = conversionCache[cacheKey];

      if (
         cachedResult &&
         Date.now() - cachedResult.timestamp < CACHE_DURATION
      ) {
         setConvertedAmount(cachedResult.value.toString());
         setFormattedAmount(formatAmount(cachedResult.value));
         setLoading(false);
         return;
      }

      try {
         // Get the exchange rate from the API
         const response = await axios.get(`${API_BASE_URL}/rate`, {
            params: {
               from: fromCurrency,
               to: toCurrency,
            },
            headers: {
               // Add bearer token if needed for production
               // 'Authorization': `Bearer ${token}`,
            },
         });

         // Extract the conversion rate
         const conversionRate = response.data.rate;
         setRate(conversionRate);

         // Calculate the converted amount
         const result = numericAmount * conversionRate;

         // Update cache
         conversionCache[cacheKey] = {
            value: result,
            timestamp: Date.now(),
         };

         // Set both raw and formatted values
         setConvertedAmount(result.toString());
         setFormattedAmount(formatAmount(result));
      } catch (err) {
         console.error(
            `Error converting ${fromCurrency} to ${toCurrency}:`,
            err
         );
         setError(err as Error);
         setConvertedAmount("0");
         setFormattedAmount("Error");
      } finally {
         setLoading(false);
      }
   };

   // Debounced fetch function
   const debouncedFetch = (amount: number) => {
      // Clear any existing timer
      if (timerRef.current) {
         clearTimeout(timerRef.current);
      }

      // Set a new timer
      timerRef.current = setTimeout(() => {
         fetchConversion(amount);
      }, DEBOUNCE_DELAY);
   };

   // Effect to trigger conversion when inputs change
   useEffect(() => {
      if (!shouldConvert) {
         setConvertedAmount("0");
         setFormattedAmount("0");
         return;
      }

      const numericAmount = parseFloat(String(amount));
      debouncedFetch(numericAmount);

      // Cleanup function
      return () => {
         if (timerRef.current) {
            clearTimeout(timerRef.current);
         }
      };
   }, [amount, fromCurrency, toCurrency, shouldConvert]);

   return {
      convertedAmount,
      formattedAmount,
      rate,
      loading,
      error,
   };
}
