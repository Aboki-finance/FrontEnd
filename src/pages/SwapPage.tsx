// src/pages/SwapPage.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SwapCard from "../components/SwapCard";
import Navbar from "../components/Navbar/components/Navbar";

import ConfirmSwapModal from "../components/modals/ConfirmSwapModal";
import TokenToNGNConfirmModal from "../components/modals/TokenToNGNConfirmModal";
import BankDetailsModal from "../components/modals/BankDetailsModal";
import ReviewModal from "../components/modals/ReviewModal";
import SuccessModal from "../components/modals/SuccessModal";
import { SwapContext, SwapDetails, BankDetails } from "../context/SwapContext";
import PrimaryFooter from "../components/Footer";
import { logger } from "../utils/swapUtils";

const SwapPage: React.FC = () => {
   // Modal state
   const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
   const [isTokenToNGNModalOpen, setIsTokenToNGNModalOpen] = useState(false);
   const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false);
   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
   const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
   const [isTransactionSuccess, setIsTransactionSuccess] = useState(true);
   
   // Transaction state
   const [transactionHash, setTransactionHash] = useState<string | null>(null);

   // Swap context state
   const [swapDetails, setSwapDetails] = useState<SwapDetails | null>(null);
   const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

   useEffect(() => {
      document.title = "Aboki | Swap";
   }, []);

   const handleSwapInitiate = (details: SwapDetails) => {
      setSwapDetails(details);
      logger.log('FLOW', 'Swap initiated with details', details);
      
      // Determine which modal to show based on swap direction
      if (details.fromToken === "NGN") {
         // Currency to token flow (existing onramp)
         setIsConfirmModalOpen(true);
      } else {
         // Token to currency flow (new offramp)
         setIsTokenToNGNModalOpen(true);
      }
   };

   const handleConfirmOnramp = () => {
      setIsConfirmModalOpen(false);
      // Further steps are handled by redirect in ConfirmSwapModal
   };
   
   const handleConfirmOfframp = (txHash: string) => {
      setTransactionHash(txHash);
      setIsTokenToNGNModalOpen(false);
      setIsBankDetailsModalOpen(true);
      logger.log('FLOW', `Offramp transaction confirmed with hash: ${txHash}`);
   };

   const handleBankDetailsSubmit = (details: BankDetails) => {
      setBankDetails(details);
      setIsBankDetailsModalOpen(false);
      setIsReviewModalOpen(true);
      logger.log('FLOW', 'Bank details submitted', details);
   };

   const handleFinalConfirm = async () => {
      setIsReviewModalOpen(false);
      logger.log('FLOW', 'Final confirmation submitted');

      // Submit bank details to backend API
      try {
         setIsTransactionSuccess(false); // Set to false until confirmed
         
         // Get the auth token from localStorage
         const authToken = localStorage.getItem("authToken");
         
         if (!authToken) {
            logger.log('ERROR', 'Authentication token not found');
            setIsTransactionSuccess(false);
            setIsSuccessModalOpen(true);
            return;
         }
         
         logger.log('API', 'Submitting bank details to backend');
         
         // Prepare request payload
         const payload = {
            transactionHash: transactionHash,
            bankDetails: {
               accountName: bankDetails?.accountName,
               accountNumber: bankDetails?.accountNumber,
               bankName: bankDetails?.bankName,
               bankCode: bankDetails?.routingNumber, // Using routing number as bank code
               accountType: bankDetails?.accountType
            },
            amount: swapDetails?.toAmount,
            currency: swapDetails?.toToken
         };
         
         const response = await fetch("https://aboki-api.onrender.com/api/ramp/offramp/bank-details", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
         });
         
         const data = await response.json();
         
         if (data.success) {
            logger.log('API', 'Bank details submitted successfully', data);
            setIsTransactionSuccess(true);
         } else {
            logger.log('ERROR', `Bank details submission failed: ${data.message || "Unknown error"}`, data);
            setIsTransactionSuccess(false);
         }
      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : "Unknown error";
         logger.log('EXCEPTION', `Bank details submission error: ${errorMsg}`, error);
         setIsTransactionSuccess(false);
      }
      
      setIsSuccessModalOpen(true);
   };

   const handleTransactionComplete = () => {
      setIsSuccessModalOpen(false);
      // Reset all state
      setSwapDetails(null);
      setBankDetails(null);
      setTransactionHash(null);
      logger.log('FLOW', 'Transaction flow completed, returning to initial state');
   };

   return (
      <SwapContext.Provider value={{ swapDetails, bankDetails }}>
         <div className="flex flex-col min-h-screen bg-[#ffffff] text-black">
            <Navbar />
            <main className="flex-grow mt-24">
               <div className="container mx-auto px-4 py-8">
                  <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.5 }}>
                     <SwapCard onSwapInitiate={handleSwapInitiate} />
                  </motion.div>
               </div>
            </main>

            <PrimaryFooter />

            {/* Modals */}
            {/* Currency to Token (Onramp) Modal */}
            <ConfirmSwapModal
               isOpen={isConfirmModalOpen}
               onClose={() => setIsConfirmModalOpen(false)}
               onConfirm={handleConfirmOnramp}
               swapDetails={swapDetails}
            />
            
            {/* Token to Currency (Offramp) Modal */}
            <TokenToNGNConfirmModal
               isOpen={isTokenToNGNModalOpen}
               onClose={() => setIsTokenToNGNModalOpen(false)}
               onSuccess={handleConfirmOfframp}
               swapDetails={swapDetails}
            />

            <BankDetailsModal
               isOpen={isBankDetailsModalOpen}
               onClose={() => setIsBankDetailsModalOpen(false)}
               onSubmit={handleBankDetailsSubmit}
            />

            <ReviewModal
               isOpen={isReviewModalOpen}
               onClose={() => setIsReviewModalOpen(false)}
               onConfirm={handleFinalConfirm}
               swapDetails={swapDetails}
               bankDetails={bankDetails}
            />

            <SuccessModal
               isOpen={isSuccessModalOpen}
               onClose={handleTransactionComplete}
               isSuccess={isTransactionSuccess}
               transactionId={transactionHash || `txn_${Date.now()}`}
            />
         </div>
      </SwapContext.Provider>
   );
};

export default SwapPage;