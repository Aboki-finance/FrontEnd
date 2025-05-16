import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useLiquidity } from "../../../context/LiquidityContext";
import NavigationButtons from "../common/NavigationButtons";
import CurrencySelector from "../common/CurrencySelector";
import { CurrencySymbol } from "../../../types/SwapTypes";
import {
   FaMoneyBillWave,
   FaExclamationTriangle,
   FaCopy,
   FaCheck,
} from "react-icons/fa";

// Available currencies with flags
const currencies = [
   {
      symbol: "NGN" as CurrencySymbol,
      name: "Nigerian Naira",
      flag: "🇳🇬",
      available: true,
   },
   {
      symbol: "USD" as CurrencySymbol,
      name: "US Dollar",
      flag: "🇺🇸",
      available: false,
   },
   {
      symbol: "GBP" as CurrencySymbol,
      name: "British Pound",
      flag: "🇬🇧",
      available: false,
   },
   {
      symbol: "GHS" as CurrencySymbol,
      name: "Ghanaian Cedi",
      flag: "🇬🇭",
      available: false,
   },
];

// Validation schema
const FundingSchema = Yup.object().shape({
   amount: Yup.number()
      .positive("Amount must be positive")
      .min(10000, "Minimum amount is 10,000 NGN")
      .required("Amount is required"),
});

