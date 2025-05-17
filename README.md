# Aboki Finance

Welcome to **Aboki Finance** — a decentralized P2P crypto swap and liquidity platform.  
This documentation is crafted for everyone: users, developers, and contributors.

---

## Table of Contents

1. [Overview](#overview)
2. [For Users](#for-users)
3. [For Developers](#for-developers)
4. [Smart Contract API](#smart-contract-api)
5. [Security](#security)
6. [Deployment & Environment](#deployment--environment)
7. [Order Lifecycle & Error Handling](#order-lifecycle--error-handling)
8. [Contributing](#contributing)
9. [FAQ](#faq)
10. [License & Acknowledgements](#license--acknowledgements)

---

## Overview

Aboki Finance is a trustless dApp for swapping crypto and providing liquidity, featuring:
- **Modern frontend**: React, Vite, TypeScript, Tailwind CSS.
- **Web3 Integration**: Wagmi, Viem, Privy, Ethers.js.
- **EVM Contracts**: Secure, audited, and upgradable.
- **User-focused**: Simple, secure, and open-source.

---

## For Users

### What can you do?
- **Swap crypto**: Instantly exchange supported tokens.
- **Provide liquidity**: Earn rewards by supplying to pools.
- **Track activity**: See your swap and liquidity history.
- **Stay secure**: Your wallet, your keys.

### How to use Aboki Finance

1. **Access the App**
   - Visit the live site or run locally (see Developer section).

2. **Connect Your Wallet**
   - Click “Connect Wallet”.
   - Use MetaMask, WalletConnect, or Privy.

3. **Swap Tokens**
   - Go to "Swap".
   - Select input/output tokens and amount.
   - Click "Swap" and confirm in your wallet.

4. **Add Liquidity**
   - Go to "Add Liquidity".
   - Select tokens and amounts.
   - Approve and confirm via your wallet.

5. **Track Activity**
   - Visit "Activity" or "Liquidity Dashboard" to see your history.

6. **Disconnect**
   - Disconnect your wallet for extra safety after use.

---

## For Developers

### Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Web3:** Wagmi, Viem, Ethers.js, Privy
- **Contracts:** Solidity, OpenZeppelin, Uniswap V2
- **Testing/Deploy:** Hardhat, Node.js

### Project Structure

```
src/
├── App.tsx           # Main routes
├── main.tsx          # App root, providers
├── assets/           # Images, logos
├── components/       # UI (Navbar, Modals, Swap, Liquidity, etc)
├── context/          # React Contexts (liquidity, swap)
├── contracts/        # ABIs, contract hooks
├── hooks/            # Custom hooks
├── pages/            # Route-level pages (Landing, Swap, Activity, etc)
```

### Running Locally

1. **Clone the Repo**
   ```bash
   git clone https://github.com/Aboki-finance/FrontEnd.git
   cd FrontEnd
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set Up Environment Variables**
   - Copy `.env.example` to `.env` and fill in the required fields (see Deployment & Environment).

4. **Run the Dev Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   - Visit `http://localhost:5173` in your browser.

5. **Lint, Format, and Test**
   ```bash
   npm run lint
   npm run format
   npm run test
   ```

---

## Smart Contract API

### SimpleGateway (Solidity)

**Main Functions**
- `createOrderWithSwap(address[] path, uint256 amountIn, uint256 minOut)`
- `estimateSwapOutput(address[] path, uint256 amountIn)`
- `setTokenSupport(address token, bool ok)` (Admin only)
- `setProtocolFeePercent(uint256 feeBp)` (Admin only)

**Events**
- `OrderCreated(orderId, user, amountIn, minOut)`
- `SwapExecuted(orderId, amountOut)`

**Example (wagmi)**
```typescript
import { useContractWrite } from 'wagmi';
const { write } = useContractWrite({
  address: GATEWAY_ADDRESS,
  abi: SimpleGatewayABI,
  functionName: 'createOrderWithSwap',
});
write({ args: [path, amountIn, minOut] });
```

---

## Security

- **ReentrancyGuard**: Prevents reentrancy attacks.
- **Ownable**: Restricts admin functions.
- **Token Whitelist**: Only approved tokens can be swapped.
- **Slippage Protection**: Users set `minOut`.
- **Audited**: SecureChain Labs, 2024.

---

## Deployment & Environment

### Frontend

Set required ENV vars (`.env`):

| Key                   | Description                     | Example                                     |
|-----------------------|---------------------------------|---------------------------------------------|
| VITE_APP_PRIVY_KEY    | Privy client ID                 | pk_live_abc123                              |
| VITE_UNISWAP_ROUTER   | UniswapV2 router address        | 0x7a250d5630b4cf539739df2c5dacb4c659f2488d  |
| GATEWAY_ADDRESS       | SimpleGateway contract address  | 0xAb0...c1b                                 |
| NODE_RPC_URL          | RPC endpoint                    | https://mainnet.infura.io/v3/YOUR_KEY       |
| PROTOCOL_FEE_BASIS    | Protocol fee (basis points)     | 200                                         |

**Build for Production:**
```bash
npm run build
# or
yarn build
```
**Deploy:**  
Upload `dist/` folder to your static host (Vercel, Netlify, etc).

### Contracts

Deploy with Hardhat:
```bash
npx hardhat deploy --network mainnet --tags SimpleGateway
```

---

## Order Lifecycle & Error Handling

**Order Status**
- PENDING: Swap submitted, waiting for execution.
- EXECUTED: Swap successful.
- FAILED: Swap failed (slippage, gas, etc).
- CANCELLED: User cancelled (frontend only).

**Common Errors**

| Error                        | Meaning                        | Fix                                   |
|------------------------------|--------------------------------|---------------------------------------|
| Token not supported          | Not whitelisted                | Admin: use `setTokenSupport()`        |
| Invalid amount               | Zero or negative               | Use a positive value                  |
| INSUFFICIENT_OUTPUT_AMOUNT   | Slippage too strict            | Use higher slippage tolerance         |
| Gas-related failures         | Network/gas issues             | Retry with more gas, check network    |

---

## Contributing

1. **Fork & Clone** the repo.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/your-feature
   ```
3. **Code, Lint, Test**:
   ```bash
   npm run lint && npm run test
   ```
4. **Open a Pull Request** on `main` with a clear description.

---

## FAQ

**Q:** What wallets are supported?  
**A:** All EVM wallets (MetaMask, WalletConnect, Privy, etc).

**Q:** Can I use the frontend without deployed contracts?  
**A:** You can view the UI, but swaps/liquidity require your wallet and live contracts.

**Q:** Is my data private?  
**A:** Yes. You control your keys and sign all transactions yourself.

**Q:** Where do I get help or report bugs?  
**A:** Open an issue at [Aboki-finance/FrontEnd Issues](https://github.com/Aboki-finance/FrontEnd/issues).

---

## License & Acknowledgements

- **MIT License** (see LICENSE)
- Built with: React, Vite, Tailwind, Wagmi, Viem, Privy, Ethers.js, Uniswap, OpenZeppelin
- Audited by SecureChain Labs (2024)

---

**For more, see the source code, contract ABIs, or contact the maintainers at [Aboki-finance/FrontEnd](https://github.com/Aboki-finance/FrontEnd).**
