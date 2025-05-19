import { parseUnits, formatUnits } from 'viem';

// Define a minimal ERC20 ABI 
const erc20Abi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "type": "function"
  }
];

// WETH ABI for deposit function
const wethAbi = [
  ...erc20Abi,
  {
    "constant": false,
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Gateway contract ABI and address
const GATEWAY_ADDRESS = "0xa5c9383c1Be876FB3E3576ce04F938A0a5C4B34e";
const GATEWAY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_rate",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_refundAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_liquidityProvider",
        "type": "address"
      }
    ],
    "name": "createOrder",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "orderId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_inputToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_targetToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_inputAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_minOutputAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_rate",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_refundAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_liquidityProvider",
        "type": "address"
      }
    ],
    "name": "createOrderWithSwap",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "orderId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_path",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "_inputAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_minOutputAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_rate",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_refundAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_liquidityProvider",
        "type": "address"
      }
    ],
    "name": "createOrderWithCustomPath",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "orderId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
];

// Constants
const LIQUIDITY_PROVIDER_ADDRESS = "0xBd71E5b859be5DC909F5c964C87FA1ae8E816b4D";
const DEFAULT_SLIPPAGE = 0.5; // 0.5% slippage
const USDC_ADDRESS = "0xCc1cb415521fbBd14D36F4db1A847F04dA0914aA";
const cNGN_ADDRESS = "0x46C85152bFe9f96829aA94755D9f915F9B10EF5F";
const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const USDT_ADDRESS = "0xcf78b6FB5bC8f15DE3A6FA2eCFd3C119B6219078";

// Token paths for different tokens with correct routing
const TOKEN_PATHS = {
  // For ETH, we'll wrap it to WETH first, so now we use the WETH path
  "ETH": [WETH_ADDRESS, USDC_ADDRESS],
  
  // Direct path for USDC
  "USDC": [USDC_ADDRESS],
  
  // For WETH, go through USDC
  "WETH": [WETH_ADDRESS, USDC_ADDRESS],
  
  // For USDT, go through WETH then USDC
  "USDT": [USDT_ADDRESS, WETH_ADDRESS, USDC_ADDRESS],
  
  // Other tokens with likely paths
  "ZORA": ["0x1111111111166b7FE7bd91427724B487980aFc69", WETH_ADDRESS, USDC_ADDRESS],
  "DEGEN": ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", WETH_ADDRESS, USDC_ADDRESS],
};

// Interface for swap parameters
export interface SwapParams {
  token: string;
  tokenAddress: string;
  tokenDecimals: number;
  amount: string;
  minReceiveAmount: string;
  rate: number;
  walletAddress: string;
}

// Logger utility
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

/**
 * Wraps ETH to WETH
 */
export const wrapETH = async (
  writeContract: any,
  amount: string
) => {
  try {
    // Convert amount to wei
    const amountInWei = parseUnits(amount, 18); // ETH has 18 decimals
    
    logWithDetails('CONTRACT', `Wrapping ${amount} ETH to WETH...`);
    
    // Create transaction parameters for wrapping ETH
    const params = {
      address: WETH_ADDRESS as `0x${string}`,
      abi: wethAbi,
      functionName: 'deposit',
      args: [],
      value: amountInWei // Send ETH with transaction
    };
    
    // Execute the transaction
    const txHash = await writeContract(params);
    
    logWithDetails('CONTRACT', `ETH wrap transaction submitted: ${txHash}`);
    
    return {
      success: true,
      txHash,
      message: 'ETH wrapped to WETH successfully'
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logWithDetails('ERROR', `ETH wrapping error: ${errorMsg}`, error);
    
    return {
      success: false,
      message: `Failed to wrap ETH: ${errorMsg}`
    };
  }
};

/**
 * Generates approval transaction parameters for an ERC20 token
 */
export const generateTokenApproval = (
  tokenAddress: string,
  tokenDecimals: number,
  amount: string
) => {
  try {
    // Calculate amount in wei
    const amountInWei = parseUnits(amount, tokenDecimals);
    
    // Approval params
    return {
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [GATEWAY_ADDRESS as `0x${string}`, amountInWei]
    };
  } catch (error) {
    logWithDetails('ERROR', 'Failed to generate approval params', error);
    throw error;
  }
};

/**
 * Checks if a token has enough allowance for the swap
 */
export const checkTokenAllowance = async (
  readContract: any,
  tokenAddress: string,
  tokenDecimals: number,
  walletAddress: string,
  amount: string
) => {
  try {
    const amountInWei = parseUnits(amount, tokenDecimals);
    
    // Check allowance
    const allowance = await readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [walletAddress as `0x${string}`, GATEWAY_ADDRESS as `0x${string}`]
    });
    
    logWithDetails('CONTRACT', `Current allowance: ${allowance ? formatUnits(allowance as bigint, tokenDecimals) : '0'}`);
    
    // Check if approval is needed
    return allowance && (allowance as bigint) >= (amountInWei as bigint);
  } catch (error) {
    logWithDetails('ERROR', 'Error checking token allowance', error);
    return false;
  }
};

