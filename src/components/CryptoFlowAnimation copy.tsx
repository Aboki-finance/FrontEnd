import { useState, useEffect, useRef } from "react";
import "./CryptoFlowAnimation.css";
import logoimg from "../assets/logo.png";

// Define types for our props and particle state
interface CryptoFlowAnimationProps {
   width?: string;
   height?: string;
   logoSrc?: string;
   logoSize?: string;
   logoBackgroundColor?: string;
   cryptoVariants?: string[];
   cashVariants?: string[];
   cryptoColor?: string;
   cashColor?: string;
   animationSpeed?: number;
   linesYOffset?: number[];
   backgroundColor?: string;
}

interface Particle {
   id: number;
   text: string;
   targetText: string;
   position: number;
   speed: number;
   opacity: number;
   yOffset: number;
   transitioning: boolean;
   transitionProgress: number;
}

const CryptoFlowAnimation: React.FC<CryptoFlowAnimationProps> = ({
   // Customizable props with defaults
   width = "100%",
   height = "400px",
   logoSrc = logoimg,
   logoSize = "64px",
   logoBackgroundColor = "rgba(30, 30, 30, 0.8)",
   cryptoVariants = ["Bitcoin", "USDT", "ETH", "Stellar"],
   cashVariants = ["Naira", "Pounds", "Cedis"],
   cryptoColor = "56, 189, 248",
   cashColor = "250, 204, 21",
   animationSpeed = 1, // Multiplier for animation speed
   linesYOffset = [-30, 0, 30], // Vertical positions for the lines
   backgroundColor = "transparent",
}) => {
   const [particles, setParticles] = useState<Particle[]>([]);
   const animationRef = useRef<number | null>(null);
   const lastTimeRef = useRef<number>(0);
   const containerRef = useRef<HTMLDivElement>(null);

   // Initialize particles with staggered positions
   useEffect(() => {
      setParticles([
         {
            id: 1,
            text: cryptoVariants[0],
            targetText: cashVariants[0],
            position: 1, // Start further left, off-screen
            speed: 0.12 * animationSpeed,
            opacity: 0.8,
            yOffset: linesYOffset[0],
            transitioning: false,
            transitionProgress: 0,
         },
         {
            id: 2,
            text: cryptoVariants[1],
            targetText: cashVariants[1],
            position: 25,
            speed: 0.1 * animationSpeed,
            opacity: 0.8,
            yOffset: linesYOffset[1],
            transitioning: false,
            transitionProgress: 0,
         },
         {
            id: 3,
            text: cryptoVariants[2],
            targetText: cashVariants[2],
            position: 45,
            speed: 0.14 * animationSpeed,
            opacity: 0.8,
            yOffset: linesYOffset[2],
            transitioning: false,
            transitionProgress: 0,
         },
      ]);
   }, [cryptoVariants, cashVariants, animationSpeed, linesYOffset]);

   useEffect(() => {
      if (!particles.length) return;

      // Optimization: use a function ref for animation to avoid unnecessary re-renders
      const animate = (timestamp: number): void => {
         if (!lastTimeRef.current) lastTimeRef.current = timestamp;
         const deltaTime = timestamp - lastTimeRef.current;
         lastTimeRef.current = timestamp;

         setParticles((prevParticles) => {
            return prevParticles.map((particle) => {
               // Calculate new position
               let newPosition =
                  particle.position + (particle.speed * deltaTime) / 16;
               let newText = particle.text;
               let newOpacity = particle.opacity;
               let transitioning = particle.transitioning;
               let transitionProgress = particle.transitionProgress;

               // Start transition when approaching the center
               const transitionStartPoint = 45;
               const transitionEndPoint = 55;

               // Handle transition state
               if (
                  newPosition >= transitionStartPoint &&
                  newPosition <= transitionEndPoint &&
                  cryptoVariants.includes(newText) &&
                  !transitioning
               ) {
                  transitioning = true;
                  transitionProgress = 0;
               }

               // Progress the transition
               if (transitioning) {
                  // Calculate transition progress based on position
                  const range = transitionEndPoint - transitionStartPoint;
                  const positionInRange = newPosition - transitionStartPoint;
                  transitionProgress = Math.min(1, positionInRange / range);

                  // Complete transition
                  if (transitionProgress >= 1) {
                     newText = particle.targetText;
                     transitioning = false;
                     transitionProgress = 0;
                  }
               }

               // Enhanced glow effect near the center
               const distFromCenter = Math.abs(newPosition - 50);
               if (distFromCenter <= 20) {
                  // Closer to center = more opacity
                  newOpacity = 0.8 + ((20 - distFromCenter) / 20) * 0.2;
               } else {
                  newOpacity = 0.8;
               }

               // Smooth particle recycling with a fade-out/fade-in effect
               if (newPosition > 110) {
                  // Reset to start with new values
                  newPosition = -20;
                  const cryptoIndex = Math.floor(
                     Math.random() * cryptoVariants.length
                  );
                  const cashIndex = Math.floor(
                     Math.random() * cashVariants.length
                  );
                  newText = cryptoVariants[cryptoIndex];

                  return {
                     ...particle,
                     position: newPosition,
                     text: newText,
                     targetText: cashVariants[cashIndex],
                     opacity: 0.8,
                     transitioning: false,
                     transitionProgress: 0,
                  };
               }

               return {
                  ...particle,
                  position: newPosition,
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
   }, [particles.length, cryptoVariants, cashVariants]);

   // Render function for particles
   const renderParticle = (particle: Particle) => {
      const isCrypto = cryptoVariants.includes(particle.text);
      let baseColor = isCrypto ? cryptoColor : cashColor;

      // Handle transition blending of colors
      if (particle.transitioning) {
         const cryptoRGB = cryptoColor.split(",").map(Number);
         const cashRGB = cashColor.split(",").map(Number);

         // Blend colors based on transition progress
         const blendedRGB = cryptoRGB.map((val, idx) => {
            const cashVal = cashRGB[idx];
            return Math.round(
               val + (cashVal - val) * particle.transitionProgress
            );
         });

         baseColor = blendedRGB.join(", ");
      }

      // Calculate glow intensity based on proximity to center
      const distanceFromCenter = Math.abs(particle.position - 50);
      const maxGlowDistance = 20;
      const glowIntensity = Math.max(
         0.2,
         1 - distanceFromCenter / maxGlowDistance
      );

      return (
         <div
            key={particle.id}
            style={{
               position: "absolute",
               top: `calc(50% + ${particle.yOffset}px)`,
               left: "0",
               width: "100%",
               height: "2px",
               opacity: particle.opacity,
               zIndex: 10,
            }}>
            {/* Full width continuous line with variable opacity */}
            <div
               style={{
                  position: "absolute",
                  width: "100%",
                  height: "1px",
                  background: `linear-gradient(
                     to right,
                     rgba(${baseColor}, 0.1) 0%,
                     rgba(${baseColor}, 0.1) ${Math.max(
                     0,
                     particle.position - 20
                  )}%,
                     rgba(${baseColor}, ${glowIntensity * 0.7}) ${Math.max(
                     0,
                     particle.position - 5
                  )}%,
                     rgba(${baseColor}, ${glowIntensity}) ${particle.position}%,
                     rgba(${baseColor}, ${glowIntensity * 0.7}) ${Math.min(
                     100,
                     particle.position + 5
                  )}%,
                     rgba(${baseColor}, 0.1) ${Math.min(
                     100,
                     particle.position + 20
                  )}%,
                     rgba(${baseColor}, 0.1) 100%
                  )`,
               }}
            />

            {/* Enhanced glowing dot */}
            <div
               className="glowing-point"
               style={{
                  position: "absolute",
                  left: `${particle.position}%`,
                  top: "-3px",
                  transform: "translateX(-50%)",
                  width: "6px",
                  height: "6px",
               }}>
               {/* Inner bright core */}
               <div
                  style={{
                     position: "absolute",
                     left: "50%",
                     top: "50%",
                     transform: "translate(-50%, -50%)",
                     width: "4px",
                     height: "4px",
                     backgroundColor: `rgba(${baseColor}, 1)`,
                     borderRadius: "50%",
                     zIndex: 2,
                     animation:
                        distanceFromCenter < 10
                           ? "pulse-glow 1.5s infinite"
                           : "none",
                  }}
               />

               {/* Middle glow layer */}
               <div
                  style={{
                     position: "absolute",
                     left: "50%",
                     top: "50%",
                     transform: "translate(-50%, -50%)",
                     width: "8px",
                     height: "8px",
                     backgroundColor: `rgba(${baseColor}, 0.6)`,
                     borderRadius: "50%",
                     filter: `blur(2px)`,
                     zIndex: 1,
                  }}
               />

               {/* Outer glow layer - enhanced near the center */}
               <div
                  style={{
                     position: "absolute",
                     left: "50%",
                     top: "50%",
                     transform: "translate(-50%, -50%)",
                     width: `${12 + glowIntensity * 10}px`,
                     height: `${12 + glowIntensity * 10}px`,
                     backgroundColor: `rgba(${baseColor}, ${
                        0.3 + glowIntensity * 0.2
                     })`,
                     borderRadius: "50%",
                     boxShadow: `0 0 ${8 + glowIntensity * 12}px ${
                        4 + glowIntensity * 6
                     }px rgba(${baseColor}, ${0.3 + glowIntensity * 0.5})`,
                     filter: `blur(${3 + glowIntensity * 3}px)`,
                     zIndex: 0,
                     animation:
                        distanceFromCenter < 15
                           ? "pulse-glow 2s infinite"
                           : "none",
                  }}
               />
            </div>

            {/* Text label with transition effect */}
            <div
               style={{
                  position: "absolute",
                  left: `${particle.position}%`,
                  top: "-18px",
                  transform: "translateX(-50%)",
                  color: `rgb(${baseColor})`,
                  fontFamily: "monospace",
                  fontSize: "12px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  textShadow: `0 0 ${
                     5 + glowIntensity * 8
                  }px rgba(${baseColor}, ${0.5 + glowIntensity * 0.5})`,
                  zIndex: 5,
                  transition: "transform 0.3s ease-out",
                  ...(distanceFromCenter < 10 && {
                     transform: "translateX(-50%) scale(1.1)",
                     fontWeight: "700",
                  }),
               }}>
               {/* If transitioning, show fading text */}
               {particle.transitioning ? (
                  <div style={{ position: "relative", height: "18px" }}>
                     <span
                        style={{
                           position: "absolute",
                           opacity: 1 - particle.transitionProgress,
                           transition: "opacity 0.3s ease",
                        }}>
                        {particle.text}
                     </span>
                     <span
                        style={{
                           position: "absolute",
                           opacity: particle.transitionProgress,
                           transition: "opacity 0.3s ease",
                        }}>
                        {particle.targetText}
                     </span>
                  </div>
               ) : (
                  particle.text
               )}
            </div>
         </div>
      );
   };

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
         {/* Semi-transparent horizontal lines */}
         {linesYOffset.map((yOffset, index) => (
            <div
               key={`line-${index}`}
               style={{
                  position: "absolute",
                  width: "100%",
                  height: "1px",
                  background:
                     "linear-gradient(to right, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))",
                  top: `calc(50% + ${yOffset}px)`,
               }}
            />
         ))}

         {/* Animated particles */}
         {particles.map(renderParticle)}

         {/* Logo container with enhanced glow effect */}
         <div
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
               // boxShadow: `0 0 20px 5px rgba(${cryptoColor}, 0.3),
               //            0 0 15px 3px rgba(${cashColor}, 0.3)`,
               boxShadow: `0 0 20px 5px rgba(121 85 207 , 0.3),
                          0 0 15px 3px rgba(168 85 247 , 0.3)`,
               animation: "pulse-glow 3s infinite",
            }}>
            <img
               src={logoSrc}
               alt="Logo"
               style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
               }}
            />
         </div>
      </div>
   );
};

export default CryptoFlowAnimation;
