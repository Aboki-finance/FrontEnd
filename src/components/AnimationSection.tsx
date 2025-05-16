// import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from "framer-motion"; //Remove AnimatePresence if not used
import CryptoFlowAnimation from "./CryptoFlowAnimation";

const HeroSection = () => {
   const { scrollY } = useScroll();
   const y = useTransform(scrollY, [0, 300], [0, 100]);
   // const opacity = useTransform(scrollY, [0, 300], [1, 0]);
   // const [isFirstText, setIsFirstText] = useState(true);

   // useEffect(() => {
   //   const interval = setInterval(() => {
   //     setIsFirstText(prev => !prev);
   //   }, 4000);

   //   return () => clearInterval(interval);
   // }, []);

   return (
      <div className="relative min-h-[20vh] flex flex-col justify-center py-20 overflow-hidden">
         {/* Enhanced animated background gradients */}
         <div className="absolute inset-0 bg-[#0e1117] overflow-hidden">
            <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-700/30 to-blue-700/30 blur-[120px] animate-pulse"
               style={{ y }}
            />
            <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
               className="absolute top-[40%] right-[15%] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-pink-700/30 to-purple-700/30 blur-[120px] animate-pulse"
               style={{ y: useTransform(scrollY, [0, 300], [0, -50]) }}
            />
            <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
               className="absolute bottom-[10%] left-[30%] w-[300px] h-[300px] rounded-full bg-gradient-to-r from-blue-700/20 to-cyan-700/20 blur-[100px] animate-pulse"
               style={{ y: useTransform(scrollY, [0, 300], [0, 50]) }}
            />
         </div>

         {/* <div className="relative z-10 container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-center">
          <motion.div 
            className="w-full md:w-1/2 mb-12 md:mb-0 md:pr-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="relative">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                <div className="h-[80px] md:h-[100px] relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isFirstText ? (
                      <motion.div
                        key="cash-in"
                        initial={{ 
                          y: 100,
                          rotateX: -80,
                          opacity: 0
                        }}
                        animate={{ 
                          y: 0,
                          rotateX: 0,
                          opacity: 1
                        }}
                        exit={{ 
                          y: -100,
                          rotateX: 80,
                          opacity: 0
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500"
                        style={{ 
                          backfaceVisibility: "hidden",
                          transformStyle: "preserve-3d"
                        }}
                      >
                        Cash In
                      </motion.div>
                    ) : (
                      <motion.div
                        key="cash-out"
                        initial={{ 
                          y: 100,
                          rotateX: -80,
                          opacity: 0
                        }}
                        animate={{ 
                          y: 0,
                          rotateX: 0,
                          opacity: 1
                        }}
                        exit={{ 
                          y: -100,
                          rotateX: 80,
                          opacity: 0
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
                        style={{ 
                          backfaceVisibility: "hidden",
                          transformStyle: "preserve-3d"
                        }}
                      >
                        Cash Out
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-white block mt-2">It's that simple</span>
              </h1>
            </div>
            
            <motion.p
              className="text-gray-300 text-lg md:text-xl mb-8 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Fast Deposits, Quick Withdrawals - No Complications.
            </motion.p>
            
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Link to="/app">
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(147, 51, 234, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300"
                >
                  Get Started
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  borderColor: "rgba(147, 51, 234, 0.8)"
                }}
                whileTap={{ scale: 0.95 }}
                className="bg-transparent border border-purple-500 text-purple-500 hover:text-purple-400 hover:border-purple-400 font-semibold py-3 px-8 rounded-full transition-all duration-300"
              >
                Learn More
              </motion.button>
            </motion.div>
          </motion.div>
          
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ opacity }}
          >
            <SwapCard />
          </motion.div>
        </div>
      </div> */}
         <CryptoFlowAnimation
            logoSrc="src/assets/logo.png"
            logoSize="80px"
            logoBackgroundColor="rgba(20, 20, 30, 0.9)"
            cryptoVariants={["Bitcoin", "USDT", "ETH", "Stellar"]}
            cashVariants={["Naira", "Pounds", "Cedis"]}
            cryptoColor="56, 189, 248" // Blue (RGB format)
            cashColor="250, 204, 21" // Yellow (RGB format)
            height="350px"
            width="100%"
            animationSpeed={1.2} // Slightly faster
         />
      </div>
   );
};

export default HeroSection;