/**
 * Generates parameters for a token-to-NGN swap based on token type
 * Updated to always use WETH for ETH swaps
 */
export const generateSwapParams = (params: SwapParams) => {
  const { token, tokenAddress, tokenDecimals, amount, minReceiveAmount, rate, walletAddress } = params;
  
  try {
    // Calculate amounts
    const amountInWei = parseUnits(amount, tokenDecimals);
    const minOutputAmountInWei = parseUnits(minReceiveAmount, 18); // cNGN decimals
    const rateInWei = parseUnits(rate.toString(), 18);
    
    logWithDetails('CONTRACT', 'Preparing swap parameters', {
      token,
      address: tokenAddress,
      amountInWei: amountInWei.toString(),
      minOutputAmount: minOutputAmountInWei.toString(),
      rate: rateInWei.toString(),
      walletAddress
    });
    
    // For tokens with direct path to USDC (primarily USDC itself)
    if (token === "USDC") {
      // For USDC, use the direct createOrder function
      return {
        address: GATEWAY_ADDRESS as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: 'createOrder',
        args: [
          tokenAddress as `0x${string}`,
          amountInWei,
          rateInWei,
          walletAddress as `0x${string}`,
          LIQUIDITY_PROVIDER_ADDRESS as `0x${string}`
        ]
      };
    } 
    // For WETH or wrapped ETH, use the createOrderWithSwap function
    else if (token === "WETH" || (token === "ETH" && tokenAddress === WETH_ADDRESS)) {
      return {
        address: GATEWAY_ADDRESS as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: 'createOrderWithSwap',
        args: [
          WETH_ADDRESS as `0x${string}`,  // WETH address
          USDC_ADDRESS as `0x${string}`,  // Target token (USDC)
          amountInWei,
          minOutputAmountInWei,
          rateInWei,
          walletAddress as `0x${string}`,  // Refund address
          LIQUIDITY_PROVIDER_ADDRESS as `0x${string}`  // Liquidity provider
        ]
      };
    } 
    // For all other tokens including USDT, ZORA, DEGEN, use createOrderWithCustomPath
    else {
      const tokenPath = TOKEN_PATHS[token as keyof typeof TOKEN_PATHS];
      
      if (!tokenPath || tokenPath.length === 0) {
        throw new Error(`No swap path defined for token: ${token}`);
      }
      
      logWithDetails('CONTRACT', 'Using createOrderWithCustomPath with path:', tokenPath);
      
      return {
        address: GATEWAY_ADDRESS as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: 'createOrderWithCustomPath',
        args: [
          tokenPath.map(addr => addr as `0x${string}`),
          amountInWei,
          minOutputAmountInWei,
          rateInWei,
          walletAddress as `0x${string}`,
          LIQUIDITY_PROVIDER_ADDRESS as `0x${string}`
        ]
      };
    }
  } catch (error) {
    logWithDetails('ERROR', 'Failed to generate swap parameters', error);
    throw error;
  }
};

/**
 * Calculates the minimum amount to receive with slippage
 */
export const calculateMinReceiveAmount = (
  receiveAmount: string,
  slippagePercent: number = DEFAULT_SLIPPAGE
): string => {
  if (!receiveAmount || receiveAmount === '0') return '0';
  
  const amount = parseFloat(receiveAmount);
  const slippage = slippagePercent / 100;
  const minAmount = amount * (1 - slippage);
  
  return minAmount.toFixed(2);
};

/**
 * Get token information from symbol
 */
export const getTokenInfo = (tokens: any[], symbol: string) => {
  const token = tokens.find(t => t.symbol === symbol);
  if (!token) {
    throw new Error(`Token ${symbol} not found`);
  }
  
  return {
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol
  };
};

/**
 * Handles a token-to-NGN swap from start to finish
 * UPDATED to handle ETH by first wrapping it to WETH
 */
