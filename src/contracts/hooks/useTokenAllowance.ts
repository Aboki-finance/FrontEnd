// src/contracts/hooks/useTokenAllowance.ts
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';
import { logger } from '../../utils/swapUtils';
import { supportedTokens } from '../../constants/tokens';

interface UseTokenAllowanceParams {
  tokenSymbol: string | null;
  spenderAddress: string;
  requiredAmount?: string;
}

interface UseTokenAllowanceResult {
  isApproved: boolean;
  isLoading: boolean;
  isApproving: boolean;
  isSuccess: boolean;
  approve: () => Promise<string | null>;
  error: string | null;
  txHash: string | null;
}

/**
 * Hook to check and manage token allowances for spending
 */
export function useTokenAllowance({
  tokenSymbol,
  spenderAddress,
  requiredAmount = '0'
}: UseTokenAllowanceParams): UseTokenAllowanceResult {
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const { address: walletAddress } = useAccount();
  const { writeContractAsync: approveToken } = useWriteContract();
  
  // Wait for approval transaction to complete
  const { isLoading: isApproving, isSuccess } = txHash
    ? useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      })
    : { isLoading: false, isSuccess: false };
  
  // Skip allowance check for ETH or if no token selected
  const shouldCheckAllowance = !!tokenSymbol && 
                              tokenSymbol !== 'ETH' && 
                              !!walletAddress && 
                              !!spenderAddress;
  
  // Get token config
  const tokenConfig = tokenSymbol ? 
    supportedTokens[tokenSymbol as keyof typeof supportedTokens] : 
    null;
  
  // Parse required amount with proper decimals
  const requiredAmountBigInt = tokenConfig && requiredAmount ? 
    parseUnits(requiredAmount, tokenConfig.decimals) : 
    0n;
  
  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = shouldCheckAllowance
    ? useReadContract({
        address: tokenConfig?.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: walletAddress && spenderAddress ? 
          [walletAddress as `0x${string}`, spenderAddress as `0x${string}`] : 
          undefined,
      })
    : { data: undefined, refetch: () => Promise.resolve() };
  
  // Update approval status when allowance changes
  useEffect(() => {
    if (tokenSymbol === 'ETH') {
      // ETH doesn't need approval
      setIsApproved(true);
      return;
    }
    
    if (allowance !== undefined) {
      const isAllowed = (allowance as bigint) >= requiredAmountBigInt;
      setIsApproved(isAllowed);
      
      logger.log('ALLOWANCE', `Token ${tokenSymbol} allowance check:`, {
        allowance: allowance.toString(),
        required: requiredAmountBigInt.toString(),
        isApproved: isAllowed
      });
    }
  }, [allowance, tokenSymbol, requiredAmountBigInt]);
  
  // Effect to refetch allowance when transaction succeeds
  useEffect(() => {
    if (isSuccess && txHash) {
      logger.log('ALLOWANCE', `Approval transaction confirmed: ${txHash}`);
      refetchAllowance();
    }
  }, [isSuccess, txHash, refetchAllowance]);
  
  // Function to approve token spending
  const approve = async (): Promise<string | null> => {
    try {
      if (!tokenSymbol || !walletAddress || !spenderAddress) {
        throw new Error('Missing required parameters for approval');
      }
      
      // ETH doesn't need approval
      if (tokenSymbol === 'ETH') {
        return null;
      }
      
      if (!tokenConfig) {
        throw new Error(`Token ${tokenSymbol} not supported`);
      }
      
      setIsLoading(true);
      setError(null);
      
      logger.log('ALLOWANCE', `Approving ${tokenSymbol} for contract usage`);
      
      // Using a very large number for approval (infinite approval)
      // In production, you may want to approve exactly the required amount
      const approvalAmount = parseUnits("1000000000", tokenConfig.decimals);
      
      const hash = await approveToken({
        address: tokenConfig.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, approvalAmount]
      });
      
      logger.log('ALLOWANCE', `Approval transaction sent: ${hash}`);
      setTxHash(hash);
      
      return hash;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.log('ERROR', `Approval failed: ${errorMsg}`, error);
      setError(`Approval failed: ${errorMsg}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isApproved,
    isLoading,
    isApproving,
    isSuccess,
    approve,
    error,
    txHash
  };
}