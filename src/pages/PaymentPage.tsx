import React from "react";
import Navbar from "../components/Navbar/components/Navbar";

import PaymentDashboard from "../components/Payment/index";

const Payment: React.FC = () => {
   return (
      <div className=" min-h-screen">
         <Navbar />
         <main className="mt-36">
            <PaymentDashboard />
         </main>
      </div>
   );
};

export default Payment;
