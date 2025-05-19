# Aboki/Aboki Liquidity Provider Integration Guide

This guide explains how to integrate the Liquidity Provider feature into your existing Aboki/Aboki application.

## Overview

The Liquidity Provider feature allows users to provide liquidity in two directions:

1. **Crypto to Fiat (USDC → NGN)**: Users provide USDC and earn returns in NGN
2. **Fiat to Crypto (NGN → USDC)**: Users provide NGN and earn returns in USDC

The implementation consists of:

-  Type definitions
-  Context provider for state management
-  Multi-step onboarding flow
-  Dashboard for managing liquidity positions
-  Proper integration with Privy wallet

## Integration Steps

Follow these steps to integrate the feature:

### 1. Add Type Definitions

Copy the `types/LiquidityTypes.ts` file to your project. This defines all the types needed for the Liquidity Provider feature.

### 2. Add Context Provider

Copy the `context/LiquidityContext.tsx` file to your project. This provides state management for the Liquidity Provider feature.

### 3. Create Component Folders

Create the following folder structure:

```
components/
  └── liquidity/
      ├── common/
      ├── onboarding/
      └── dashboard/
```

### 4. Add Common Components

Copy these components to the `components/liquidity/common/` folder:

-  `ProgressStepper.tsx`
-  `NavigationButtons.tsx`
-  `FormInput.tsx`
-  `CurrencySelector.tsx`

### 5. Add Onboarding Components

Copy these components to the `components/liquidity/onboarding/` folder:

-  `RoleSelection.tsx`
-  `ProfileSetup.tsx`
-  `KYCVerification.tsx`
-  `WalletFunding.tsx`
-  `VirtualAccountFunding.tsx`
-  `BankDetails.tsx`
-  `CryptoDestination.tsx`
-  `SuccessConfirmation.tsx`

### 6. Add Dashboard Components

Copy the `components/liquidity/activity/LiquidityDashboard.tsx` file to your project.

### 7. Add Main Component

Copy the `components/liquidity/LiquidityProvider.tsx` file to your project.

### 8. Add Utility Functions

Copy the `utils/liquidityUtils.ts` file to your project.

### 9. Update Routes in App.tsx

Update your `App.tsx` file to include the routes for the Liquidity Provider feature:

```tsx
import { LiquidityProvider as LiquidityContextProvider } from "./context/LiquidityContext";
import LiquidityProvider from "./components/liquidity/LiquidityProvider";
import LiquidityDashboard from "./components/liquidity/activity/LiquidityDashboard";

// Inside your Routes component
<Routes>
   {/* Existing routes */}
   <Route path="/add-liquidity" element={<LiquidityProvider />} />
   <Route path="/liquidity-dashboard" element={<LiquidityDashboard />} />
</Routes>;
```

### 10. Wrap App with LiquidityContextProvider

Wrap your app with the `LiquidityContextProvider` to provide the liquidity context throughout the application:

```tsx
<LiquidityContextProvider>
   <App />
</LiquidityContextProvider>
```

### 11. Update Navbar

Add an "Add Liquidity" button to your Navbar component that links to the `/add-liquidity` route.

## API Integration Points

The current implementation uses mock data and functions. You'll need to replace these with actual API calls:

1. **User Profile API**: Update the profile management in `LiquidityContext.tsx`
2. **KYC Verification API**: Replace the mock verification in `verifyKYC` function
3. **Bank Account Verification API**: Replace the mock verification in `verifyBankAccount` function
4. **Wallet Transaction API**: Implement actual blockchain transactions in `fundWallet` function
5. **Virtual Account API**: Generate real virtual account details in `VirtualAccountFunding.tsx`
6. **Position Management API**: Store and retrieve positions from your backend in `submitLiquidityPosition` function
7. **Rewards Calculation API**: Implement actual reward calculation logic in the dashboard

## Troubleshooting

1. **Type Errors**: Make sure all type definitions are properly imported and used
2. **Privy Integration**: Check that the Privy user object is accessed correctly
3. **Navigation Issues**: Ensure process steps are correctly defined and navigation works as expected
4. **Component Props**: Verify that all components receive the expected props
5. **API Integration**: Test each API endpoint before replacing the mock functions

## Best Practices

1. **Error Handling**: Add proper error handling for all API calls
2. **Loading States**: Show loading indicators during API calls
3. **Form Validation**: Use Yup schemas for form validation
4. **Type Safety**: Maintain strict TypeScript typing
5. **Component Organization**: Keep components small and focused
6. **Responsive Design**: Test on different screen sizes
7. **Accessibility**: Ensure forms and buttons are accessible
8. **Testing**: Add unit tests for components and functions

By following this guide, you should have a fully functional Liquidity Provider feature integrated into your Aboki/Aboki application.
