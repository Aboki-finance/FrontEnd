import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

interface PrivyConfigProps {
   children: ReactNode;
}

const PrivyConfig = ({ children }: PrivyConfigProps) => {
   return (
      <PrivyProvider
         appId="cma3kpbef01uijy0mraydfase"
         config={{
            appearance: {
               theme: "dark",
               accentColor: "#7c3aed",
               logo: "src/assets/logo-white.png",
            },
            embeddedWallets: {
               createOnLogin: "users-without-wallets",
            },
         }}>
         {children}
      </PrivyProvider>
   );
};

export default PrivyConfig;
