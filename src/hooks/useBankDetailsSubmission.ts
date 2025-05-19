// src/hooks/useBankDetailsSubmission.ts
import { useState } from 'react';
import { logger } from '../utils/swapUtils';
import { BankDetails } from '../context/SwapContext';

interface UseBankDetailsSubmissionParams {
  transactionHash: string | null;
  amount: number | null;
  currency: string | null;
}

interface UseBankDetailsSubmissionResult {
  submitBankDetails: (bankDetails: BankDetails) => Promise<boolean>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to submit bank details to the API
 */
export function useBankDetailsSubmission({
  transactionHash,
  amount,
  currency
}: UseBankDetailsSubmissionParams): UseBankDetailsSubmissionResult {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset state
  const reset = () => {
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
  };
  
  // Submit bank details to API
  const submitBankDetails = async (bankDetails: BankDetails): Promise<boolean> => {
    try {
      setIsLoading(true);
      setIsSuccess(false);
      setIsError(false);
      setError(null);
      
      if (!transactionHash) {
        throw new Error('Transaction hash is required');
      }
      
      if (!amount || !currency) {
        throw new Error('Amount and currency are required');
      }
      
      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please connect your wallet.');
      }
      
      logger.log('API', 'Submitting bank details to API', {
        transactionHash,
        amount,
        currency,
        // Don't log full bank details for security
        bankName: bankDetails.bankName,
        accountType: bankDetails.accountType
      });
      
      // Prepare request payload
      const payload = {
        transactionHash,
        bankDetails: {
          accountName: bankDetails.accountName,
          accountNumber: bankDetails.accountNumber,
          bankName: bankDetails.bankName,
          bankCode: bankDetails.routingNumber, // Using routing number as bank code
          swiftCode: bankDetails.swiftCode,
          bankAddress: bankDetails.bankAddress,
          bankCountry: bankDetails.bankCountry,
          accountType: bankDetails.accountType
        },
        amount,
        currency
      };
      
      // Submit to API
      const response = await fetch('https://aboki-api.onrender.com/api/ramp/offramp/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      
      // Parse response
      const data = await response.json();
      
      if (data.success) {
        logger.log('API', 'Bank details submitted successfully', {
          response: data.message,
          orderId: data.orderId
        });
        
        // Store order ID for reference
        if (data.orderId) {
          localStorage.setItem('currentOrderId', data.orderId);
          localStorage.setItem('orderStatus', 'PROCESSING');
        }
        
        setIsSuccess(true);
        return true;
      } else {
        const errorMessage = data.message || 'Failed to submit bank details';
        logger.log('ERROR', `API Error: ${errorMessage}`, data);
        setError(errorMessage);
        setIsError(true);
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.log('EXCEPTION', `Bank details submission error: ${errorMsg}`, error);
      setError(errorMsg);
      setIsError(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    submitBankDetails,
    isLoading,
    isSuccess,
    isError,
    error,
    reset
  };
}