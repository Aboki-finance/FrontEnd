import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { usePrivy } from "@privy-io/react-auth";
import axios from 'axios';

// API URL from environment variables with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://aboki-api.onrender.com/api';

// Type definitions
interface Order {
  _id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  type: string;
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  recipientWalletAddress?: string;
  transactionHash?: string;
  completedAt?: string;
  notes?: string;
}

interface CallbackResult {
  success: boolean;
  message: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Support contact information
const SUPPORT_CONTACTS = {
  telegram: "@AbokiSupport",
  whatsapp: "+2348012345678" // Replace with actual WhatsApp number
};

const PaymentSuccessPage = () => {
  // Get URL parameters using React Router
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const paymentReference = searchParams.get('paymentReference');
  const navigate = useNavigate();
  
  // Get Privy authentication context
  const { user, authenticated } = usePrivy();
  
  // State management
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackResult, setCallbackResult] = useState<CallbackResult | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const logWithDetails = (category: string, message: string, data?: any) => {
    console.log(`[${category}] ${message}`, data || '');
  };

  // Function to create a new authentication token - defined outside of useEffect
  const createAuthToken = useCallback(async (walletAddress: string) => {
    try {
      logWithDetails('API', `Creating auth token for wallet: ${walletAddress}`);
      
      const response = await axios.post(
        `${API_BASE_URL}/ramp/auth/direct-auth`,
        { walletAddress }
      );
      
      if (response.data.success && response.data.data && response.data.data.token) {
        const newToken = response.data.data.token;
        
        // Store token in localStorage
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('walletAddress', walletAddress);
        
        // Update state
        setAuthToken(newToken);
        
        logWithDetails('AUTH', 'Successfully created and stored new auth token');
        return newToken;
      } else {
        throw new Error(response.data.message || 'Failed to create authentication token');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Authentication failed';
      logWithDetails('ERROR', `Auth token creation failed: ${errorMsg}`, err);
      throw err;
    }
  }, []);

  // Initialize authentication token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First try to get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (token) {
          setAuthToken(token);
          logWithDetails('AUTH', 'Using existing auth token from localStorage');
          return;
        }
        
