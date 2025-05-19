import { useNavigate } from "react-router-dom";
import {
   motion,
   useScroll,
   useTransform,
   AnimatePresence,
} from "framer-motion";
import { FaTelegram } from "react-icons/fa";
import { useState, useEffect } from "react";
import SwapCard from "./SwapCard";
import heroImage from "../assets/heroImage.png";
import { usePrivy } from "@privy-io/react-auth";
import { JsonRpcProvider, formatEther } from "ethers";

const HeroSection = () => {
   const { scrollY } = useScroll();
   const opacity = useTransform(scrollY, [0, 750], [1, 0]);
   const [isFirstText, setIsFirstText] = useState(true);

   const { login, logout, authenticated, user } = usePrivy();
   const navigate = useNavigate();

   // Rotate text animation
   useEffect(() => {
      const interval = setInterval(() => {
         setIsFirstText((prev) => !prev);
      }, 4000);

      return () => clearInterval(interval);
   }, []);

   // Redirect if authenticated
   useEffect(() => {
      if (authenticated) {
         navigate("/app");
      }
   }, [authenticated, navigate]);

   const handleConnect = async () => {
      try {
         await login();

         if (user?.wallet?.address) {
            const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
            const balance = await provider.getBalance(user.wallet.address);
            const formattedBalance = formatEther(balance);

            console.log("Connected Address:", user.wallet.address);
            console.log("Balance (Base):", formattedBalance);
         }
      } catch (error) {
         console.error("Privy login failed:", error);
      }
   };

   const buttonVariants = {
      hover: { scale: 1.05 },
      tap: { scale: 0.95 },
   };

   return (
      <div
         className="rounded-[4rem] relative min-h-[100vh] flex flex-col justify-center py-20 overflow-hidden"
         style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
         }}>
         <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

         <div className="relative z-10 container mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row items-center">
               <motion.div
                  className="w-full md:w-1/2 mb-12 md:mb-0 md:pr-8"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}>
                  <div className="relative">
                     <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                        <div className="h-[60px] md:h-[70px] relative overflow-hidden">
                           <AnimatePresence mode="wait">
                              {isFirstText ? (
                                 <motion.div
                                    key="cash-in"
                                    initial={{
                                       y: 100,
                                       rotateX: -80,
                                       opacity: 0,
                                    }}
                                    animate={{ y: 0, rotateX: 0, opacity: 1 }}
                                    exit={{ y: -100, rotateX: 80, opacity: 0 }}
                                    transition={{
                                       type: "spring",
                                       stiffness: 300,
                                       damping: 10,
                                    }}
                                    className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500"
                                    style={{
                                       backfaceVisibility: "hidden",
                                       transformStyle: "preserve-3d",
                                    }}>
                                    Cash In
                                 </motion.div>
                              ) : (
                                 <motion.div
                                    key="cash-out"
                                    initial={{
                                       y: -100,
                                       rotateX: -80,
                                       opacity: 0,
                                    }}
                                    animate={{ y: 0, rotateX: 0, opacity: 1 }}
                                    exit={{ y: 100, rotateX: 80, opacity: 0 }}
                                    transition={{
                                       type: "spring",
                                       stiffness: 300,
                                       damping: 10,
                                    }}
                                    className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
                                    style={{
                                       backfaceVisibility: "hidden",
                                       transformStyle: "preserve-3d",
                                    }}>
                                    Cash Out
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>
                        <span className="text-white block mt-0.5">
                           It's that simple
                        </span>
                     </h1>
                  </div>

                  <motion.p
                     className="text-gray-300 text-base md:text-lg mb-8 mt-6"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.6, delay: 0.4 }}>
                     Fast Deposits, Quick Withdrawals — No Complications.
                  </motion.p>

                  <motion.div
                     className="flex flex-wrap gap-4"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.6, delay: 0.6 }}>
                     {authenticated ? (
                        <motion.button
                           onClick={logout}
                           variants={buttonVariants}
                           whileHover="hover"
                           whileTap="tap"
                           className="bg-red-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300">
                           Disconnect
                        </motion.button>
                     ) : (
                        <motion.button
                           onClick={handleConnect}
                           variants={buttonVariants}
                           whileHover="hover"
                           whileTap="tap"
                           className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300">
                           Get Started
                        </motion.button>
                     )}

                     <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() =>
                           window.open("https://t.me/ABOKI_RAMP_BOT", "_blank")
                        }
                        className="bg-[#fff] border border-purple-400 text-purple-600 hover:text-purple-400 hover:border-purple-400 font-semibold py-3 px-8 rounded-full flex gap-2 items-center transition-all duration-300">
                        <FaTelegram
                           size={24}
                           className="hover:text-purple-500 transition-colors"
                        />

                        <span className="text-sm font-medium">
                           Use Telegram
                        </span>
                     </motion.button>
                  </motion.div>
               </motion.div>

               <motion.div
                  className="w-full md:w-1/2"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  style={{ opacity }}>
                  <SwapCard />
               </motion.div>
            </div>
         </div>
      </div>
   );
};

export default HeroSection;