const VirtualAccountFunding: React.FC = () => {
   const { onboardingData, updateOnboardingData, updateOnboardingStep } =
      useLiquidity();

   const [selectedCurrency, setSelectedCurrency] =
      useState<CurrencySymbol>("NGN");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [copied, setCopied] = useState(false);
   const [virtualAccount, setVirtualAccount] = useState({
      accountNumber: "1234567890",
      bankName: "Aboki Bank",
      accountName: "Aboki - Makeem",
      reference: `Aboki${Math.floor(Math.random() * 1000000)}`,
   });

   // Initial form values
   const initialValues = {
      amount: onboardingData.funding?.amount || "",
   };

   // Generate virtual account
   const generateVirtualAccount = (amount: number) => {
      setLoading(true);
      setError(null);

      // Ensure amount is a number
      const numericAmount = Number(amount);

      // Simulate API call to generate virtual account
      setTimeout(() => {
         const newVirtualAccount = {
            accountNumber: "1234567890",
            bankName: "Aboki Bank",
            accountName: "Aboki - Makeem",
            reference: `Aboki${Math.floor(Math.random() * 1000000)}`,
         };

         setVirtualAccount(newVirtualAccount);

         updateOnboardingData({
            funding: {
               amount: numericAmount,
            },
            virtualAccount: newVirtualAccount,
         });

         setLoading(false);
      }, 1500);
   };

   // Handle form submission
   const handleSubmit = (values: typeof initialValues) => {
      // Ensure amount is a number
      const amount = Number(values.amount);
      generateVirtualAccount(amount);
   };

   // Handle currency selection
   const handleCurrencySelect = (currency: CurrencySymbol) => {
      setSelectedCurrency(currency);
   };

   // Copy account details to clipboard
   const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
         setCopied(false);
      }, 2000);
   };

   // Continue to next step
   const handleContinue = () => {
      updateOnboardingStep("CRYPTO_DESTINATION");
   };

   // Handle back button
   const handleBack = () => {
      updateOnboardingStep("KYC_VERIFICATION");
   };

   // Check if virtual account details are available
   const hasVirtualAccount =
      !!onboardingData.virtualAccount || !!virtualAccount;

   return (
      <div className="max-w-lg mx-auto">
         <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
               Fund Your Position
            </h2>
            <p className="mt-2 text-gray-600">
               Provide fiat currency to your liquidity position
            </p>
         </div>

         {!hasVirtualAccount ? (
            <Formik
               initialValues={initialValues}
               validationSchema={FundingSchema}
               onSubmit={handleSubmit}>
               {({ isValid, dirty, values, setFieldValue, submitForm }) => (
                  <Form className="space-y-6">
                     <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                           Currency
                           <span className="text-red-500 ml-1">*</span>
                        </label>

                        <CurrencySelector
                           currencies={currencies}
                           selectedCurrency={selectedCurrency}
                           onSelect={handleCurrencySelect}
                        />

                        {selectedCurrency !== "NGN" && (
                           <p className="text-sm text-yellow-600">
                              Only NGN is currently supported. Other currencies
                              coming soon.
                           </p>
                        )}
                     </div>

                     <div className="space-y-2">
                        <label
                           htmlFor="amount"
                           className="block text-sm font-medium text-gray-700">
                           Amount ({selectedCurrency})
                           <span className="text-red-500 ml-1">*</span>
                        </label>

                        <div className="relative rounded-md shadow-sm">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaMoneyBillWave className="text-gray-400" />
                           </div>
                           <Field
                              type="number"
                              name="amount"
                              id="amount"
                              className="block w-full pl-10 pr-20 py-2 rounded-md focus:ring-purple-500 focus:border-purple-500 border-gray-300"
                              placeholder="Enter amount"
                              min="10000"
                              step="1000"
                              disabled={selectedCurrency !== "NGN"}
                              value={values.amount === 0 ? "" : values.amount}
                              onChange={(
                                 e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                 const value =
                                    e.target.value === ""
                                       ? 0
                                       : Number(e.target.value);
                                 setFieldValue("amount", value);
                              }}
                           />
                           <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">
                                 {selectedCurrency}
                              </span>
                           </div>
                        </div>
                        <ErrorMessage
                           name="amount"
                           component="div"
                           className="mt-1 text-sm text-red-600"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                           Minimum amount: 10,000 NGN
                        </p>
                     </div>

                     {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                           <div className="flex">
                              <div className="flex-shrink-0 text-red-500">
                                 <FaExclamationTriangle className="h-5 w-5" />
                              </div>
                              <div className="ml-3">
                                 <p className="text-sm text-red-800">{error}</p>
                              </div>
                           </div>
                        </div>
                     )}

                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                           <div className="flex-shrink-0 text-blue-500">
                              <svg
                                 className="h-5 w-5"
                                 xmlns="http://www.w3.org/2000/svg"
                                 viewBox="0 0 20 20"
                                 fill="currentColor">
                                 <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                                    clipRule="evenodd"
                                 />
                              </svg>
                           </div>
                           <div className="ml-3 text-sm text-blue-800">
                              <p>
                                 We'll generate a virtual account for you to
                                 deposit funds. The funds will be used to
                                 provide liquidity on the platform.
                              </p>
                           </div>
                        </div>
                     </div>

                     <NavigationButtons
                        onNext={submitForm}
                        onBack={handleBack}
                        nextDisabled={
                           !(isValid && dirty) ||
                           selectedCurrency !== "NGN" ||
                           loading
                        }
                        loading={loading}
                        nextLabel="Generate Account"
                     />
                  </Form>
               )}
            </Formik>
         ) : (
            <div className="space-y-6">
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">
                     Virtual Account Details
                  </h3>

                  <div className="space-y-4">
                     <div>
                        <p className="text-sm text-gray-500">Amount to Fund</p>
                        <p className="font-semibold">
                           {onboardingData.funding?.amount ||
                              initialValues.amount}{" "}
                           {selectedCurrency}
                        </p>
                     </div>

                     <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-sm text-gray-500">Bank Name</p>
                           <button
                              type="button"
                              className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                              onClick={() =>
                                 copyToClipboard(virtualAccount.bankName)
                              }>
                              {copied ? (
                                 <>
                                    <FaCheck className="mr-1" />
                                    Copied
                                 </>
                              ) : (
                                 <>
                                    <FaCopy className="mr-1" />
                                    Copy
                                 </>
                              )}
                           </button>
                        </div>
                        <p className="font-semibold">
                           {virtualAccount.bankName}
                        </p>
                     </div>

                     <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-sm text-gray-500">
                              Account Number
                           </p>
                           <button
                              type="button"
                              className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                              onClick={() =>
                                 copyToClipboard(virtualAccount.accountNumber)
                              }>
                              {copied ? (
                                 <>
                                    <FaCheck className="mr-1" />
                                    Copied
                                 </>
                              ) : (
                                 <>
                                    <FaCopy className="mr-1" />
                                    Copy
                                 </>
                              )}
                           </button>
                        </div>
                        <p className="font-semibold">
                           {virtualAccount.accountNumber}
                        </p>
                     </div>

                     <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-sm text-gray-500">Account Name</p>
                           <button
                              type="button"
                              className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                              onClick={() =>
                                 copyToClipboard(virtualAccount.accountName)
                              }>
                              {copied ? (
                                 <>
                                    <FaCheck className="mr-1" />
                                    Copied
                                 </>
                              ) : (
                                 <>
                                    <FaCopy className="mr-1" />
                                    Copy
                                 </>
                              )}
                           </button>
                        </div>
                        <p className="font-semibold">
                           {virtualAccount.accountName}
                        </p>
                     </div>

                     <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-sm text-gray-500">
                              Reference Code (Important)
                           </p>
                           <button
                              type="button"
                              className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                              onClick={() =>
                                 copyToClipboard(virtualAccount.reference)
                              }>
                              {copied ? (
                                 <>
                                    <FaCheck className="mr-1" />
                                    Copied
                                 </>
                              ) : (
                                 <>
                                    <FaCopy className="mr-1" />
                                    Copy
                                 </>
                              )}
                           </button>
                        </div>
                        <p className="font-semibold">
                           {virtualAccount.reference}
                        </p>
                     </div>
                  </div>
               </div>

               <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                     <div className="flex-shrink-0 text-yellow-600">
                        <svg
                           className="h-5 w-5"
                           xmlns="http://www.w3.org/2000/svg"
                           viewBox="0 0 20 20"
                           fill="currentColor">
                           <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                           />
                        </svg>
                     </div>
                     <div className="ml-3 text-sm text-yellow-800">
                        <p>
                           Please make the transfer with the exact amount and
                           reference code. This helps us identify your
                           transaction. You can continue to the next step while
                           we process your payment.
                        </p>
                     </div>
                  </div>
               </div>

               <NavigationButtons
                  onNext={handleContinue}
                  onBack={handleBack}
                  nextLabel="Continue to Next Step"
               />
            </div>
         )}
      </div>
   );
};

export default VirtualAccountFunding;