        // If no token and user is authenticated with Privy, create a new token
        if (authenticated && user?.wallet?.address) {
          logWithDetails('AUTH', 'No token found in localStorage, creating new token');
          await createAuthToken(user.wallet.address);
        } else {
          logWithDetails('WARNING', 'No auth token available and user not authenticated with Privy');
        }
      } catch (error) {
        logWithDetails('ERROR', 'Auth initialization error', error);
        // Continue without auth if this fails - we'll handle it in the API calls
      }
    };
    
    initializeAuth();
  }, [authenticated, user, createAuthToken]);

  // Fetch order details - defined as useCallback to prevent unnecessary re-renders
  const fetchOrderDetails = useCallback(async () => {
    if (!orderId || !paymentReference) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      logWithDetails('API', `Fetching order details for orderId: ${orderId}`);
      
      // Get auth token from state or localStorage as fallback
      const token = authToken || localStorage.getItem('authToken');
      
      const response = await axios.get(`${API_BASE_URL}/ramp/orders/${orderId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.data && response.data.success && response.data.order) {
        setOrder(response.data.order);
        logWithDetails('API', `Successfully fetched order: ${response.data.order.status}`);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch order details');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMsg);
      logWithDetails('ERROR', `Order fetch error: ${errorMsg}`, err);
    } finally {
      setLoading(false);
    }
  }, [orderId, paymentReference, authToken]);

  // Fetch order on component mount and when auth token changes
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Handler for payment verification
  const handleVerifyPayment = async () => {
    if (!order || !paymentReference) return;
    
    try {
      setCallbackLoading(true);
      logWithDetails('API', `Manually verifying payment for reference: ${paymentReference}`);
      
      // Get token from state or localStorage
      const token = authToken || localStorage.getItem('authToken');
      
      const response = await axios.post(
        `${API_BASE_URL}/ramp/payment/callback`, 
        {
          paymentReference,
          paymentStatus: 'PAID',
          paidAmount: order.sourceAmount
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          }
        }
      );
      
      if (response.data && response.data.success) {
        setCallbackResult({ 
          success: true, 
          message: response.data.message || 'Payment verification completed'
        });
        
        // Refresh order details after a short delay
        setTimeout(() => {
          fetchOrderDetails();
        }, 2000);
      } else {
        throw new Error(response.data?.message || 'Payment verification failed');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to verify payment';
      setCallbackResult({ success: false, message: errorMsg });
      logWithDetails('ERROR', `Payment verification error: ${errorMsg}`, err);
    } finally {
      setCallbackLoading(false);
    }
  };

  // Auto-trigger payment callback for pending orders - but only do this once
  useEffect(() => {
    const triggerPaymentCallback = async () => {
      if (!order || !paymentReference || order.status !== 'pending' || callbackLoading || callbackResult) {
        return;
      }
      
      try {
        setCallbackLoading(true);
        logWithDetails('API', `Auto-triggering payment callback for reference: ${paymentReference}`);
        
        // Get token from state or localStorage
        const token = authToken || localStorage.getItem('authToken');
        
        const response = await axios.post(
          `${API_BASE_URL}/ramp/payment/callback`, 
          {
            paymentReference,
            paymentStatus: 'PAID',
            paidAmount: order.sourceAmount
          },
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : ''
            }
          }
        );
        
        if (response.data && response.data.success) {
          setCallbackResult({ 
            success: true, 
            message: response.data.message || 'Payment verification completed'
          });
          
          // Refresh order details after a short delay
          setTimeout(() => {
            fetchOrderDetails();
          }, 2000);
        } else {
          throw new Error(response.data?.message || 'Payment verification failed');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to verify payment';
        setCallbackResult({ success: false, message: errorMsg });
        logWithDetails('ERROR', `Auto-payment verification error: ${errorMsg}`, err);
      } finally {
        setCallbackLoading(false);
      }
    };
    
    triggerPaymentCallback();
  }, [order, paymentReference, callbackLoading, callbackResult, authToken, fetchOrderDetails]);

  // Countdown for redirect
  useEffect(() => {
    if (countdown > 0 && order?.status === 'completed') {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && order?.status === 'completed') {
      navigate('/activity');
    }
  }, [countdown, order, navigate]);

  // Format currency amount
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'NGN') {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    } else if (currency === 'USDC') {
      return `${amount.toFixed(6)} USDC`;
    } else if (currency === 'ETH') {
      return `${amount.toFixed(6)} ETH`;
    }
    return amount.toString();
  };

  // Manual refresh handler
  const handleRefresh = () => {
    fetchOrderDetails();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-purple-100">
          <div className="flex flex-col items-center">
            {/* Currency Exchange Animation */}
            <div className="relative w-24 h-24 mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <svg className="w-full h-full text-purple-600" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f3e8ff" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="#a855f7" 
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset="200"
                  />
                </svg>
              </motion.div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-purple-600 text-xl font-bold">₦/$</span>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-center text-purple-700 mb-4">
              Verifying Your Payment
            </h1>
            
            <div className="flex items-center justify-center gap-4 mb-6 bg-purple-50 px-6 py-3 rounded-xl border border-purple-100">
              <div className="text-center">
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-semibold text-gray-700 truncate max-w-[240px]">
                  {orderId || 'Loading...'}
                </p>
              </div>
            </div>
            
            <div className="w-full max-w-xs bg-purple-100 h-2 rounded-full overflow-hidden mb-6">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-purple-400 via-purple-600 to-purple-400 w-1/2 rounded-full"
              />
            </div>
            
            <p className="text-center text-gray-600">
              Please wait while we confirm your transaction...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-red-100">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-center text-red-600 mb-4">
              Payment Error
            </h1>
            
            <p className="text-center mb-6 text-gray-700">{error}</p>
            
            {/* Support contact information */}
            <div className="mb-6 w-full bg-yellow-50 p-4 rounded-xl border border-yellow-200">
              <h3 className="text-yellow-800 font-medium mb-2">Need help?</h3>
              <p className="text-gray-700 text-sm mb-3">
                Contact our support team for assistance:
              </p>
              <div className="flex flex-col space-y-2">
                <a 
                  href={`https://t.me/${SUPPORT_CONTACTS.telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.952 8.265l-1.444 6.808c-.108.496-.401.61-.813.38l-2.246-1.654-1.083 1.042c-.12.12-.22.22-.451.22l.161-2.281 4.154-3.753c.18-.162-.039-.252-.279-.09l-5.133 3.229-2.213-.692c-.48-.151-.49-.48.111-.71l8.64-3.339c.399-.147.75.09.606.85z"/>
                  </svg>
                  Telegram: {SUPPORT_CONTACTS.telegram}
                </a>
                <a 
                  href={`https://wa.me/${SUPPORT_CONTACTS.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-green-600 hover:text-green-800"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  WhatsApp: {SUPPORT_CONTACTS.whatsapp}
                </a>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl shadow-md hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
              
              <Link to="/activity" className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors flex items-center justify-center">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Order not found
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-yellow-100">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-center text-yellow-600 mb-4">
              Order Not Found
            </h1>
            
            <p className="text-center mb-6 text-gray-700">
              We couldn't find the order details. Please check your dashboard for the latest status.
            </p>
            
            {/* Support contact information */}
            <div className="mb-6 w-full bg-yellow-50 p-4 rounded-xl border border-yellow-200">
              <h3 className="text-yellow-800 font-medium mb-2">Need help?</h3>
              <p className="text-gray-700 text-sm mb-3">
                Contact our support team for assistance:
              </p>
              <div className="flex flex-col space-y-2">
                <a 
                  href={`https://t.me/${SUPPORT_CONTACTS.telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.952 8.265l-1.444 6.808c-.108.496-.401.61-.813.38l-2.246-1.654-1.083 1.042c-.12.12-.22.22-.451.22l.161-2.281 4.154-3.753c.18-.162-.039-.252-.279-.09l-5.133 3.229-2.213-.692c-.48-.151-.49-.48.111-.71l8.64-3.339c.399-.147.75.09.606.85z"/>
                  </svg>
                  Telegram: {SUPPORT_CONTACTS.telegram}
                </a>
                <a 
                  href={`https://wa.me/${SUPPORT_CONTACTS.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-green-600 hover:text-green-800"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  WhatsApp: {SUPPORT_CONTACTS.whatsapp}
                </a>
              </div>
            </div>
            
            <Link to="/activity" className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl shadow-md hover:bg-purple-700 transition-colors flex items-center justify-center">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main success state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        {/* Status Banner */}
        <motion.div 
          variants={itemVariants}
          className={`w-full h-3 ${
            order.status === 'completed' ? 'bg-gradient-to-r from-purple-400 to-purple-600' : 
            order.status === 'processing' ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 
            order.status === 'failed' ? 'bg-gradient-to-r from-red-400 to-red-600' :
            'bg-gradient-to-r from-yellow-400 to-yellow-600'
          }`}
        />
        
        <div className="p-8">
          {/* Status Icon */}
          {order.status === 'completed' && (
            <motion.div
              variants={itemVariants}
              className="mb-6 flex justify-center"
            >
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center"
              >
                <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            </motion.div>
          )}
          
          {order.status === 'processing' && (
            <div className="mb-6 flex justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center"
              >
                <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.div>
            </div>
          )}
          
          {order.status === 'failed' && (
            <div className="mb-6 flex justify-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center"
              >
                <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
            </div>
          )}
          
          {['pending', 'cancelled'].includes(order.status) && (
            <div className="mb-6 flex justify-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center"
              >
                <svg className="w-12 h-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </motion.div>
            </div>
          )}
          
          {/* Status Title */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${
              order.status === 'completed' ? 'text-purple-700' : 
              order.status === 'processing' ? 'text-blue-700' : 
              order.status === 'failed' ? 'text-red-700' :
              'text-yellow-700'
            }`}>
              {order.status === 'completed' ? 'Payment Successful!' : 
               order.status === 'processing' ? 'Payment Processing' : 
               order.status === 'pending' ? 'Payment Pending' :
               order.status === 'cancelled' ? 'Payment Cancelled' :
               'Payment Failed'}
            </h1>
            <p className="text-gray-600 text-lg">
              {order.status === 'completed' ? 'Your transaction has been completed successfully.' : 
               order.status === 'processing' ? 'Your payment is being processed.' : 
               order.status === 'pending' ? 'Your payment is awaiting confirmation.' :
               order.status === 'cancelled' ? 'Your payment was cancelled.' :
               'There was an issue with your payment.'}
            </p>
          </motion.div>
          
          {/* Transaction Details Card */}
          <motion.div 
            variants={itemVariants}
            className="bg-purple-50 rounded-xl p-6 mb-6 border border-purple-100"
          >
            <h2 className="text-lg font-semibold text-purple-800 mb-4 pb-2 border-b border-purple-200">
              Transaction Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID</span>
                <span className="font-medium text-gray-900">{order._id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Reference</span>
                <span className="font-medium text-gray-900">
                  {paymentReference || 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium capitalize ${
                  order.status === 'completed' ? 'text-purple-600' :
                  order.status === 'processing' ? 'text-blue-600' :
                  order.status === 'failed' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {order.status}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Received</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(order.targetAmount, order.targetCurrency)}
                </span>
              </div>
              
              {order.transactionHash && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction Hash</span>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${order.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 hover:underline font-medium truncate max-w-[180px]"
                  >
                    {order.transactionHash.substring(0, 10)}...
                  </a>
                </div>
              )}
              
              {order.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed At</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.completedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Status-specific Message */}
          {order.status === 'completed' && (
            <motion.div 
              variants={itemVariants}
              className="text-center mb-6"
            >
              <div className="mb-2 text-xl font-semibold text-purple-700">
                🎉 {formatCurrency(order.targetAmount, order.targetCurrency)} has been sent to your wallet!
              </div>
              
              <div className="text-gray-600">
                Redirecting to dashboard in {countdown} seconds...
              </div>
            </motion.div>
          )}
          
          {order.status === 'processing' && (
            <motion.div 
              variants={itemVariants}
              className="text-center mb-6"
            >
              <p className="text-blue-700 mb-2">
                Your payment has been received and is being processed.
              </p>
              <p className="text-gray-600 text-sm">
                This usually takes a few minutes. You'll receive a notification once completed.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors"
              >
                Refresh Status
              </button>
            </motion.div>
          )}
          
          {order.status === 'pending' && (
            <motion.div 
              variants={itemVariants}
              className="text-center mb-6"
            >
              <p className="text-yellow-700 mb-2">
                Your payment is still pending confirmation.
              </p>
              <p className="text-gray-600 text-sm mt-2 mb-4">
                Please wait while we confirm your payment with our provider.
              </p>
              
              {/* Show callback result if available */}
              {callbackResult && (
                <div className={`my-3 p-3 rounded text-sm ${callbackResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {callbackResult.message}
                </div>
              )}
              
              <div className="mt-4 flex justify-center space-x-3">
                <button 
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Refresh Status
                </button>
                
                <button 
                  onClick={handleVerifyPayment}
                  disabled={callbackLoading}
                  className={`px-4 py-2 rounded transition-colors flex items-center ${
                    callbackLoading 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {callbackLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : "I've Completed Payment"}
                </button>
              </div>
            </motion.div>
          )}
          
          {order.status === 'failed' && (
            <motion.div 
              variants={itemVariants}
              className="text-center mb-6"
            >
              <p className="text-red-600 mb-2">
                There was an issue with your payment.
              </p>
              <p className="text-gray-600 text-sm mb-4">
                Reason: {order.notes || "Unknown error occurred"}
              </p>
              
              {/* Support contact information for failed payments */}
              <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <h3 className="text-yellow-800 font-medium mb-2">Need help?</h3>
                <p className="text-gray-700 text-sm mb-3">
                  Contact our support team for assistance with your failed payment:
                </p>
                <div className="flex flex-col space-y-2">
                  <a 
                    href={`https://t.me/${SUPPORT_CONTACTS.telegram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.952 8.265l-1.444 6.808c-.108.496-.401.61-.813.38l-2.246-1.654-1.083 1.042c-.12.12-.22.22-.451.22l.161-2.281 4.154-3.753c.18-.162-.039-.252-.279-.09l-5.133 3.229-2.213-.692c-.48-.151-.49-.48.111-.71l8.64-3.339c.399-.147.75.09.606.85z"/>
                    </svg>
                    Telegram: {SUPPORT_CONTACTS.telegram}
                  </a>
                  <a 
                    href={`https://wa.me/${SUPPORT_CONTACTS.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-green-600 hover:text-green-800"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    WhatsApp: {SUPPORT_CONTACTS.whatsapp}
                  </a>
                </div>
                <p className="text-gray-600 text-xs mt-2">
                  Please mention your Order ID: <span className="font-medium">{order._id}</span> when contacting support
                </p>
              </div>
              
              <Link to="/ramp/onramp" className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg shadow-md hover:bg-green-600 transition-colors inline-block">
                Try Again
              </Link>
            </motion.div>
          )}
          
          {/* Action Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex justify-center space-x-4"
          >
            <Link to="/activity" className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl shadow-md hover:bg-purple-700 transition-colors flex items-center justify-center">
              Go to Dashboard
            </Link>
            
            {['completed', 'processing'].includes(order.status) && (
              <Link to="/transactions" className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors flex items-center justify-center">
                View Transactions
              </Link>
            )}
          </motion.div>
        </div>
      </motion.div>
      
      {/* Bottom decoration */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 text-center text-gray-500 text-sm"
      >
        Secure payments powered by Aboki
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;