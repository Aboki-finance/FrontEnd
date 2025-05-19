import React, { useState, useEffect } from "react";
import { MdOutlineSwapVert } from "react-icons/md";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { SwapDetails } from "../context/SwapContext";
import SwapSection from "./SwapSection";
import SelectModal from "./SelectModal";
import { tokens, currencies } from "../constants/swapConstants";
import {
   TokenSymbol,
   CurrencySymbol,
   SectionInfo,
   SwapMode,
   Token,
} from "../types/SwapTypes";
import {
   getCurrentExchangeRate,
   calculateReceiveAmount,
   isSwapValid,
} from "../utils/swapUtils";
import { useTokenBalances } from "../hooks/useTokenBalance";
import { jwtDecode } from "jwt-decode";
import { 
   useAccount,
   useReadContract,
   useWriteContract,
} from "wagmi";

// Import the contract service directly using ES modules
import { executeTokenToNGNSwap as contractExecuteTokenToNGNSwap } from "../services/contractService";

// Create a wrapper function that handles errors
const executeTokenToNGNSwap = async (...args: Parameters<typeof contractExecuteTokenToNGNSwap>) => {
  try {
    return await contractExecuteTokenToNGNSwap(...args);
  } catch (error) {
    console.error("Contract service error", error);
    return { 
      success: false, 
      message: "Contract service not available or encountered an error. Please check your implementation."
    };
  }
};

// Import the modal component directly
import TokenToNGNConfirmModal from "./modals/TokenToNGNConfirmModal";

// Add this interface
interface JwtPayload {
  exp: number;
  iat: number;
  userId: string;
  [key: string]: any;
}

interface SwapCardProps {
   onSwapInitiate?: (details: SwapDetails) => void;
}

