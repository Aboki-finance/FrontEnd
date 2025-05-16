// components/SwapCard.tsx
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

interface SwapCardProps {
   onSwapInitiate?: (details: SwapDetails) => void;
}

const SwapCard: React.FC<SwapCardProps> = ({ onSwapInitiate }) => {
   const [sendAmount, setSendAmount] = useState("");
   const [receiveAmount, setReceiveAmount] = useState("");
   const [selectedToken, setSelectedToken] = useState<TokenSymbol | null>(null);
   const [selectedCurrency, setSelectedCurrency] =
      useState<CurrencySymbol | null>(null);
   const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
   const [isCurrencySelectOpen, setIsCurrencySelectOpen] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const [swapMode, setSwapMode] = useState<SwapMode>("tokenToCurrency");

   const { login, authenticated, user } = usePrivy();
   const navigate = useNavigate();

   // Create a map of token addresses and decimals
   const tokenConfigs = tokens.reduce((acc, token) => {
      acc[token.symbol] = {
         address: token.address,
         decimals: token.decimals,
      };
      return acc;
   }, {} as Record<string, { address: string; decimals: number }>);

   // Use the hook to fetch all token balances
   const { balances, isConnected } = useTokenBalances(tokenConfigs);

   const handleSendAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (value === "" || /^\d*\.?\d*$/.test(value)) {
         setSendAmount(value);

         const calculatedAmount = calculateReceiveAmount(
            value,
            swapMode,
            selectedToken,
            selectedCurrency
         );
         setReceiveAmount(calculatedAmount);
      }
   };

   const handleTokenSelect = (symbol: string) => {
      setSelectedToken(symbol as TokenSymbol);
      setIsTokenSelectOpen(false);
      setSearchQuery("");
      updateReceiveAmount(sendAmount, symbol as TokenSymbol, selectedCurrency);
   };

   const handleCurrencySelect = (symbol: string) => {
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
      const calculatedAmount = calculateReceiveAmount(
         amount,
         swapMode,
         token,
         currency
      );
      setReceiveAmount(calculatedAmount);
   };

   const handleSwapDirection = () => {
      const newMode: SwapMode =
         swapMode === "tokenToCurrency" ? "currencyToToken" : "tokenToCurrency";
      setSwapMode(newMode);

      if (receiveAmount && sendAmount) {
         setSendAmount(receiveAmount);

         const calculatedAmount = calculateReceiveAmount(
            receiveAmount,
            newMode,
            selectedToken,
            selectedCurrency
         );
         setReceiveAmount(calculatedAmount);
      }
   };

   const handleConnect = async () => {
      try {
         if (!authenticated) {
            await login();
         }

         if (
            authenticated &&
            isSwapValid(
               sendAmount,
               receiveAmount,
               selectedToken,
               selectedCurrency
            )
         ) {
            // Type guard to ensure both values are not null
            if (selectedToken && selectedCurrency) {
               const swapDetails: SwapDetails = {
                  fromToken:
                     swapMode === "tokenToCurrency"
                        ? selectedToken
                        : selectedCurrency,
                  toToken:
                     swapMode === "tokenToCurrency"
                        ? selectedCurrency
                        : selectedToken,
                  fromAmount: parseFloat(sendAmount),
                  toAmount: parseFloat(receiveAmount),
                  rate: getCurrentExchangeRate(
                     swapMode,
                     selectedToken,
                     selectedCurrency
                  ),
               };

               onSwapInitiate && onSwapInitiate(swapDetails);
            }
         } else if (authenticated) {
            navigate("/app");
         }
      } catch (error) {
         console.error("Privy login failed:", error);
      }
   };

   const getTokenBalance = (symbol: TokenSymbol | null): string => {
      if (!authenticated || !symbol || !balances[symbol]) return "0.00";

      const tokenBalance = balances[symbol].balance;
      return balances[symbol].isLoading ? "..." : tokenBalance;
   };

   // Update token objects with real-time balances
   const tokensWithBalances = tokens.map((token) => {
      return {
         ...token,
         balance: getTokenBalance(token.symbol as TokenSymbol),
      };
   });

   const filteredTokens = tokensWithBalances.filter(
      (token) =>
         token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
         token.name.toLowerCase().includes(searchQuery.toLowerCase())
   );

   const filteredCurrencies = currencies.filter(
      (currency) =>
         currency.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
         currency.name.toLowerCase().includes(searchQuery.toLowerCase())
   );

   // Initialize with defaults
   useEffect(() => {
      if (!selectedToken) setSelectedToken("ETH");
      if (!selectedCurrency) setSelectedCurrency("NGN");
   }, []);

   // Recalculate on token/currency selection change
   useEffect(() => {
      if (selectedToken && selectedCurrency && sendAmount) {
         updateReceiveAmount(sendAmount, selectedToken, selectedCurrency);
      }
   }, [selectedToken, selectedCurrency]);

   // Determine what to show in each section based on swap mode
   const sendSection: SectionInfo =
      swapMode === "tokenToCurrency"
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

   const receiveSection: SectionInfo =
      swapMode === "tokenToCurrency"
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

               <div className="pt-3">
                  <button
                     onClick={handleConnect}
                     disabled={
                        authenticated &&
                        !isSwapValid(
                           sendAmount,
                           receiveAmount,
                           selectedToken,
                           selectedCurrency
                        )
                     }
                     className={`w-full py-3 px-4 rounded-3xl font-semibold text-base transition-all ${
                        authenticated &&
                        !isSwapValid(
                           sendAmount,
                           receiveAmount,
                           selectedToken,
                           selectedCurrency
                        )
                           ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                           : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:opacity-90 shadow-md"
                     }`}>
                     {authenticated
                        ? isSwapValid(
                             sendAmount,
                             receiveAmount,
                             selectedToken,
                             selectedCurrency
                          )
                           ? "Swap"
                           : "Enter amount"
                        : "Connect Wallet"}
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
      </div>
   );
};

export default SwapCard;
