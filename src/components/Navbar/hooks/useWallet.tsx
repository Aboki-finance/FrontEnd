import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { JsonRpcProvider, formatEther } from "ethers";
import { useNavigate, useLocation } from "react-router-dom";

// Type definitions
interface PrivyWallet {
   address: string;
   metadata?: {
      bns?: string;
   };
}

interface PrivyUser {
   wallet?: PrivyWallet;
}

export const useWallet = (isLanding = true) => {
   // State for wallet information
   const [balance, setBalance] = useState<string>("0.00");
   const [truncatedAddress, setTruncatedAddress] = useState<string | null>(
      null
   );
   const [bnsName, setBnsName] = useState<string | null>(null);
   const [copySuccess, setCopySuccess] = useState(false);

   // Hooks for authentication and navigation
   const { login, user, logout } = usePrivy();
   const navigate = useNavigate();
   const location = useLocation();
   const privyUser = user as unknown as PrivyUser | undefined;

   // Connect wallet and redirect to app page
   const handleConnect = async () => {
      try {
         await login();
         if (privyUser?.wallet?.address) {
            await updateBalanceAndAddress();
            navigate("/app");
         }
      } catch (error) {
         console.error("Privy login failed:", error);
      }
   };

   // Disconnect wallet and return to landing page
   const handleDisconnect = async () => {
      try {
         await logout();
         setBalance("0.00");
         setTruncatedAddress(null);
         setBnsName(null);
         navigate("/");
      } catch (error) {
         console.error("Logout failed:", error);
      }
   };

   // Copy wallet address to clipboard with visual feedback
   const copyAddressToClipboard = () => {
      if (privyUser?.wallet?.address) {
         navigator.clipboard.writeText(privyUser.wallet.address);
         setCopySuccess(true);
         setTimeout(() => {
            setCopySuccess(false);
         }, 2000);
      }
   };

   // Fetch wallet balance and format address for display
   const updateBalanceAndAddress = async () => {
      if (!privyUser?.wallet?.address) return;

      try {
         // Get balance from Base network
         const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
         const rawBalance = await provider.getBalance(privyUser.wallet.address);
         const formattedBalance = parseFloat(formatEther(rawBalance)).toFixed(
            2
         );
         setBalance(formattedBalance);

         // Format address for display (e.g., 0x1234...5678)
         const address = privyUser.wallet.address;
         setTruncatedAddress(
            `${address.substring(0, 6)}...${address.substring(
               address.length - 4
            )}`
         );
      } catch (error) {
         console.error("Failed to fetch balance:", error);
      }
   };

   // Initialize wallet data and set up polling
   useEffect(() => {
      if (privyUser?.wallet?.address) {
         // Get BNS name from Privy metadata if available
         const bnsFromMetadata = privyUser.wallet.metadata?.bns;
         if (bnsFromMetadata) {
            setBnsName(bnsFromMetadata);
         }

         // Get initial balance and set up periodic updates
         updateBalanceAndAddress();
         const interval = setInterval(updateBalanceAndAddress, 30000);

         // Redirect if authenticated and on landing page
         if (location.pathname === "/" && isLanding) {
            navigate("/app");
         }

         return () => clearInterval(interval);
      }
   }, [
      user,
      navigate,
      isLanding,
      location.pathname,
      privyUser?.wallet?.address,
   ]);

   const walletAddress = privyUser?.wallet?.address;

   return {
      isConnected: !!walletAddress,
      walletAddress,
      balance,
      truncatedAddress,
      bnsName,
      copySuccess,
      handleConnect,
      handleDisconnect,
      copyAddressToClipboard,
   };
};
