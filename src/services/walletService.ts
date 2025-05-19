import { supportedTokens } from "../constants/tokens";
import { formatUnits } from "viem";
import { erc20Abi } from "viem";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

// Create a public client for reading blockchain data
const publicClient = createPublicClient({
   chain: sepolia,
   transport: http(),
});

export const fetchWalletBalances = async (
   walletAddress: string
): Promise<Record<string, string>> => {
   try {
      const balances: Record<string, string> = {};

      // Fetch token balances in parallel for better performance
      const tokenPromises = Object.entries(supportedTokens).map(
         async ([symbol, token]) => {
            try {
               // Special case for native ETH
               if (symbol === "ETH") {
                  const ethBalance = await publicClient.getBalance({
                     address: walletAddress as `0x${string}`,
                  });
                  return { symbol, balance: formatUnits(ethBalance, 18) };
               }

               // For ERC20 tokens
               const tokenBalance = await publicClient.readContract({
                  address: token.address as `0x${string}`,
                  abi: erc20Abi,
                  functionName: "balanceOf",
                  args: [walletAddress as `0x${string}`],
               });

               return {
                  symbol,
                  balance: formatUnits(tokenBalance as bigint, token.decimals),
               };
            } catch (error) {
               console.error(`Error fetching balance for ${symbol}:`, error);
               return { symbol, balance: "0" };
            }
         }
      );

      const results = await Promise.allSettled(tokenPromises);

      // Process results
      results.forEach((result) => {
         if (result.status === "fulfilled") {
            balances[result.value.symbol] = result.value.balance;
         }
      });

      return balances;
   } catch (error) {
      console.error("Error fetching wallet balances:", error);
      return {};
   }
};
