import { http, createConfig } from "wagmi";
import { base, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
   chains: [sepolia],
   connectors: [injected()],
   transports: {
      11155111: http("https://ethereum-sepolia-rpc.publicnode.com"), // Using your Sepolia RPC URL
   },
});

//https://ethereum-sepolia-rpc.publicnode.com