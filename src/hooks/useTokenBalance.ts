// src/hooks/useTokenBalance.ts
import { useEffect } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { formatUnits } from "viem";

interface UseTokenBalanceResult {
   balance: string;
   isLoading: boolean;
   error: Error | null;
}

/**
 * Hook to fetch the balance of a single token (native ETH or ERC20).
 * @param tokenAddress - The ERC20 token contract address, or undefined/"eth" for native ETH
 * @param decimals - Number of decimals to format the returned balance
 */
export function useTokenBalance(
   tokenAddress: string | undefined,
   decimals: number = 18
): UseTokenBalanceResult {
   const { address } = useAccount();
   
   // Determine if we should fetch native ETH or an ERC20 token
   const isNativeToken = !tokenAddress || tokenAddress.toLowerCase() === "eth";
   
   // Fetch native ETH balance (wagmi auto-skips when address is undefined)
   const {
      data: ethData,
      isLoading: ethLoading,
      error: ethError,
   } = useBalance({
      address: isNativeToken && address ? address : undefined,
   });
   
   // Fetch ERC20 token balance (wagmi auto-skips when address or args are undefined)
   const shouldFetchTokenData = Boolean(
      address && !isNativeToken && tokenAddress?.startsWith('0x')
   );

   const {
      data: tokenData,
      isLoading: tokenLoading,
      error: tokenError,
      refetch: refetchToken,
   } = shouldFetchTokenData
      ? useReadContract({
           address: tokenAddress as `0x${string}`,
           abi: erc20Abi,
           functionName: "balanceOf",
           args: [address as `0x${string}`],
        })
      : { data: undefined, isLoading: false, error: null, refetch: () => {} };
   
   // Refetch ERC20 balance on address or tokenAddress change
   useEffect(() => {
      if (address && !isNativeToken && tokenAddress?.startsWith('0x')) {
         refetchToken();
      }
   }, [address, tokenAddress, refetchToken, isNativeToken]);
   
   // Choose formatted result
   const formattedBalance = isNativeToken
      ? ethData?.formatted ?? "0"
      : tokenData
      ? formatUnits(tokenData as bigint, decimals)
      : "0";
   
   return {
      balance: formattedBalance,
      isLoading: isNativeToken ? ethLoading : tokenLoading,
      error: isNativeToken ? ethError : tokenError,
   };
}

/**
 * Hook to fetch multiple token balances at once.
 * @param tokens - Record of symbol => { address, decimals }
 */
export function useTokenBalances(
   tokens: Record<string, { address: string; decimals: number }>
) {
   const { address, isConnected, chainId } = useAccount();
   
   // Create a debug string to log current connection state
   const connectionDebug = `Connected: ${isConnected}, Address: ${address}, Chain ID: ${chainId}`;
   
   // Log connection state for debugging
   useEffect(() => {
      console.log(connectionDebug);
   }, [connectionDebug]);
   
   const balances = Object.entries(tokens).reduce((acc, [symbol, token]) => {
      const { balance, isLoading, error } = useTokenBalance(
         token.address,
         token.decimals
      );
      
      // Log any errors for specific tokens
      useEffect(() => {
         if (error) {
            console.error(`Error fetching balance for ${symbol}:`, error);
         }
      }, [error, symbol]);
      
      acc[symbol] = {
         balance: isLoading ? "..." : balance,
         isLoading,
         error: error ? String(error) : null,
      };
      return acc;
   }, {} as Record<string, { balance: string; isLoading: boolean; error: string | null }>);
   
   return {
      balances,
      isConnected,
      walletAddress: address,
   };
}