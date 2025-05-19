// src/contracts/hooks/useTransactionTracker.ts
import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { logger } from '../../utils/swapUtils';

interface UseTransactionTrackerParams {
  hash: string | null;
  onSuccess?: (receipt: any) => void;
  onError?: (error: Error) => void;
}

interface UseTransactionTrackerResult {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  status: 'idle' | 'pending' | 'success' | 'error';
  receipt: any;
  error: Error | null;
  confirmations: number;
  blockNumber: number | null;
  transactionHash: string | null;
  reset: () => void;
}

/**
 * Hook to track transaction status and confirmations
 */
export function useTransactionTracker({
  hash,
  onSuccess,
  onError
}: UseTransactionTrackerParams): UseTransactionTrackerResult {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [confirmations, setConfirmations] = useState<number>(0);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  
  const publicClient = usePublicClient();
  
  // Use Wagmi's hook to wait for transaction receipt
  const { 
    isLoading: isPending,
    isSuccess,
    isError,
    data: receipt,
    error,
  } = hash
    ? useWaitForTransactionReceipt({
        hash: hash as `0x${string}`,
      })
    : { isLoading: false, isSuccess: false, isError: false, data: null, error: null };
  
  // Reset state
  const reset = () => {
    setStatus('idle');
    setConfirmations(0);
    setBlockNumber(null);
  };
  
  // Update status based on transaction state
  useEffect(() => {
    if (!hash) {
      setStatus('idle');
      return;
    }
    
    if (isPending) {
      setStatus('pending');
    } else if (isSuccess) {
      setStatus('success');
    } else if (isError) {
      setStatus('error');
    }
  }, [hash, isPending, isSuccess, isError]);
  
  // Monitor block confirmations
  useEffect(() => {
    if (!hash || !receipt || !isSuccess) return;
    
    const txBlockNumber = receipt.blockNumber;
    setBlockNumber(Number(txBlockNumber));
    
    const checkConfirmations = async () => {
      try {
        // Get current block number
        if (!publicClient) return;
        const currentBlockNumber = await publicClient.getBlockNumber();
        
        // Calculate confirmations
        const currentConfirmations = Number(currentBlockNumber) - Number(txBlockNumber);
        setConfirmations(currentConfirmations);
        
        logger.log('TRANSACTION', `Transaction has ${currentConfirmations} confirmations`, {
          hash,
          txBlockNumber: Number(txBlockNumber),
          currentBlockNumber: Number(currentBlockNumber)
        });
      } catch (error) {
        logger.log('ERROR', 'Failed to check transaction confirmations', error);
      }
    };
    
    // Check immediately
    checkConfirmations();
    
    // Then set up interval to check periodically
    const interval = setInterval(checkConfirmations, 12000); // Check every 12 seconds
    
    return () => clearInterval(interval);
  }, [hash, receipt, isSuccess, publicClient]);
  
  // Call onSuccess callback when transaction succeeds
  useEffect(() => {
    if (isSuccess && receipt && onSuccess) {
      onSuccess(receipt);
    }
  }, [isSuccess, receipt, onSuccess]);
  
  // Call onError callback when transaction fails
  useEffect(() => {
    if (isError && error && onError) {
      onError(error);
    }
  }, [isError, error, onError]);
  
  return {
    isPending,
    isSuccess,
    isError,
    status,
    receipt,
    error,
    confirmations,
    blockNumber,
    transactionHash: hash,
    reset
  };
}