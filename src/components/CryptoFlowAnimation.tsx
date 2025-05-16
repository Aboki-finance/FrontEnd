import { useState, useEffect, useRef } from "react";
import "./CryptoFlowAnimation.css";
import logoimg from "../assets/logo.png";

interface CryptoFlowAnimationProps {
   width?: string;
   height?: string;
   logoSrc?: string;
   logoSize?: string;
   logoBackgroundColor?: string;
   cryptoVariants?: string[];
   cashVariants?: string[];
   finalWords?: string[];
   cryptoColor?: string;
   cashColor?: string;
   finalColor?: string;
   animationSpeed?: number;
   linesYOffset?: number[];
   backgroundColor?: string;
}

interface Particle {
   id: string; // Changed to string
   text: string;
   targetText: string;
   x: number;
   yOffset: number;
   speed: number;
   opacity: number;
   transitioning: boolean;
   transitionProgress: number;
}

const CryptoFlowAnimation: React.FC<CryptoFlowAnimationProps> = ({
   width = "100%",
   height = "400px",
   logoSrc = logoimg,
   logoSize = "64px",
   logoBackgroundColor = "rgba(30, 30, 30, 0.8)",
   cryptoVariants = ["Bitcoin", "USDT", "ETH", "Stellar"],
   cashVariants = ["Naira", "Pounds", "Cedis"],
   finalWords = ["HTML", "CSS", "JavaScript"],
   cryptoColor = "56, 189, 248",
   // 
   finalColor = "148, 163, 184",
   animationSpeed = 1,
   linesYOffset = [-30, 0, 30],
   backgroundColor = "transparent",
}) => {
   const [particles, setParticles] = useState<Particle[]>([]);
   const animationRef = useRef<number | null>(null);
   const lastTimeRef = useRef<number>(0);
   const containerRef = useRef<HTMLDivElement>(null);
   const logoRef = useRef<HTMLDivElement>(null);
   const logoHorizontalCenterRef = useRef<number>(0);

   useEffect(() => {
      if (containerRef.current) {
         const containerWidth = containerRef.current.offsetWidth;
         logoHorizontalCenterRef.current = containerWidth / 2;
      }
   }, []);

   useEffect(() => {
      const initialParticles = linesYOffset.flatMap((yOffset, lineIndex) => {
         return cryptoVariants.slice(0, 3).map((crypto, index) => ({
            id: `${lineIndex}-${index}`,
            text: crypto,
            targetText:
               cashVariants[(lineIndex * 3 + index) % cashVariants.length],
            x: Math.random() * -100 - 50, // Start off-screen left
            yOffset: yOffset,
            speed:
               0.08 * animationSpeed + Math.random() * 0.02 * animationSpeed,
            opacity: 0.8 + Math.random() * 0.2,
            transitioning: false,
            transitionProgress: 0,
         }));
      });
      setParticles(initialParticles);
   }, [cryptoVariants, cashVariants, animationSpeed, linesYOffset]);

   useEffect(() => {
      if (
         !particles.length ||
         !containerRef.current ||
         logoHorizontalCenterRef.current === 0
      )
         return;

      const animate = (timestamp: number): void => {
         if (!lastTimeRef.current) lastTimeRef.current = timestamp;
         const deltaTime = timestamp - lastTimeRef.current;
         lastTimeRef.current = timestamp;

         const containerWidth = containerRef.current?.offsetWidth || 0; // Use optional chaining with fallback
         const logoCenter = logoHorizontalCenterRef.current;

         setParticles((prevParticles) => {
            return prevParticles.map((particle) => {
               let newX = particle.x + (particle.speed * deltaTime) / 16;
               let newText = particle.text;
               let newOpacity = particle.opacity;
               let transitioning = particle.transitioning;
               let transitionProgress = particle.transitionProgress;

               // Transition when reaching the logo's horizontal center
               const logoCenterPercentage = (logoCenter / containerWidth) * 100;
               const transitionStart = logoCenterPercentage - 5;
               const transitionEnd = logoCenterPercentage + 5;

               if (
                  newX >= transitionStart &&
                  newX <= transitionEnd &&
                  !transitioning
               ) {
                  transitioning = true;
                  transitionProgress = 0;
               }

               if (transitioning) {
                  transitionProgress = Math.min(
                     1,
                     transitionProgress + 0.03 * animationSpeed
                  );
                  newOpacity = 1 - transitionProgress;
                  const particleIndex = prevParticles.findIndex(
                     (p) => p.id === particle.id
                  );
                  const finalWordIndex = particleIndex % finalWords.length;
                  newText = finalWords[finalWordIndex];
                  if (transitionProgress >= 1) {
                     return {
                        ...particle,
                        transitioning: true,
                        transitionProgress: 1,
                        text: newText,
                        opacity: 1,
                     };
                  }
               } else {
                  // Basic glow effect
                  const distanceToCenter = Math.abs(newX - 50);
                  newOpacity = 0.7 + Math.max(0, 0.3 - distanceToCenter / 50);
               }

               // Recycle particle
               if (newX > 120) {
                  const lineIndexStr = particle.id.split("-")[0];
                  const lineIndex = parseInt(lineIndexStr, 10);
                  const cryptoIndex = Math.floor(
                     Math.random() * cryptoVariants.length
                  );
                  return {
                     ...particle,
                     id: `${lineIndex}-${Math.random()}`, // New ID for recycled particle
                     x: Math.random() * -100 - 50,
                     text: cryptoVariants[cryptoIndex],
                     targetText:
                        cashVariants[
                           Math.floor(Math.random() * cashVariants.length)
                        ],
                     transitioning: false,
                     transitionProgress: 0,
                     opacity: 0.8 + Math.random() * 0.2,
                  };
               }

               return {
                  ...particle,
                  x: newX,
                  text: newText,
                  opacity: newOpacity,
                  transitioning,
                  transitionProgress,
               };
            });
         });

         animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
         if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
         }
      };
   }, [particles, animationSpeed, finalWords]);

   return (
      <div
         ref={containerRef}
         className="crypto-flow-container"
         style={{
            position: "relative",
            width: width,
            height: height,
            backgroundColor: backgroundColor,
            overflow: "hidden",
         }}>
         {/* Horizontal lines */}
         {linesYOffset.map((yOffset, index) => (
            <div
               key={`line-${index}`}
               style={{
                  position: "absolute",
                  width: "100%",
                  height: "1px",
                  background: "rgba(255, 255, 255, 0.1)",
                  top: `calc(50% + ${yOffset}px)`,
               }}
            />
         ))}

         {particles.map((particle) => (
            <div
               key={particle.id}
               style={{
                  position: "absolute",
                  left: `${particle.x}%`,
                  top: `calc(50% + ${particle.yOffset}px)`,
                  opacity: particle.opacity,
                  color: `rgb(${
                     particle.transitioning ? finalColor : cryptoColor
                  })`,
                  fontFamily: "monospace",
                  fontSize: "16px",
                  fontWeight: "bold",
                  textShadow: `0 0 10px rgba(${
                     particle.transitioning ? finalColor : cryptoColor
                  }, ${particle.opacity})`,
                  transform: "translateX(-50%)",
                  transition: "opacity 0.2s ease",
               }}>
               {particle.text}
            </div>
         ))}

         <div
            ref={logoRef}
            className="logo-container"
            style={{
               position: "absolute",
               top: "50%",
               left: "50%",
               transform: "translate(-50%, -50%)",
               width: logoSize,
               height: logoSize,
               zIndex: 20,
               backgroundColor: logoBackgroundColor,
               borderRadius: "8px",
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               boxShadow: `0 0 20px 5px rgba(121 85 207 , 0.3), 0 0 15px 3px rgba(168 85 247 , 0.3)`,
               animation: "pulse-glow 3s infinite",
            }}>
            <img
               src={logoSrc}
               alt="Logo"
               style={{
                  width: "80%",
                  height: "80%",
                  objectFit: "contain",
               }}
            />
         </div>
      </div>
   );
};

export default CryptoFlowAnimation;
