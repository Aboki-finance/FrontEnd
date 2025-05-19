import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar/components/Navbar";
import PrimaryFooter from "../components/Footer";
import { usePrivy } from "@privy-io/react-auth";
import { 
  FaExchangeAlt, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaFilter, 
  FaDownload,
  FaSearch,
  FaWallet,
  FaSync,
  FaArrowRight,
  FaInfoCircle,
  FaChevronLeft,
  FaWhatsapp,
  FaTelegram
} from "react-icons/fa";
import { format } from "date-fns";
import { IoClose } from "react-icons/io5";

interface Transaction {
  _id: string;
  type: "onramp" | "offramp" | "swap";
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  status: "completed" | "pending" | "failed";
  createdAt: string;
  updatedAt: string;
  notes?: string;
  paymentReference?: string;
  exchangeRate?: number;
  walletAddress?: string;
  recipientWalletAddress?: string;
  expiresAt?: string;
}

interface TransactionResponse {
  success: boolean;
  orders: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
}

interface FilterOptions {
  status: "all" | "completed" | "pending" | "failed";
  type: "all" | "onramp" | "offramp" | "swap";
  dateRange: "all" | "today" | "week" | "month" | "custom";
}

const ActivityPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [perPage] = useState<number>(10); // Setting fixed page size to 10
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    type: "all",
    dateRange: "all"
  });
  
  // Get user authentication from Privy
  const { user, authenticated } = usePrivy();

  // Set page title
  useEffect(() => {
    document.title = "Aboki | Transaction Activity";
  }, []);

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if user is authenticated
        const authToken = localStorage.getItem("authToken");
        
        if (!authToken && !authenticated) {
          setError("Authentication required. Please connect your wallet to view transactions.");
          setIsLoading(false);
          return;
        }
        
        // Get wallet address for API calls
        const walletAddress = user?.wallet?.address || localStorage.getItem("walletAddress");
        
        if (!walletAddress) {
          setError("No wallet address found. Please connect your wallet to view transactions.");
          setIsLoading(false);
          return;
        }
        
        // Build query params for filters
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: perPage.toString()
        });
        
        // Add filters if set
        if (filters.status !== "all") {
          queryParams.append("status", filters.status);
        }
        
        if (filters.type !== "all") {
          queryParams.append("type", filters.type);
        }
        
        // Make API call
        const response = await fetch(`https://aboki-api.onrender.com/api/ramp/orders?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json() as TransactionResponse;
        
        if (!data.success) {
          throw new Error(data.message || "Failed to fetch transactions");
        }
        
        setTransactions(data.orders);
        setTotalPages(data.pagination.pages);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError("Failed to load transactions. Please try again.");
        setIsLoading(false);
        
        // Auto-retry logic with exponential backoff
        if (retryCount < 3) {
          const backoffTime = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, backoffTime);
        }
      }
    };
    
    fetchTransactions();
  }, [currentPage, authenticated, retryCount, filters, user]);

  // Function to retry loading if error occurs
  const handleRetry = () => {
    setRetryCount(0);
  };

  const getStatusIcon = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return <FaCheckCircle className="text-green-500" />;
      case "pending":
        return <FaClock className="text-yellow-500" />;
      case "failed":
        return <FaTimesCircle className="text-red-500" />;
    }
  };

  const getStatusColor = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      case "failed":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
    }
  };

  const getTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "onramp":
        return <FaArrowRight className="text-purple-500" />;
      case "offramp":
        return <FaArrowRight className="rotate-180 text-blue-500" />;
      case "swap":
        return <FaExchangeAlt className="text-indigo-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy • h:mm a");
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "NGN") {
      return `₦${amount.toLocaleString()}`;
    } else {
      return `${amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${currency}`;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
  };

  const handleFilterToggle = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterChange = (filter: Partial<FilterOptions>) => {
    setFilters({
      ...filters,
      ...filter
    });
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality here
    // In a real app, you would make an API call with the search query
  };

  const truncateWalletAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle WhatsApp contact
  const handleWhatsAppContact = (transaction: Transaction) => {
    // Format message with transaction details
    const message = `Hello Aboki Support, I need help with my failed transaction (ID: ${transaction._id}). Amount: ${formatCurrency(transaction.sourceAmount, transaction.sourceCurrency)} to ${formatCurrency(transaction.targetAmount, transaction.targetCurrency)}. Date: ${formatDate(transaction.createdAt)}`;
    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/2348123456789?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Handle Telegram contact
  const handleTelegramContact = (transaction: Transaction) => {
    // Format message with transaction details
    const message = `Hello Aboki Support, I need help with my failed transaction (ID: ${transaction._id}). Amount: ${formatCurrency(transaction.sourceAmount, transaction.sourceCurrency)} to ${formatCurrency(transaction.targetAmount, transaction.targetCurrency)}. Date: ${formatDate(transaction.createdAt)}`;
    // Open Telegram with pre-filled message
    window.open(`https://t.me/AbokiSupport?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Pagination component
  const Pagination = () => {
    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className={`px-3 py-1 rounded-md ${
            currentPage <= 1
              ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700"
              : "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
          }`}
        >
          Previous
        </button>
        
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNumber = currentPage <= 3
            ? i + 1
            : currentPage + i - 2;
            
          if (pageNumber > totalPages) return null;
          
          return (
            <button
              key={pageNumber}
              onClick={() => handlePageChange(pageNumber)}
              className={`w-8 h-8 rounded-md ${
                pageNumber === currentPage
                  ? "bg-purple-600 text-white dark:bg-purple-500"
                  : "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}
        
        <button
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className={`px-3 py-1 rounded-md ${
            currentPage >= totalPages
              ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700"
              : "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  // Transaction Details Modal
  const TransactionDetailsModal = ({ transaction }: { transaction: Transaction }) => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleCloseDetails}
                className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FaChevronLeft />
              </button>
              <h2 className="text-xl font-bold">Transaction Details</h2>
            </div>
            <button
              onClick={handleCloseDetails}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <IoClose size={24} />
            </button>
          </div>
          
          <div className="p-6">
            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(
                  transaction.status
                )}`}
              >
                {getStatusIcon(transaction.status)}
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </span>
            </div>
            
            {/* Transaction Amount */}
            <div className="text-center mb-6">
              <h3 className="text-lg text-gray-600 dark:text-gray-400">
                {transaction.type === "onramp" ? "Buy" : transaction.type === "offramp" ? "Sell" : "Swap"}
              </h3>
              <div className="flex items-center justify-center gap-3 mt-2">
                <p className="text-2xl font-bold">
                  {formatCurrency(transaction.sourceAmount, transaction.sourceCurrency)}
                </p>
                <FaArrowRight className="text-gray-500" />
                <p className="text-2xl font-bold">
                  {formatCurrency(transaction.targetAmount, transaction.targetCurrency)}
                </p>
              </div>
              {transaction.exchangeRate && (
                <p className="text-sm text-gray-500 mt-1">
                  Rate: 1 {transaction.sourceCurrency} = {transaction.exchangeRate.toFixed(6)} {transaction.targetCurrency}
                </p>
              )}
            </div>
            
            {/* Transaction Details */}
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Transaction ID</span>
                <span className="font-medium text-right">{transaction._id}</span>
              </div>
              
              {transaction.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payment Reference</span>
                  <span className="font-medium text-right">{transaction.paymentReference}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Date</span>
                <span className="font-medium text-right">{formatDate(transaction.createdAt)}</span>
              </div>
              
              {transaction.walletAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Wallet Address</span>
                  <span className="font-medium text-right">{truncateWalletAddress(transaction.walletAddress)}</span>
                </div>
              )}
              
              {transaction.recipientWalletAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Recipient Address</span>
                  <span className="font-medium text-right">{truncateWalletAddress(transaction.recipientWalletAddress)}</span>
                </div>
              )}
              
              {transaction.notes && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FaInfoCircle className="text-gray-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                onClick={handleCloseDetails}
              >
                Close
              </button>
              
              {transaction.status === "failed" && (
                <button
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  onClick={() => {
                    // Determine which app route to navigate to based on transaction type
                    let route = "";
                    
                    if (transaction.type === "onramp") {
                      route = "/app";
                    } else if (transaction.type === "offramp") {
                      route = "/app";
                    } else if (transaction.type === "swap") {
                      route = "/app";
                    }
                    
                    // Add query parameters for pre-filling the form
                    const params = new URLSearchParams();
                    params.append("amount", transaction.sourceAmount.toString());
                    params.append("fromCurrency", transaction.sourceCurrency);
                    params.append("toCurrency", transaction.targetCurrency);
                    params.append("retryFromId", transaction._id);
                    
                    // Close the modal and navigate to the appropriate route
                    handleCloseDetails();
                    window.location.href = `${route}?${params.toString()}`;
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
            
            {/* Contact Support Options - Only shown for failed transactions */}
            {transaction.status === "failed" && (
              <div className="mt-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                  <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
                    Need help with this transaction?
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Contact our support team directly for assistance with this failed transaction.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleWhatsAppContact(transaction)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FaWhatsapp size={18} />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleTelegramContact(transaction)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <FaTelegram size={18} />
                      Telegram
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Filter Panel
  const FilterPanel = () => {
    return (
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", "completed", "pending", "failed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleFilterChange({ status: status as any })}
                      className={`px-3 py-1 rounded-md text-sm ${
                        filters.status === status
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", "onramp", "offramp", "swap"].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleFilterChange({ type: type as any })}
                      className={`px-3 py-1 rounded-md text-sm ${
                        filters.type === type
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {type === "all" 
                        ? "All" 
                        : type === "onramp" 
                          ? "Buy" 
                          : type === "offramp" 
                            ? "Sell" 
                            : "Swap"}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", "today", "week", "month"].map((range) => (
                    <button
                      key={range}
                      onClick={() => handleFilterChange({ dateRange: range as any })}
                      className={`px-3 py-1 rounded-md text-sm ${
                        filters.dateRange === range
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {range === "all" 
                        ? "All Time" 
                        : range === "today" 
                          ? "Today" 
                          : range === "week" 
                            ? "This Week" 
                            : "This Month"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Loading Spinner Component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
    </div>
  );

  // Empty State Component
  const EmptyState = () => (
    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <div className="flex justify-center mb-4">
        <FaWallet className="text-gray-400 text-4xl" />
      </div>
      <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No transactions yet</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Your transaction history will appear here once you start using Aboki.
      </p>
      <button 
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        onClick={() => window.location.href = "/app"}
      >
        Make Your First Transaction
      </button>
    </div>
  );

  // Error State Component
  const ErrorState = () => (
    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <div className="flex justify-center mb-4">
        <FaTimesCircle className="text-red-500 text-4xl" />
      </div>
      <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
        Failed to load transactions
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {error || "There was an error loading your transactions. Please try again."}
      </p>
      <button
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        onClick={handleRetry}
      >
        <div className="flex items-center gap-2">
          <FaSync />
          Try Again
        </div>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
      <Navbar />
      
      <main className="flex-grow mt-24">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <h1 className="text-2xl font-bold mb-4 md:mb-0">Transaction History</h1>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="w-full sm:w-64 px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  >
                    <FaSearch />
                  </button>
                </form>
                
                {/* Filter Button */}
                <button
                  onClick={handleFilterToggle}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isFilterOpen
                      ? "bg-purple-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <FaFilter />
                  Filters
                </button>
                
                {/* Export Button */}
                <button
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FaDownload />
                  Export
                </button>
              </div>
            </div>
            
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>
                Showing {transactions.length > 0 ? (currentPage - 1) * perPage + 1 : 0} - {Math.min(currentPage * perPage, (currentPage - 1) * perPage + transactions.length)} of {totalPages * perPage} transactions
              </span>
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            {/* Filter Panel */}
            <FilterPanel />
            
            {/* Transaction List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mt-4">
              {isLoading ? (
                <LoadingSpinner />
              ) : error ? (
                <ErrorState />
              ) : transactions.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            {getTypeIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(transaction.sourceAmount, transaction.sourceCurrency)}
                              </p>
                              <span className="text-gray-400">→</span>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(transaction.targetAmount, transaction.targetCurrency)}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              transaction.status
                            )}`}
                          >
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                          {getStatusIcon(transaction.status)}
                        </div>
                      </div>
                      <div className="mt-2 pl-14">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Transaction ID: {transaction._id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
            
            {/* Pagination */}
            {!isLoading && !error && transactions.length > 0 && <Pagination />}
          </motion.div>
        </div>
      </main>
      
      {/* Transaction Details Modal */}
      {selectedTransaction && <TransactionDetailsModal transaction={selectedTransaction} />}
      
      <PrimaryFooter />
    </div>
  );
};

export default ActivityPage;