const SwapCard: React.FC<SwapCardProps> = ({ onSwapInitiate }) => {
   const [sendAmount, setSendAmount] = useState("");
   const [receiveAmount, setReceiveAmount] = useState("");
   const [selectedToken, setSelectedToken] = useState<TokenSymbol | null>(null);
   const [selectedCurrency, setSelectedCurrency] = useState<CurrencySymbol | null>(null);
   const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
   const [isCurrencySelectOpen, setIsCurrencySelectOpen] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const [swapMode, setSwapMode] = useState<SwapMode>("tokenToCurrency");
   const [isLoading, setIsLoading] = useState(false);
   const [authToken, setAuthToken] = useState<string | null>(null);
   const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null);
   const [errorMessage, setErrorMessage] = useState<string | null>(null);
   
   // Smart contract transaction state
   const [isTokenToNGNModalOpen, setIsTokenToNGNModalOpen] = useState(false);
   const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null);
   const [swapTxHash, setSwapTxHash] = useState<string | null>(null);
   const [isApproving, setIsApproving] = useState(false);
   const [isSwapping, setIsSwapping] = useState(false);
   const [isWrappingETH, setIsWrappingETH] = useState(false);
   const [swapSuccess, setSwapSuccess] = useState(false);

   const { login, authenticated, user } = usePrivy();
   const navigate = useNavigate();
   const { address: walletAddress } = useAccount();
   
   // Wagmi hooks for contract interactions - wrap in try/catch to prevent errors
   const writeContractHook = useWriteContract();
   const writeContractAsync = writeContractHook?.writeContractAsync || 
     (async () => { throw new Error("writeContractAsync not available"); });
   
   const readContractHook = useReadContract();
   const readContract = readContractHook?.data || 
     (async () => { throw new Error("readContract data not available"); });

   // Enhanced console logger with timestamp and category
   const logWithDetails = (category: string, message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      const formattedMessage = `[${timestamp}] [${category}] ${message}`;
      
      if (data) {
         console.groupCollapsed(formattedMessage);
         console.log(data);
         console.groupEnd();
      } else {
         console.log(formattedMessage);
      }
   };

   // Token utility functions
   const isTokenExpired = (token: string): boolean => {
      try {
         const decoded = jwtDecode<JwtPayload>(token);
         const currentTime = Date.now() / 1000;
         return decoded.exp < currentTime;
      } catch (error) {
         // If we can't decode the token, consider it expired
         logWithDetails('ERROR', "Error decoding token, considering it expired", error);
         return true;
      }
   };

   const clearAuthData = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("tokenExpiry");
      // Keep walletAddress for reconnection
      setAuthToken(null);
      logWithDetails('AUTH', 'Auth data cleared');
   };

   // Create a map of token addresses and decimals with error handling
   const tokenConfigs = React.useMemo(() => {
      try {
         return tokens.reduce((acc, token) => {
            acc[token.symbol] = {
               address: token.address,
               decimals: token.decimals,
            };
            return acc;
         }, {} as Record<string, { address: string; decimals: number }>);
      } catch (error) {
         console.error("Error creating token configs:", error);
         return {} as Record<string, { address: string; decimals: number }>;
      }
   }, []);

   // Use the hook to fetch all token balances with error handling
   const tokenBalancesResult = useTokenBalances(tokenConfigs);
   const balances = tokenBalancesResult?.balances || {};
   const isConnected = tokenBalancesResult?.isConnected || false;

   const handleSendAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (value === "" || /^\d*\.?\d*$/.test(value)) {
         setSendAmount(value);

         try {
            const calculatedAmount = calculateReceiveAmount(
               value,
               swapMode,
               selectedToken,
               selectedCurrency
            );
            setReceiveAmount(calculatedAmount);
         } catch (error) {
            console.error("Error calculating receive amount:", error);
            setReceiveAmount("");
         }
      }
   };

   const handleTokenSelect = (symbol: string) => {
      logWithDetails('UI', `Token selected: ${symbol}`);
      setSelectedToken(symbol as TokenSymbol);
      setIsTokenSelectOpen(false);
      setSearchQuery("");
      updateReceiveAmount(sendAmount, symbol as TokenSymbol, selectedCurrency);
   };

   const handleCurrencySelect = (symbol: string) => {
      logWithDetails('UI', `Currency selected: ${symbol}`);
      setSelectedCurrency(symbol as CurrencySymbol);
      setIsCurrencySelectOpen(false);
      setSearchQuery("");
      updateReceiveAmount(sendAmount, selectedToken, symbol as CurrencySymbol);
   };

   const updateReceiveAmount = (
      amount: string,
      token: TokenSymbol | null,
      currency: CurrencySymbol | null
   ) => {
      try {
         const calculatedAmount = calculateReceiveAmount(
            amount,
            swapMode,
            token,
            currency
         );
         setReceiveAmount(calculatedAmount);
      } catch (error) {
         console.error("Error updating receive amount:", error);
         setReceiveAmount("");
      }
   };

   const handleSwapDirection = () => {
      const newMode: SwapMode =
         swapMode === "tokenToCurrency" ? "currencyToToken" : "tokenToCurrency";
      logWithDetails('UI', `Swap direction changed to: ${newMode}`);
      setSwapMode(newMode);

      if (receiveAmount && sendAmount) {
         setSendAmount(receiveAmount);

         try {
            const calculatedAmount = calculateReceiveAmount(
               receiveAmount,
               newMode,
               selectedToken,
               selectedCurrency
            );
            setReceiveAmount(calculatedAmount);
         } catch (error) {
            console.error("Error calculating amount after swap direction change:", error);
            setReceiveAmount("");
         }
      }
      
      // Reset error message when changing swap direction
      setErrorMessage(null);
   };

   // Enhanced authentication function with token expiration handling
   const authenticateUser = async (userWalletAddress: string, isRefresh = false): Promise<boolean> => {
      try {
         console.group('%c🔐 AUTHENTICATION PROCESS', 'color: #3b82f6; font-weight: bold; font-size: 12px;');
         logWithDetails('AUTH', `${isRefresh ? 'Refreshing' : 'Starting'} authentication process`);
         logWithDetails('AUTH', `Using wallet address: ${userWalletAddress}`);
         setIsLoading(true);
         
         // Start timer for performance tracking
         console.time('authApiCall');
         logWithDetails('API', 'Sending authentication request to API endpoint: https://aboki-api.onrender.com/api/ramp/auth/direct-auth');
         
         const response = await fetch("https://aboki-api.onrender.com/api/ramp/auth/direct-auth", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ walletAddress: userWalletAddress }),
         });

         console.timeEnd('authApiCall');
         logWithDetails('API', `Auth API response status: ${response.status} ${response.statusText}`);
         
         // Clone the response for additional logging
         const responseClone = response.clone();
         // Log the full response headers
         const headers: Record<string, string> = {};
         responseClone.headers.forEach((value, key) => {
            headers[key] = value;
         });
         logWithDetails('API', 'Response headers:', headers);
         
         const data = await response.json();
         // Safely log the response data
         if (data.success && data.data && data.data.token) {
            const token = data.data.token;
            const firstFive = token.substring(0, 5);
            const lastFive = token.substring(token.length - 5);
            
            logWithDetails('AUTH', 'Authentication response:', {
               success: data.success,
               message: data.message,
               token: `${firstFive}...${lastFive}`,
               ramper: data.data.ramper ? {
                  id: data.data.ramper.id,
                  kycStatus: data.data.ramper.kycStatus,
                  kycMethod: data.data.ramper.kycMethod
               } : null
            });
            
            try {
               // Decode token to get expiration time
               const decoded = jwtDecode<JwtPayload>(token);
               const expiryTime = decoded.exp * 1000; // Convert to milliseconds
               
               // Store the token and expiry time
               localStorage.setItem("authToken", token);
               localStorage.setItem("tokenExpiry", expiryTime.toString());
               localStorage.setItem("walletAddress", userWalletAddress);
               
               logWithDetails('STORAGE', 'Credentials stored in localStorage', {
                  tokenStored: true,
                  walletAddressStored: true,
                  tokenExpiry: new Date(expiryTime).toISOString()
               });
               
               setAuthToken(token);
               
               // Clear any existing refresh timer
               if (tokenRefreshTimer) {
                  clearTimeout(tokenRefreshTimer);
               }
               
               // Set up a timer to refresh token before it expires
               const timeToExpiry = expiryTime - Date.now();
               const timeToRefresh = timeToExpiry - 300000; // Refresh 5 minutes before expiry
               
               if (timeToRefresh > 0) {
                  logWithDetails('AUTH', `Setting up token refresh in ${Math.floor(timeToRefresh/60000)} minutes`);
                  const timer = setTimeout(() => {
                     refreshAuthToken(userWalletAddress);
                  }, timeToRefresh);
                  setTokenRefreshTimer(timer);
               }
            } catch (error) {
               logWithDetails('ERROR', 'Failed to decode token expiry', error);
               // Still store the token even if we couldn't decode the expiry
               localStorage.setItem("authToken", token);
               localStorage.setItem("walletAddress", userWalletAddress);
               setAuthToken(token);
            }
            
            logWithDetails('AUTH', 'Authentication successful');
            console.groupEnd();
            return true;
         } else {
            logWithDetails('ERROR', `Authentication failed: ${data.message || "Unknown error"}`, data);
            console.error("Authentication failed:", data);
            console.groupEnd();
            return false;
         }
      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : "Unknown error";
         logWithDetails('EXCEPTION', `Authentication error: ${errorMsg}`, error);
         console.error("Authentication error:", error);
         console.groupEnd();
         return false;
      } finally {
         setIsLoading(false);
      }
   };

   // Refresh the auth token
   const refreshAuthToken = async (userWalletAddress: string): Promise<void> => {
      logWithDetails('AUTH', 'Refreshing authentication token');
      const success = await authenticateUser(userWalletAddress, true);
      
      if (!success) {
         logWithDetails('AUTH', 'Token refresh failed, clearing auth data');
         clearAuthData();
      }
   };

   // Execute token to NGN swap with error handling
   const handleTokenToNGNSwap = async () => {
      if (!walletAddress || !selectedToken || !sendAmount) {
         setErrorMessage("Invalid swap parameters");
         return;
      }
      
      try {
         setIsSwapping(true);
         setErrorMessage(null);
         
         // Safely get exchange rate
         let rate = 0;
         try {
            rate = getCurrentExchangeRate(swapMode, selectedToken, selectedCurrency);
         } catch (error) {
            console.error("Error getting exchange rate:", error);
            throw new Error("Failed to get exchange rate. Please try again.");
         }
         
         // Execute the swap using the contract service
         const result = await executeTokenToNGNSwap(
            writeContractAsync,
            readContract,
            {
               tokens,
               selectedToken,
               sendAmount,
               receiveAmount,
               rate,
               walletAddress
            }
         );
         
         if (result.success) {
            // Swap executed successfully
            if ('swapTxHash' in result) {
               setSwapTxHash(result.swapTxHash || null);
            } else {
               setSwapTxHash(null);
            }
            
            // Update UI for wrapped ETH indication if applicable
            if ('isWrappedETH' in result && result.isWrappedETH) {
               logWithDetails('INFO', 'ETH was wrapped to WETH before the swap', result);
               setIsWrappingETH(false);
            }
            
            setSwapSuccess(true);
            
            // Create swap details for UI update
            if (onSwapInitiate && selectedToken && selectedCurrency) {
               const swapDetails: SwapDetails = {
                  fromToken: selectedToken,
                  toToken: selectedCurrency,
                  fromAmount: parseFloat(sendAmount),
                  toAmount: parseFloat(receiveAmount),
                  rate,
               };
               
               // Notify the parent component
               onSwapInitiate(swapDetails);
            }
         } else if ('requiresApproval' in result && result.requiresApproval && result.approvalTxHash) {
            // Token approval required
            setApprovalTxHash(result.approvalTxHash);
            setIsApproving(true);
         } else {
            // Swap failed
            setErrorMessage(result.message || "Swap failed");
         }
      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : "Unknown error";
         logWithDetails('ERROR', `Token to NGN swap error: ${errorMsg}`, error);
         setErrorMessage(`Swap failed: ${errorMsg}`);
      } finally {
         setIsSwapping(false);
      }
   };

   // Handle token-to-NGN swap confirmation
   const handleTokenToNGNConfirm = () => {
      try {
         handleTokenToNGNSwap();
      } catch (error) {
         console.error("Error in token to NGN confirmation:", error);
         setErrorMessage("Failed to process the swap. Please try again.");
      }
   };

   // Handle swap success
   const handleSwapSuccess = (orderId: string) => {
      logWithDetails('SUCCESS', `Token to NGN swap successful! Order ID: ${orderId}`);
      // Store order ID in local storage or context for tracking
      try {
         localStorage.setItem("currentOrderId", orderId);
         localStorage.setItem("orderStatus", "COMPLETED");
      } catch (error) {
         console.error("Error storing order data in localStorage:", error);
      }
      
      // Close modal after a delay
      setTimeout(() => {
         setIsTokenToNGNModalOpen(false);
         // Reset state
         setApprovalTxHash(null);
         setSwapTxHash(null);
         setIsApproving(false);
         setIsSwapping(false);
         setIsWrappingETH(false);
         setSwapSuccess(false);
         setSendAmount("");
         setReceiveAmount("");
      }, 5000);
   };

   const isEligibleForSwap = (): boolean => {
      try {
         // Check if the swap mode is currency to token
         if (swapMode === "currencyToToken") {
            // Check if sending NGN and receiving ETH or USDC
            const isEligible = selectedCurrency === "NGN" &&
               parseFloat(sendAmount || "0") > 0 &&
               (selectedToken === "ETH" || selectedToken === "USDC");
               
            return isEligible;
         }
         
         // For token to currency (the new function)
         if (swapMode === "tokenToCurrency") {
            // Check if sending any token and receiving NGN
            const isEligible = selectedCurrency === "NGN" &&
               parseFloat(sendAmount || "0") > 0 &&
               selectedToken !== null;
            
            return isEligible;
         }
         
         return false;
      } catch (error) {
         console.error("Error checking swap eligibility:", error);
         return false;
      }
   };

   const getButtonText = (): string => {
      try {
         if (!authenticated) {
            return "Connect Wallet";
         }

         if (!isSwapValid(sendAmount, receiveAmount, selectedToken, selectedCurrency)) {
            return "Enter amount";
         }

         if (isEligibleForSwap()) {
            if (swapMode === "tokenToCurrency") {
               if (isWrappingETH) {
                  return "Wrapping ETH...";
               }
               return isLoading || isApproving || isSwapping ? "Processing..." : "Swap to NGN";
            } else {
               return isLoading ? "Processing..." : "Swap to Token";
            }
         }

         return "Coming Soon";
      } catch (error) {
         console.error("Error getting button text:", error);
         return "Enter Amount";
      }
   };

   const isButtonDisabled = (): boolean => {
      try {
         if (!authenticated) {
            return false; // Enable the button for wallet connection
         }

         if (!isSwapValid(sendAmount, receiveAmount, selectedToken, selectedCurrency)) {
            return true; // Disable if the swap is not valid
         }

         if (isEligibleForSwap()) {
            return isLoading || isApproving || isSwapping || isWrappingETH; // Disable when loading during eligible swap
         }

         return true; // Disable for "Coming Soon"
      } catch (error) {
         console.error("Error checking if button should be disabled:", error);
         return true; // Disable by default if there's an error
      }
   };
   
   // Handle both NGN-to-token and token-to-NGN swaps with error handling
   const handleSwap = async () => {
      try {
         if (!authenticated) {
            console.group('%c👋 WALLET CONNECTION', 'color: #f59e0b; font-weight: bold; font-size: 12px;');
            logWithDetails('AUTH', 'User not authenticated. Initiating Privy login...');
            await login();
            logWithDetails('AUTH', 'Privy login called');
            console.groupEnd();
            return;
         }

         console.group('%c🔄 SWAP INITIATION', 'color: #8b5cf6; font-weight: bold; font-size: 12px;');
         logWithDetails('ACTION', 'Authenticated user initiated swap');
         logWithDetails('CHECK', 'Checking swap eligibility', {
            swapMode,
            selectedToken,
            selectedCurrency,
            sendAmount,
            receiveAmount,
            isEligible: isEligibleForSwap()
         });
         
         if (isEligibleForSwap() && isSwapValid(sendAmount, receiveAmount, selectedToken, selectedCurrency)) {
            // Get wallet address
            const userWalletAddress = user?.wallet?.address || walletAddress;
            if (!userWalletAddress) {
               setErrorMessage('Wallet address not found');
               logWithDetails('ERROR', 'Wallet address not found');
               console.groupEnd();
               return;
            }

            // NGN to Token flow (uses the API)
            if (swapMode === "currencyToToken") {
               // Authenticate the user if needed
               const existingToken = localStorage.getItem("authToken");
               
               // If token exists, check if it's expired
               if (existingToken) {
                  if (isTokenExpired(existingToken)) {
                     logWithDetails('AUTH', 'Existing token is expired, refreshing');
                     const authSuccess = await authenticateUser(userWalletAddress);
                     
                     if (!authSuccess) {
                        setErrorMessage('Authentication failed');
                        logWithDetails('ERROR', 'Failed to refresh expired token');
                        console.groupEnd();
                        return;
                     }
                  } else {
                     logWithDetails('AUTH', 'Using existing valid auth token from localStorage');
                     setAuthToken(existingToken);
                  }
               } else {
                  logWithDetails('AUTH', 'No existing token found, authenticating user...');
                  const authSuccess = await authenticateUser(userWalletAddress);
                  
                  if (!authSuccess) {
                     setErrorMessage('Authentication failed');
                     logWithDetails('ERROR', 'Initial authentication failed');
                     console.groupEnd();
                     return;
                  }
               }
               
               // Now proceed with the swap if authentication was successful
               if (authToken && onSwapInitiate && selectedToken && selectedCurrency) {
                  logWithDetails('ACTION', 'Authentication successful, preparing swap details');
                  const swapDetails: SwapDetails = {
                     fromToken: selectedCurrency,
                     toToken: selectedToken,
                     fromAmount: parseFloat(sendAmount),
                     toAmount: parseFloat(receiveAmount),
                     rate: getCurrentExchangeRate(swapMode, selectedToken, selectedCurrency),
                  };

                  logWithDetails('ACTION', 'Swap details prepared', swapDetails);
                  logWithDetails('ACTION', 'Calling onSwapInitiate callback');
                  onSwapInitiate(swapDetails);
                  logWithDetails('SUCCESS', 'Swap initiated successfully');
               } else {
                  setErrorMessage('Authentication unsuccessful or missing swap parameters');
                  logWithDetails('ERROR', 'Authentication unsuccessful or missing swap parameters');
               }
            }
            // Token to NGN flow (uses smart contract)
            else if (swapMode === "tokenToCurrency") {
               // Open token-to-NGN confirmation modal
               setIsTokenToNGNModalOpen(true);
            }
         } else if (authenticated) {
            logWithDetails('INFO', 'User is authenticated but swap is not eligible or valid');
            navigate("/app");
         }
         
         console.groupEnd();
      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : "Unknown error";
         console.error('%c❌ SWAP ERROR', 'color: #ef4444; font-weight: bold; font-size: 12px;', errorMsg, error);
         setErrorMessage(errorMsg);
         console.groupEnd();
      }
   };

   const getTokenBalance = (symbol: TokenSymbol | null): string => {
      try {
         if (!authenticated || !symbol || !balances[symbol]) return "0.00";

         const tokenBalance = balances[symbol].balance;
         return balances[symbol].isLoading ? "..." : tokenBalance;
      } catch (error) {
         console.error("Error getting token balance:", error);
         return "0.00";
      }
   };

   // Update token objects with real-time balances with error handling
   const tokensWithBalances = React.useMemo(() => {
      try {
         return tokens.map((token) => {
            return {
               ...token,
               balance: getTokenBalance(token.symbol as TokenSymbol),
            };
         });
      } catch (error) {
         console.error("Error updating tokens with balances:", error);
         return tokens; // Return original tokens if there's an error
      }
   }, [tokens, balances, authenticated]);

   const filteredTokens = React.useMemo(() => {
      try {
         return tokensWithBalances.filter(
            (token) =>
               token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
               token.name.toLowerCase().includes(searchQuery.toLowerCase())
         );
      } catch (error) {
         console.error("Error filtering tokens:", error);
         return tokensWithBalances; // Return all tokens if there's an error
      }
   }, [tokensWithBalances, searchQuery]);

   const filteredCurrencies = React.useMemo(() => {
      try {
         return currencies.filter(
            (currency) =>
               currency.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
               currency.name.toLowerCase().includes(searchQuery.toLowerCase())
         );
      } catch (error) {
         console.error("Error filtering currencies:", error);
         return currencies; // Return all currencies if there's an error
      }
   }, [currencies, searchQuery]);

   // Initialize with defaults and check token validity
   useEffect(() => {
      try {
         console.group('%c🔄 SWAP CARD INITIALIZATION', 'color: #10b981; font-weight: bold; font-size: 12px;');
         logWithDetails('LIFECYCLE', 'Component mounted');
         
         if (!selectedToken) {
            setSelectedToken("ETH");
            logWithDetails('CONFIG', 'Default token set to ETH');
         }
         if (!selectedCurrency) {
            setSelectedCurrency("NGN");
            logWithDetails('CONFIG', 'Default currency set to NGN');
         }
         
         // Check for existing auth token and validate it
         const storedToken = localStorage.getItem("authToken");
         
         if (storedToken) {
            // Check if token is expired
            if (isTokenExpired(storedToken)) {
               logWithDetails('AUTH', 'Stored token is expired, clearing it');
               clearAuthData();
            } else {
               logWithDetails('AUTH', 'Found valid auth token in localStorage');
               setAuthToken(storedToken);
               
               // Log token details (securely - just the first and last few characters)
               const firstFive = storedToken.substring(0, 5);
               const lastFive = storedToken.substring(storedToken.length - 5);
               logWithDetails('AUTH', `Token format: ${firstFive}...${lastFive}`);
               
               // Set up refresh timer if expiry time is available
               const tokenExpiry = localStorage.getItem("tokenExpiry");
               if (tokenExpiry) {
                  const expiryTime = parseInt(tokenExpiry, 10);
                  const timeToExpiry = expiryTime - Date.now();
                  const timeToRefresh = timeToExpiry - 300000; // Refresh 5 minutes before expiry
                  
                  if (timeToRefresh > 0) {
                     logWithDetails('AUTH', `Setting up token refresh in ${Math.floor(timeToRefresh/60000)} minutes`);
                     const timer = setTimeout(() => {
                        const storedWalletAddress = localStorage.getItem("walletAddress");
                        if (storedWalletAddress) {
                           refreshAuthToken(storedWalletAddress);
                        }
                     }, timeToRefresh);
                     setTokenRefreshTimer(timer);
                  }
               }
            }
         } else {
            logWithDetails('AUTH', 'No auth token found in localStorage');
         }
         
         // Check for wallet address
         const storedWalletAddress = localStorage.getItem("walletAddress");
         if (storedWalletAddress) {
            logWithDetails('AUTH', `Found stored wallet address: ${storedWalletAddress}`);
         }
         
         console.groupEnd();
      } catch (error) {
         console.error("Error in initialization effect:", error);
      }
      
      // Cleanup function to clear timeout
      return () => {
         if (tokenRefreshTimer) {
            clearTimeout(tokenRefreshTimer);
         }
      };
   }, []);

   // When user authentication state changes
   useEffect(() => {
      try {
         if (authenticated) {
            logWithDetails('AUTH', 'User authenticated via Privy');
            if (user?.wallet?.address) {
               logWithDetails('AUTH', `User wallet address: ${user.wallet.address}`);
               
               // Check if token is expired or missing, and user just authenticated
               const storedToken = localStorage.getItem("authToken");
               if ((!storedToken || isTokenExpired(storedToken)) && user.wallet.address) {
                  logWithDetails('AUTH', 'No valid token found but user is authenticated, getting new token');
                  authenticateUser(user.wallet.address);
               }
            } else {
               logWithDetails('AUTH', 'User authenticated but wallet address not available');
            }
         }
      } catch (error) {
         console.error("Error in authentication effect:", error);
      }
   }, [authenticated, user]);

   // Recalculate on token/currency selection change
   useEffect(() => {
      try {
         if (selectedToken && selectedCurrency && sendAmount) {
            updateReceiveAmount(sendAmount, selectedToken, selectedCurrency);
         }
      } catch (error) {
         console.error("Error in recalculation effect:", error);
      }
   }, [selectedToken, selectedCurrency]);

   // Determine what to show in each section based on swap mode
   const sendSection: SectionInfo = React.useMemo(() => {
      try {
         return swapMode === "tokenToCurrency"
            ? {
                 title: "Send",
                 isToken: true,
                 selectAction: () => setIsTokenSelectOpen(true),
                 selected: selectedToken,
                 items: tokensWithBalances,
                 findItem: (symbol) =>
                    tokensWithBalances.find((t) => t.symbol === symbol),
                 imageKey: "icon",
              }
            : {
                 title: "Send",
                 isToken: false,
                 selectAction: () => setIsCurrencySelectOpen(true),
                 selected: selectedCurrency,
                 items: currencies,
                 findItem: (symbol) => currencies.find((c) => c.symbol === symbol),
                 imageKey: "flag",
              };
      } catch (error) {
         console.error("Error creating send section:", error);
         return {
            title: "Send",
            isToken: true,
            selectAction: () => {},
            selected: null,
            items: [],
            findItem: () => undefined,
            imageKey: "icon",
         };
      }
   }, [swapMode, selectedToken, selectedCurrency, tokensWithBalances, currencies]);

   const receiveSection: SectionInfo = React.useMemo(() => {
      try {
         return swapMode === "tokenToCurrency"
            ? {
                 title: "Receive",
                 isToken: false,
                 selectAction: () => setIsCurrencySelectOpen(true),
                 selected: selectedCurrency,
                 items: currencies,
                 findItem: (symbol) => currencies.find((c) => c.symbol === symbol),
                 imageKey: "flag",
              }
            : {
                 title: "Receive",
                 isToken: true,
                 selectAction: () => setIsTokenSelectOpen(true),
                 selected: selectedToken,
                 items: tokensWithBalances,
                 findItem: (symbol) =>
                    tokensWithBalances.find((t) => t.symbol === symbol),
                 imageKey: "icon",
              };
      } catch (error) {
         console.error("Error creating receive section:", error);
         return {
            title: "Receive",
            isToken: false,
            selectAction: () => {},
            selected: null,
            items: [],
            findItem: () => undefined,
            imageKey: "flag",
         };
      }
   }, [swapMode, selectedToken, selectedCurrency, tokensWithBalances, currencies]);

   // Safely create swap details for confirmation modal
   const createSwapDetails = (): SwapDetails | null => {
      try {
         if (swapMode === "tokenToCurrency" && selectedToken && selectedCurrency) {
            return {
               fromToken: selectedToken,
               toToken: selectedCurrency,
               fromAmount: parseFloat(sendAmount || "0"),
               toAmount: parseFloat(receiveAmount || "0"),
               rate: getCurrentExchangeRate(swapMode, selectedToken, selectedCurrency),
            };
         }
         return null;
      } catch (error) {
         console.error("Error creating swap details:", error);
         return null;
      }
   };

   return (
      <div className="w-full max-w-md mx-auto">
         <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-0.5 shadow-lg">
            <div className="relative bg-white rounded-3xl p-4 space-y-0 grid gap-2">
               <SwapSection
                  sectionInfo={sendSection}
                  isInput={true}
                  sendAmount={sendAmount}
                  receiveAmount={receiveAmount}
                  onAmountChange={handleSendAmountChange}
                  selectedToken={selectedToken}
                  selectedCurrency={selectedCurrency}
                  swapMode={swapMode}
                  authenticated={authenticated}
                  getTokenBalance={getTokenBalance}
               />

               <div className="absolute left-1/2 top-[43%] transform -translate-x-1/2 -translate-y-1/2 flex justify-center py-3 ">
                  <button
                     onClick={handleSwapDirection}
                     className=" p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                     <MdOutlineSwapVert size={24} className="text-purple-500" />
                  </button>
               </div>

               <SwapSection
                  sectionInfo={receiveSection}
                  isInput={false}
                  sendAmount={sendAmount}
                  receiveAmount={receiveAmount}
                  selectedToken={selectedToken}
                  selectedCurrency={selectedCurrency}
                  swapMode={swapMode}
                  authenticated={authenticated}
                  getTokenBalance={getTokenBalance}
               />

               {errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-xl">
                     <p className="text-sm text-red-600">{errorMessage}</p>
                  </div>
               )}

               <div className="pt-3">
                  <button
                     onClick={handleSwap}
                     disabled={isButtonDisabled()}
                     className={`w-full py-3 px-4 rounded-3xl font-semibold text-base transition-all ${
                        isButtonDisabled()
                           ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                           : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:opacity-90 shadow-md"
                     }`}>
                     {getButtonText()}
                  </button>
               </div>
            </div>
         </div>

         <SelectModal
            isOpen={isTokenSelectOpen}
            onClose={() => {
               setIsTokenSelectOpen(false);
               setSearchQuery("");
            }}
            title="Select a token"
            items={filteredTokens}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onItemSelect={handleTokenSelect}
            isToken={true}
            authenticated={authenticated}
            getTokenBalance={getTokenBalance}
         />

         <SelectModal
            isOpen={isCurrencySelectOpen}
            onClose={() => {
               setIsCurrencySelectOpen(false);
               setSearchQuery("");
            }}
            title="Select a currency"
            items={filteredCurrencies}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onItemSelect={handleCurrencySelect}
            isToken={false}
         />

         {/* Token to NGN confirmation modal with error handling */}
         {typeof TokenToNGNConfirmModal === 'function' && (
            <TokenToNGNConfirmModal
               isOpen={isTokenToNGNModalOpen}
               onClose={() => setIsTokenToNGNModalOpen(false)}
               onConfirm={handleTokenToNGNConfirm}
               onSuccess={handleSwapSuccess}
               swapDetails={createSwapDetails()}
               approvalTxHash={approvalTxHash}
               swapTxHash={swapTxHash}
               isApproving={isApproving}
               isSwapping={isSwapping}
               isWrappingETH={isWrappingETH}
               error={errorMessage}
            />
         )}
      </div>
   );
};

export default SwapCard;