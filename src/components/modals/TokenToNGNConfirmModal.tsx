// src/components/modals/TokenToNGNConfirmModal.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { FaEthereum, FaDollarSign, FaWallet, FaSpinner } from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi";
import { SwapDetails } from "../../context/SwapContext";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { useTokenSwap } from "../../contracts/hooks/useTokenSwap";
import { logger } from "../../utils/swapUtils";

interface TokenToNGNConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (txHash: string) => void;
    onConfirm?: () => void;
    swapDetails: SwapDetails | null;
    approvalTxHash?: string | null;
    swapTxHash?: string | null;
    isApproving?: boolean;
    isSwapping?: boolean;
    isWrappingETH?: boolean; // Add this new prop
    error?: string | null;
  }


const TokenToNGNConfirmModal: React.FC<TokenToNGNConfirmModalProps> = ({
   isOpen,
   onClose,
   onSuccess,
   swapDetails,
}) => {
   const [error, setError] = useState<string | null>(null);
   
   // Get user authentication context
   const { user, authenticated } = usePrivy();
   const { address: walletAddress } = useAccount();
   
   // Get token swap functionality
   const { 
     approveTokenSpending,
     createTokenOrder,
     createOrderWithSwapAndConversion,
     createOrderWithPath,
     isLoading,
     isWaitingForTx,
     isTxSuccess,
     error: swapError,
     txHash
   } = useTokenSwap();
   
   // Reset state when modal opens
   useEffect(() => {
      if (isOpen && swapDetails) {
         setError(null);
         
         // Check if user is authenticated and has a wallet
         if (!authenticated || !walletAddress) {
            setError("Please connect your wallet to proceed.");
         }
         
         logger.log('MODAL', 'Token to NGN confirmation modal opened', swapDetails);
      }
   }, [isOpen, swapDetails, authenticated, walletAddress]);
   
   // Handle transaction success
   useEffect(() => {
      if (isTxSuccess && txHash) {
         logger.log('TRANSACTION', `Transaction confirmed: ${txHash}`);
         onSuccess(txHash);
      }
   }, [isTxSuccess, txHash, onSuccess]);
   
   // Update error from swap hook
   useEffect(() => {
      if (swapError) {
         setError(swapError);
      }
   }, [swapError]);
   
   if (!swapDetails) return null;
   
   // Get the appropriate icon for the token
   const getTokenIcon = (token: string) => {
      if (token === "ETH" || token === "WETH") {
         return <FaEthereum className="text-blue-600 dark:text-blue-400" size={24} />;
      } else if (token.includes("USD") || token === "USDC" || token === "USDT") {
         return <FaDollarSign className="text-green-600 dark:text-green-400" size={24} />;
      } else if (token === "NGN") {
         return <span className="text-green-600 dark:text-green-400 font-bold text-lg">₦</span>;
      } else {
         return <FaDollarSign className="text-green-600 dark:text-green-400" size={24} />;
      }
   };
   
   const handleConfirm = async () => {
      try {
         if (!swapDetails || !walletAddress) {
            setError("Missing swap details or wallet not connected");
            return;
         }
         
         const { fromToken, toToken, fromAmount, rate } = swapDetails;
         
         // First approve token if needed (skip ETH as it's native)
         if (fromToken !== "ETH") {
            logger.log('TRANSACTION', `Approving ${fromToken} before swap`);
            const isApproved = await approveTokenSpending(
               fromToken,
               fromAmount.toString()
            );
            
            if (!isApproved) {
               throw new Error("Token approval failed");
            }
            
            logger.log('TRANSACTION', `${fromToken} approved successfully`);
         }
         
         // Choose the appropriate contract function based on token
         let txHash: string | null = null;
         
         if (fromToken === "ETH") {
            // For ETH, use createOrderWithSwap
            txHash = await createOrderWithSwapAndConversion({
               tokenSymbol: fromToken,
               tokenAmount: fromAmount.toString(),
               rate: rate,
               targetCurrency: toToken
            });
         } else if (fromToken === "USDC") {
            // For USDC, use simple createOrder
            txHash = await createTokenOrder({
               tokenSymbol: fromToken,
               tokenAmount: fromAmount.toString(),
               rate: rate,
               targetCurrency: toToken
            });
         } else {
            // For other tokens (USDT, ZORA, DEGEN), use createOrderWithCustomPath
            txHash = await createOrderWithPath({
               tokenSymbol: fromToken,
               tokenAmount: fromAmount.toString(),
               minOutputAmount: "0", // We'll let the contract handle slippage
               rate: rate,
               targetCurrency: toToken
            });
         }
         
         if (!txHash) {
            throw new Error("Failed to create order");
         }
         
         logger.log('TRANSACTION', `Order created successfully with hash: ${txHash}`);
         
         // Store relevant order details in localStorage for tracking
         localStorage.setItem("currentOrderId", txHash);
         localStorage.setItem("orderStatus", "PENDING");
         localStorage.setItem("orderType", "TOKEN_TO_NGN");
         
      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : "Unknown error";
         logger.log('ERROR', `Order creation failed: ${errorMsg}`, error);
         setError(`Failed to create order: ${errorMsg}`);
      }
   };
   
   // Function to truncate address for display
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
                        Confirm Token Swap
                     </h2>
                     <button
                        onClick={onClose}
                        disabled={isLoading || isWaitingForTx}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50">
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
                           Your Wallet Address
                        </span>
                     </div>

                     <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <FaWallet className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                           {walletAddress 
                              ? truncateAddress(walletAddress) 
                              : "Wallet not connected"}
                        </span>
                     </div>
                  </div>

                  {/* Transaction Information */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                     <p className="text-sm text-blue-700 dark:text-blue-300">
                        You'll be asked to confirm this transaction in your wallet. Once confirmed, your tokens will be swapped and you'll receive NGN to your bank account.
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

                  {/* Transaction status if waiting */}
                  {(isWaitingForTx || isTxSuccess) && txHash && (
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2">
                           {isWaitingForTx ? (
                              <FaSpinner className="animate-spin text-indigo-600 dark:text-indigo-400" />
                           ) : (
                              <span className="text-green-600 dark:text-green-400">✓</span>
                           )}
                           <p className="text-sm text-indigo-700 dark:text-indigo-300">
                              {isWaitingForTx 
                                 ? "Transaction in progress..." 
                                 : "Transaction confirmed!"
                              }
                           </p>
                        </div>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                           {truncateAddress(txHash)}
                        </p>
                     </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                     <button
                        onClick={onClose}
                        disabled={isLoading || isWaitingForTx}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                        Cancel
                     </button>
                     <button
                        onClick={handleConfirm}
                        disabled={isLoading || isWaitingForTx || !walletAddress || !!error}
                        className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center">
                        {isLoading || isWaitingForTx ? (
                           <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {isWaitingForTx ? "Confirming..." : "Processing..."}
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

export default TokenToNGNConfirmModal;
