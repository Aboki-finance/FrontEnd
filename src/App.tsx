import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SwapPage from "./pages/SwapPage";
import ActivityPage from "./pages/ActivityPage";
import PaymentPage from "./pages/PaymentPage.tsx";
import LProvidersPage from "./pages/ProvidersPage";
import LPDashBoard from "./pages/LPdashboard";
function App() {
   return (
      <Routes>
         <Route path="/" element={<LandingPage />} />
         <Route path="/app" element={<SwapPage />} />
         <Route path="/activity" element={<ActivityPage />} />
         <Route path="/add-liquidity" element={<LProvidersPage />} />
         <Route path="/liquidity-dashboard" element={<LPDashBoard />} />
         <Route path="/Payment" element={<PaymentPage />} />
      </Routes>
   );
}

export default App;
