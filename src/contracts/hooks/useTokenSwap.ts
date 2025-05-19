// src/contracts/hooks/useTokenSwap.ts
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { gatewayAbi } from '../../contracts/abis/GatewayAbi';
import { erc20Abi } from 'viem';
import { logger } from '../../../src/utils/swapUtils';
import { supportedTokens } from '../../../src/constants/tokens';

// Gateway contract address
const GATEWAY_CONTRACT_ADDRESS = "0xa5c9383c1Be876FB3E3576ce04F938A0a5C4B34e";
const LIQUIDITY_PROVIDER_ADDRESS = "0xBd71E5b859be5DC909F5c964C87FA1ae8E816b4D";

// Define swap types
interface SwapOrderParams {
  tokenSymbol: string;
  tokenAmount: string;
  rate: number;
  targetCurrency: string;
}

interface SwapWithCustomPathParams {
  tokenSymbol: string;
  tokenAmount: string;
  minOutputAmount: string;
  rate: number;
  targetCurrency: string;
  path?: string[]; // Optional custom path
}

export function useTokenSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const { address: walletAddress } = useAccount();
  const { writeContractAsync: approveToken } = useWriteContract();
  const { writeContractAsync: createOrder } = useWriteContract();
  const { writeContractAsync: createOrderWithSwap } = useWriteContract();
  const { writeContractAsync: createOrderWithCustomPath } = useWriteContract();
  
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });
  
  /**
   * Approves token spending for the Gateway contract
   */
  const approveTokenSpending = async (tokenSymbol: string, amountStr: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }
      
      // Get token config
      const tokenConfig = supportedTokens[tokenSymbol as keyof typeof supportedTokens];
      if (!tokenConfig) {
        throw new Error(`Token ${tokenSymbol} not supported`);
      }
      
      // Native ETH doesn't need approval
      if (tokenSymbol === 'ETH') {
        return true;
      }
      
      logger.log('TRANSACTION', `Approving ${tokenSymbol} for contract usage`);
      
      // Parse amount with proper decimals
      const approvalAmount = parseUnits("999999999", tokenConfig.decimals);
      
      const hash = await approveToken({
        address: tokenConfig.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GATEWAY_CONTRACT_ADDRESS as `0x${string}`, approvalAmount]
      });
      
      logger.log('TRANSACTION', `Approval transaction sent: ${hash}`);
      setTxHash(hash);
      
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.log('ERROR', `Approval failed: ${errorMsg}`, error);
      setError(`Approval failed: ${errorMsg}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Creates a basic token swap order
   */
  const createTokenOrder = async (params: SwapOrderParams): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }
      
      // Get token config
      const tokenConfig = supportedTokens[params.tokenSymbol as keyof typeof supportedTokens];
      if (!tokenConfig) {
        throw new Error(`Token ${params.tokenSymbol} not supported`);
      }
      
      logger.log('TRANSACTION', `Creating order for ${params.tokenAmount} ${params.tokenSymbol} to ${params.targetCurrency}`);
      
      // Parse amount with proper decimals
      const tokenAmount = parseUnits(params.tokenAmount, tokenConfig.decimals);
      const rateWithDecimals = parseUnits(params.rate.toString(), 8); // Rate with 8 decimals
      
      // For USDC to NGN, use basic createOrder
      const hash = await createOrder({
        address: GATEWAY_CONTRACT_ADDRESS as `0x${string}`,
        abi: gatewayAbi,
        functionName: 'createOrder',
        args: [
          tokenConfig.address as `0x${string}`,
          tokenAmount,
          rateWithDecimals,
          walletAddress as `0x${string}`,
          LIQUIDITY_PROVIDER_ADDRESS as `0x${string}`
        ]
      });
      
      logger.log('TRANSACTION', `Order creation transaction sent: ${hash}`);
      setTxHash(hash);
      
      return hash;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.log('ERROR', `Order creation failed: ${errorMsg}`, error);
      setError(`Order creation failed: ${errorMsg}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Creates an order with swap (for ETH to USDC to NGN)
   */
  const createOrderWithSwapAndConversion = async (params: SwapOrderParams): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }
      
      logger.log('TRANSACTION', `Creating swap order for ${params.tokenAmount} ETH to ${params.targetCurrency}`);
      
      // For ETH we use a special address
      const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const USDC_CONFIG = supportedTokens.USDC;
      
      // Parse amount with proper decimals
      const tokenAmount = parseUnits(params.tokenAmount, 18); // ETH has 18 decimals
      const minOutputAmount = parseUnits("0", USDC_CONFIG.decimals); // Conservative estimate
      const rateWithDecimals = parseUnits(params.rate.toString(), 8); // Rate with 8 decimals
      
      const hash = await createOrderWithSwap({
        address: GATEWAY_CONTRACT_ADDRESS as `0x${string}`,
        abi: gatewayAbi,
        functionName: 'createOrderWithSwap',
        args: [
          ETH_ADDRESS, // Input token (ETH)
          USDC_CONFIG.address as `0x${string}`, // Target token (USDC)
          tokenAmount,
          minOutputAmount,
          rateWithDecimals,
          walletAddress as `0x${string}`, // Refund address
          LIQUIDITY_PROVIDER_ADDRESS as `0x${string}` // Liquidity provider
        ],
        value: tokenAmount as unknown as undefined // Explicitly cast to match the expected type
      });
      
      logger.log('TRANSACTION', `Swap order creation transaction sent: ${hash}`);
      setTxHash(hash);
      
      return hash;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.log('ERROR', `Swap order creation failed: ${errorMsg}`, error);
      setError(`Swap order creation failed: ${errorMsg}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Creates an order with a custom path (for USDT, ZORA, DEGEN etc.)
   */
  const createOrderWithPath = async (params: SwapWithCustomPathParams): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }
      
      // Get token config
      const tokenConfig = supportedTokens[params.tokenSymbol as keyof typeof supportedTokens];
      if (!tokenConfig) {
        throw new Error(`Token ${params.tokenSymbol} not supported`);
      }
      
      const USDC_CONFIG = supportedTokens.USDC;
      
      logger.log('TRANSACTION', `Creating path order for ${params.tokenAmount} ${params.tokenSymbol} to ${params.targetCurrency} via USDC`);
      
      // Define path - token → USDC by default unless custom path provided
      const path = params.path || [
        tokenConfig.address as `0x${string}`,
        USDC_CONFIG.address as `0x${string}`
      ];
      
      // Parse amount with proper decimals
      const tokenAmount = parseUnits(params.tokenAmount, tokenConfig.decimals);
      const minOutputAmount = parseUnits(params.minOutputAmount || "0", USDC_CONFIG.decimals);
      const rateWithDecimals = parseUnits(params.rate.toString(), 8); // Rate with 8 decimals
      
      const hash = await createOrderWithCustomPath({
        address: GATEWAY_CONTRACT_ADDRESS as `0x${string}`,
        abi: gatewayAbi,
        functionName: 'createOrderWithCustomPath',
        args: [
          path as readonly `0x${string}`[],
          tokenAmount,
          minOutputAmount,
          rateWithDecimals,
          walletAddress as `0x${string}`, // Refund address
          LIQUIDITY_PROVIDER_ADDRESS as `0x${string}` // Liquidity provider
        ]
      });
      
      logger.log('TRANSACTION', `Path order creation transaction sent: ${hash}`);
      setTxHash(hash);
      
      return hash;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.log('ERROR', `Path order creation failed: ${errorMsg}`, error);
      setError(`Path order creation failed: ${errorMsg}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    approveTokenSpending,
    createTokenOrder,
    createOrderWithSwapAndConversion,
    createOrderWithPath,
    isLoading,
    isWaitingForTx,
    isTxSuccess,
    error,
    txHash
  };
}