export const executeTokenToNGNSwap = async (
  writeContract: any,
  readContract: any,
  params: {
    tokens: any[];
    selectedToken: string;
    sendAmount: string;
    receiveAmount: string;
    rate: number;
    walletAddress: string;
  }
) => {
  const { tokens, selectedToken, sendAmount, receiveAmount, rate, walletAddress } = params;
  
  try {
    console.group('%c🔄 TOKEN TO NGN SWAP', 'color: #8b5cf6; font-weight: bold; font-size: 12px;');
    
    // Get token info
    const token = getTokenInfo(tokens, selectedToken);
    logWithDetails('CONTRACT', `Processing swap for ${token.symbol}`, token);
    
    // Handle native ETH - we need to wrap it to WETH first
    const isNativeETH = token.symbol === "ETH" && (token.address === "ETH" || token.address.toLowerCase() === "eth");
    
    // If we're dealing with native ETH, wrap it to WETH first
    if (isNativeETH) {
      logWithDetails('CONTRACT', 'Converting ETH to WETH before swap');
      
      // Wrap ETH to WETH
      const wrapResult = await wrapETH(writeContract, sendAmount);
      
      if (!wrapResult.success) {
        logWithDetails('ERROR', 'Failed to wrap ETH to WETH', wrapResult);
        console.groupEnd();
        return {
          success: false,
          requiresApproval: false,
          message: wrapResult.message
        };
      }
      
      // Update token info to use WETH instead of ETH for the rest of the process
      token.address = WETH_ADDRESS;
      logWithDetails('CONTRACT', 'Successfully wrapped ETH to WETH, proceeding with WETH swap', {
        originalToken: selectedToken,
        newTokenAddress: WETH_ADDRESS
      });
    }
    
    // Now check for token approval (needed for all tokens including WETH, but not native ETH)
    const hasAllowance = await checkTokenAllowance(
      readContract,
      token.address,
      token.decimals,
      walletAddress,
      sendAmount
    );
    
    if (!hasAllowance) {
      logWithDetails('CONTRACT', 'Approval needed, requesting approval from user');
      
      // Generate approval parameters
      const approvalParams = generateTokenApproval(
        token.address,
        token.decimals,
        sendAmount
      );
      
      // Execute approval transaction
      const approvalTxHash = await writeContract(approvalParams);
      
      logWithDetails('CONTRACT', `Approval transaction submitted: ${approvalTxHash}`);
      return {
        success: false,
        requiresApproval: true,
        approvalTxHash,
        message: 'Token approval required before swap'
      };
    }
    
    // Calculate min receive amount with slippage
    const minReceiveAmount = calculateMinReceiveAmount(receiveAmount);
    
    // Generate swap parameters
    const swapParams = generateSwapParams({
      token: isNativeETH ? "WETH" : token.symbol, // Use WETH if we wrapped ETH
      tokenAddress: token.address,
      tokenDecimals: token.decimals,
      amount: sendAmount,
      minReceiveAmount,
      rate,
      walletAddress
    }) as {
      address: `0x${string}`;
      abi: {
        inputs: { internalType: string; name: string; type: string }[];
        name: string;
        outputs: { internalType: string; name: string; type: string }[];
        stateMutability: string;
        type: string;
      }[];
      functionName: string;
      args: any[];
      value?: bigint; // Extend type to include optional 'value'
    };
    
    logWithDetails('CONTRACT', 'Executing contract call with parameters:', {
      functionName: swapParams.functionName,
      args: swapParams.args,
      ...(swapParams.value !== undefined ? { value: swapParams.value } : {})
    });
    
    // Execute swap transaction
    const swapTxHash = await writeContract(swapParams);
    
    logWithDetails('CONTRACT', `Swap transaction submitted: ${swapTxHash}`);
    console.groupEnd();
    
    return {
      success: true,
      requiresApproval: false,
      swapTxHash,
      isWrappedETH: isNativeETH, // Let the UI know if we wrapped ETH
      message: 'Swap transaction submitted successfully'
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logWithDetails('ERROR', `Smart contract swap error: ${errorMsg}`, error);
    console.groupEnd();
    
    // Extract more detailed error information
    let detailedError = errorMsg;
    if (error && typeof error === 'object' && 'cause' in error) {
      const cause = (error as any).cause;
      if (cause?.message) {
        detailedError = cause.message;
      }
    }
    
    return {
      success: false,
      requiresApproval: false,
      message: `Swap failed: ${detailedError}`
    };
  }
};