import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { FaEthereum, FaDollarSign, FaWallet, FaEdit } from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi";
import { SwapDetails } from "../../context/SwapContext";
import { usePrivy } from "@privy-io/react-auth"; // Import usePrivy hook

interface ConfirmSwapModalProps {
   isOpen: boolean;
   onClose: () => void;
   onConfirm: () => void;
   swapDetails: SwapDetails | null;
}

interface OnrampOrderResponse {
   success: boolean;
   message: string;
   order?: {
      id: string;
      type: string;
      sourceAmount: number;
      sourceCurrency: string;
      targetAmount: number;
      targetCurrency: string;
      status: string;
      recipientWalletAddress: string;
      createdAt: string;
      expiresAt: string;
   };
   payment?: {
      checkoutUrl: string;
      paymentReference: string;
      amount: number;
      currency: string;
      expiresAt: string;
   };
   expiresInMinutes?: number;
}

const ConfirmSwapModal: React.FC<ConfirmSwapModalProps> = ({
   isOpen,
   onClose,
   onConfirm,
   swapDetails,
}) => {
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [useCustomWallet, setUseCustomWallet] = useState(false);
   const [customWalletAddress, setCustomWalletAddress] = useState("");
   const [walletError, setWalletError] = useState<string | null>(null);
   
   // Get Privy authentication context
   const { user, authenticated } = usePrivy();

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

   // Component mounted
   useEffect(() => {
      if (isOpen && swapDetails) {
         console.group('%c🔄 SWAP CONFIRMATION OPENED', 'color: #8b5cf6; font-weight: bold; font-size: 12px;');
         logWithDetails('INFO', 'Modal opened with swap details:', swapDetails);
         
         // Reset custom wallet state when modal opens
         setUseCustomWallet(false);
         setCustomWalletAddress("");
         setWalletError(null);
         
         // Check if auth token exists
         const authToken = localStorage.getItem("authToken");
         if (authToken) {
            const firstFive = authToken.substring(0, 5);
            const lastFive = authToken.substring(authToken.length - 5);
            logWithDetails('AUTH', `Auth token exists: ${firstFive}...${lastFive}`);
         } else {
            logWithDetails('WARNING', 'No auth token found in localStorage');
         }
         
         // Log wallet address from Privy
         if (authenticated && user?.wallet?.address) {
            logWithDetails('INFO', `Using Privy wallet address: ${user.wallet.address}`);
         } else {
            logWithDetails('WARNING', 'No wallet address available from Privy');
            
            // Fallback check for wallet address in localStorage
            const walletAddress = localStorage.getItem("walletAddress");
            if (walletAddress) {
               logWithDetails('INFO', `Fallback to localStorage wallet address: ${walletAddress}`);
            } else {
               logWithDetails('WARNING', 'No wallet address found in Privy or localStorage');
            }
         }
         console.groupEnd();
      }
   }, [isOpen, swapDetails, authenticated, user]);

   // Component unmounted or closed
   useEffect(() => {
      return () => {
         if (isOpen) {
            logWithDetails('INFO', 'Swap confirmation modal closed');
         }
      };
   }, [isOpen]);

   if (!swapDetails) return null;

   // Validate Ethereum address
   const isValidEthereumAddress = (address: string): boolean => {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
   };

   const handleChangeWalletAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
      const address = e.target.value;
      setCustomWalletAddress(address);
      
      if (!address) {
         setWalletError("Wallet address is required");
      } else if (!isValidEthereumAddress(address)) {
         setWalletError("Invalid Ethereum wallet address");
      } else {
         setWalletError(null);
      }
   };

   const handleConfirmSwap = async () => {
      try {
         console.group('%c🚀 ONRAMP PROCESS STARTED', 'color: #10b981; font-weight: bold; font-size: 12px;');
         logWithDetails('ACTION', 'Swap confirmation initiated by user');
         setIsLoading(true);
         setError(null);

         // Get the auth token from localStorage
         const authToken = localStorage.getItem("authToken");
         
         if (!authToken) {
            const errorMsg = "Authentication required. Please try connecting your wallet again.";
            logWithDetails('ERROR', errorMsg);
            setError(errorMsg);
            console.groupEnd();
            return;
         }
         
         logWithDetails('AUTH', 'Authentication token retrieved successfully');
         
         // Determine which wallet address to use
         let walletAddress: string | undefined;
         
         if (useCustomWallet) {
            // Use the custom wallet address if specified
            if (!customWalletAddress || !isValidEthereumAddress(customWalletAddress)) {
               const errorMsg = "Please enter a valid Ethereum wallet address";
               logWithDetails('ERROR', errorMsg);
               setError(errorMsg);
               console.groupEnd();
               setIsLoading(false);
               return;
            }
            
            walletAddress = customWalletAddress;
            logWithDetails('AUTH', `Using custom wallet address: ${walletAddress}`);
         } else if (authenticated && user?.wallet?.address) {
            // Use Privy wallet address if available
            walletAddress = user.wallet.address;
            logWithDetails('AUTH', `Using connected wallet address: ${walletAddress}`);
         } else {
            // Fallback to localStorage
            walletAddress = localStorage.getItem("walletAddress") || undefined;
            logWithDetails('AUTH', `Fallback to localStorage wallet: ${walletAddress || "Not found"}`);
            
            if (!walletAddress) {
               const errorMsg = "Wallet connection required. Please connect your wallet or enter a custom wallet address.";
               logWithDetails('ERROR', errorMsg);
               setError(errorMsg);
               console.groupEnd();
               setIsLoading(false);
               return;
            }
         }
         
         // Prepare request payload
         const payload = {
            amount: Math.round(swapDetails.fromAmount), // Ensuring we send an integer value
            targetCurrency: swapDetails.toToken,
            recipientWalletAddress: walletAddress
         };
         
         logWithDetails('API', 'Preparing onramp API request', payload);
         
         // Create the onramp order
         console.time('onrampApiCall');
         logWithDetails('API', 'Sending onramp API request to endpoint: https://aboki-api.onrender.com/api/ramp/onramp');
         const response = await fetch("https://aboki-api.onrender.com/api/ramp/onramp", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
         });
         
         console.timeEnd('onrampApiCall');
         logWithDetails('API', `Response status: ${response.status} ${response.statusText}`);
         
         // Clone the response for additional logging
         const responseClone = response.clone();
         // Log the full response headers
         const headers: Record<string, string> = {};
         responseClone.headers.forEach((value, key) => {
            headers[key] = value;
         });
         logWithDetails('API', 'Response headers:', headers);
         
         const data: OnrampOrderResponse = await response.json();
         
         // Log response data safely without sensitive information
         const sanitizedData = {
            success: data.success,
            message: data.message,
            order: data.order ? {
               id: data.order.id,
               type: data.order.type,
               sourceAmount: data.order.sourceAmount,
               sourceCurrency: data.order.sourceCurrency,
               targetAmount: data.order.targetAmount,
               targetCurrency: data.order.targetCurrency,
               status: data.order.status,
               // Omit recipientWalletAddress for privacy
               createdAt: data.order.createdAt,
               expiresAt: data.order.expiresAt
            } : undefined,
            payment: data.payment ? {
               // Don't log the actual URL for security
               checkoutUrl: data.payment.checkoutUrl ? '[REDACTED]' : undefined,
               paymentReference: data.payment.paymentReference,
               amount: data.payment.amount,
               currency: data.payment.currency,
               expiresAt: data.payment.expiresAt
            } : undefined,
            expiresInMinutes: data.expiresInMinutes
         };
         
         logWithDetails('API', 'Response data received:', sanitizedData);

         if (data.success && data.payment?.checkoutUrl) {
            logWithDetails('SUCCESS', 'Onramp order created successfully!', { orderId: data.order?.id });
            
            // Store relevant order details in localStorage
            localStorage.setItem("currentOrderId", data.order?.id || "");
            localStorage.setItem("orderStatus", "PENDING");
            logWithDetails('STORAGE', 'Order details saved to localStorage', { 
               orderId: data.order?.id, 
               status: 'PENDING' 
            });
            
            // Call onConfirm to let parent component know we're successful
            logWithDetails('ACTION', 'Calling onConfirm callback');
            onConfirm();
            
            // Redirect to the payment gateway
            logWithDetails('REDIRECT', 'Redirecting to payment gateway', { 
               paymentProvider: 'Monnify',
               paymentReference: data.payment.paymentReference,
               amount: data.payment.amount,
               currency: data.payment.currency,
               expiresAt: data.payment.expiresAt
            });
            
            // Small delay to ensure logs are captured before redirect
            setTimeout(() => {
               logWithDetails('REDIRECT', 'Executing redirect now');
               window.location.href = data.payment?.checkoutUrl || "";
            }, 200);
         } else {
            const errorMsg = data.message || "Failed to create order. Please try again.";
            logWithDetails('ERROR', `Order creation failed: ${errorMsg}`);
            setError(errorMsg);
         }
      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : "Unknown error";
         logWithDetails('EXCEPTION', `Unexpected error occurred: ${errorMsg}`, error);
         console.error("Detailed error:", error);
         setError("An unexpected error occurred. Please try again later.");
      } finally {
         setIsLoading(false);
         logWithDetails('INFO', 'Onramp process completed');
         console.groupEnd();
      }
   };

   // Display the appropriate icon based on token
   const getTokenIcon = (token: string) => {
      if (token === "ETH") {
         return <FaEthereum className="text-blue-600 dark:text-blue-400" size={24} />;
      } else if (token === "USDC") {
         return <FaDollarSign className="text-green-600 dark:text-green-400" size={24} />;
      } else if (token === "NGN") {
         return <span className="text-green-600 dark:text-green-400 font-bold text-lg">₦</span>;
      } else {
         return <FaDollarSign className="text-green-600 dark:text-green-400" size={24} />;
      }
   };

   // Get the active wallet address to display
   //const getActiveWalletAddress = (): string => {
   //   if (useCustomWallet) {
   //      return customWalletAddress || "Enter a wallet address";
   //   } else if (authenticated && user?.wallet?.address) {
   //      return user.wallet.address;
   //   } else {
   //      return localStorage.getItem("walletAddress") || "No wallet connected";
   //   }
   //};

   // Function to truncate wallet address for display
   const truncateAddress = (address: string): string => {
      if (!address || address.length < 10) return address;
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
   };

   return (
      <AnimatePresence>
         {isOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
               onClick={onClose}>
               <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl"
                  onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Transaction Details
                     </h2>
                     <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        <IoClose size={24} />
                     </button>
                  </div>

                  {/* Swap Details */}
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                           {getTokenIcon(swapDetails.fromToken)}
                        </div>
                        <div>
                           <p className="text-sm text-gray-500 dark:text-gray-400">
                              From
                           </p>
                           <p className="font-semibold text-gray-900 dark:text-white">
                              {swapDetails.fromAmount} {swapDetails.fromToken}
                           </p>
                        </div>
                     </div>

                     <HiArrowRight className="text-gray-400" size={24} />

                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                           {getTokenIcon(swapDetails.toToken)}
                        </div>
                        <div className="text-right">
                           <p className="text-sm text-gray-500 dark:text-gray-400">
                              To
                           </p>
                           <p className="font-semibold text-gray-900 dark:text-white">
                              {swapDetails.toAmount} {swapDetails.toToken}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Exchange Rate */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                           Exchange Rate
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                           1 {swapDetails.fromToken} = {swapDetails.rate}{" "}
                           {swapDetails.toToken}
                        </span>
                     </div>
                  </div>

                  {/* Wallet Address Section */}
                  <div className="mb-6">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                           Recipient Wallet
                        </span>
                        <button 
                           onClick={() => setUseCustomWallet(!useCustomWallet)}
                           className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
                        >
                           <FaEdit size={12} />
                           {useCustomWallet ? "Use Connected Wallet" : "Use Custom Wallet"}
                        </button>
                     </div>

                     {!useCustomWallet ? (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                           <FaWallet className="text-gray-500 dark:text-gray-400" />
                           <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                              {authenticated && user?.wallet?.address 
                                 ? truncateAddress(user.wallet.address) 
                                 : "No wallet connected"}
                           </span>
                        </div>
                     ) : (
                        <div className="space-y-2">
                           <input
                              type="text"
                              placeholder="Enter Ethereum wallet address (0x...)"
                              value={customWalletAddress}
                              onChange={handleChangeWalletAddress}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white font-mono placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                           />
                           {walletError && (
                              <p className="text-xs text-red-500 dark:text-red-400">{walletError}</p>
                           )}
                        </div>
                     )}
                  </div>

                  {/* Payment Information */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                     <p className="text-sm text-blue-700 dark:text-blue-300">
                        You'll be redirected to a secure payment page to complete your transaction.
                        Once payment is confirmed, {swapDetails.toToken} will be sent to 
                        {useCustomWallet ? " the custom wallet address" : " your connected wallet"}.
                     </p>
                  </div>

                  {/* Error message if any */}
                  {error && (
                     <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-700 dark:text-red-300">
                           {error}
                        </p>
                     </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                     <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                        Cancel
                     </button>
                     <button
                        onClick={handleConfirmSwap}
                        disabled={isLoading || (!useCustomWallet && !(authenticated && user?.wallet?.address)) || (useCustomWallet && !!walletError)}
                        className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center">
                        {isLoading ? (
                           <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                           </>
                        ) : (
                           "Confirm Swap"
                        )}
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   );
};

export default ConfirmSwapModal;