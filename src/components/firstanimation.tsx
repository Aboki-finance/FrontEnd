import { useState, useEffect, useRef } from "react";

interface Particle {
   id: number;
   text: string;
   targetText: string;
   position: number;
   speed: number;
   opacity: number;
   yOffset: number;
}

export default function CryptoToCashAnimation(): JSX.Element {
   const cryptoVariants = ["Bitcoin", "USDT", "ETH", "Stellar"];
   const cashVariants = ["Naira", "Pounds", "Cedis"];

   const [particles, setParticles] = useState<Particle[]>([]);
   const animationRef = useRef<number | null>(null);
   const lastTimeRef = useRef<number>(0);

   useEffect(() => {
      // Initial setup with staggered positions
      setParticles([
         {
            id: 1,
            text: cryptoVariants[0],
            targetText: cashVariants[0],
            position: 15,
            speed: 0.12,
            opacity: 0.8,
            yOffset: -30,
         },
         {
            id: 2,
            text: cryptoVariants[1],
            targetText: cashVariants[1],
            position: -25,
            speed: 0.1,
            opacity: 0.8,
            yOffset: 0,
         },
         {
            id: 3,
            text: cryptoVariants[2],
            targetText: cashVariants[2],
            position: -65,
            speed: 0.14,
            opacity: 0.8,
            yOffset: 30,
         },
      ]);

      // Animation loop using requestAnimationFrame
      const animate = (timestamp: number): void => {
         if (!lastTimeRef.current) lastTimeRef.current = timestamp;
         const deltaTime = timestamp - lastTimeRef.current;
         lastTimeRef.current = timestamp;

         setParticles((prev) =>
            prev.map((particle) => {
               // Calculate new position based on speed and deltaTime
               let newPosition =
                  (particle.position + particle.speed * deltaTime) / 16;
               let newText = particle.text;
               let newOpacity = particle.opacity;

               // Transform crypto to cash when passing through the logo
               if (
                  newPosition >= 47 &&
                  newPosition <= 53 &&
                  cryptoVariants.includes(newText)
               ) {
                  newText = particle.targetText;
               }

               // Adjust opacity based on position (brighter near the logo)
               if (newPosition >= 30 && newPosition <= 70) {
                  // Calculate distance from center (0 at center, 1 at edges)
                  const distFromCenter = Math.abs(newPosition - 50) / 20;
                  newOpacity = 1 - distFromCenter * 0.2; // 1 at center, 0.8 at edges
               } else {
                  newOpacity = 0.8;
               }

               // Reset particles that go off-screen
               if (newPosition > 110) {
                  newPosition = -20;
                  // Assign new random variants
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
                  };
               }

               return {
                  ...particle,
                  position: newPosition,
                  text: newText,
                  opacity: newOpacity,
               };
            })
         );

         animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
         if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current);
         }
      };
   }, []); // no dynamic deps

   return (
      <div className="relative flex items-center justify-center h-64 w-full bg-gradient-to-br from-blue-900 to-purple-900 overflow-hidden">
         {/* Background grid lines for reference */}
         <div className="absolute inset-0 grid grid-cols-4 grid-rows-3">
            {Array.from({ length: 12 }).map((_, i) => (
               <div key={i} className="border border-blue-900/20" />
            ))}
         </div>

         {/* Vite Logo at the center */}
         <div
            className="absolute z-20"
            style={{
               top: "50%",
               left: "50%",
               transform: "translate(-50%, -50%)",
            }}>
            <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center shadow-xl">
               <div className="w-10 h-10 relative">
                  {/* Simplified Vite logo */}
                  <div className="absolute inset-0 bg-purple-600 transform rotate-45 rounded-sm" />
                  <div className="absolute inset-1 bg-blue-400 transform rotate-45 rounded-sm clip-triangle" />
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-yellow-400 transform rotate-45 rounded-sm glow-effect" />
               </div>
            </div>
         </div>

         {/* Semi-transparent horizontal lines across the entire width */}
         {[-30, 0, 30].map((yOffset, index) => (
            <div
               key={index}
               className="absolute w-full h-px bg-slate-500/10"
               style={{ top: `calc(50% + ${yOffset}px)` }}
            />
         ))}

         {/* Animated particles with enhanced glowing lines */}
         {particles.map((particle) => {
            const isCrypto = cryptoVariants.includes(particle.text);
            const baseColor = isCrypto ? "56, 189, 248" : "250, 204, 21"; // Blue for crypto, yellow for cash

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
                  className="absolute z-10"
                  style={{
                     top: `calc(50% + ${particle.yOffset}px)`,
                     left: "0",
                     width: "100%",
                     height: "2px",
                     opacity: particle.opacity,
                  }}>
                  {/* Semi-transparent base line */}
                  <div
                     className="absolute w-full h-px"
                     style={{
                        backgroundColor: `rgba(${baseColor}, 0.15)`,
                        top: "0",
                     }}
                  />

                  {/* Glowing segments */}
                  {particle.position < 50 ? (
                     <div
                        className="absolute h-px"
                        style={{
                           left: `${particle.position}%`,
                           width: `${50 - particle.position}%`,
                           background: `linear-gradient(to right, rgba(${baseColor}, ${
                              glowIntensity * 0.7
                           }) 0%, rgba(${baseColor}, ${glowIntensity}) 100%)`,
                           boxShadow: `0 0 ${4 + glowIntensity * 8}px ${
                              glowIntensity * 3
                           }px rgba(${baseColor}, ${glowIntensity * 0.7})`,
                           filter: `blur(${glowIntensity * 0.5}px)`,
                        }}
                     />
                  ) : (
                     <div
                        className="absolute h-px"
                        style={{
                           left: "50%",
                           width: `${particle.position - 50}%`,
                           background: `linear-gradient(to right, rgba(${baseColor}, ${glowIntensity}) 0%, rgba(${baseColor}, ${
                              glowIntensity * 0.7
                           }) 100%)`,
                           boxShadow: `0 0 ${4 + glowIntensity * 8}px ${
                              glowIntensity * 3
                           }px rgba(${baseColor}, ${glowIntensity * 0.7})`,
                           filter: `blur(${glowIntensity * 0.5}px)`,
                        }}
                     />
                  )}

                  {/* Enhanced glowing dot */}
                  <div
                     className="absolute"
                     style={{
                        left: `${particle.position}%`,
                        top: "-3px",
                        transform: "translateX(-50%)",
                        width: "6px",
                        height: "6px",
                     }}>
                     <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                           width: "4px",
                           height: "4px",
                           backgroundColor: `rgba(${baseColor}, 1)`,
                           zIndex: 2,
                        }}
                     />
                     <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                           width: "8px",
                           height: "8px",
                           backgroundColor: `rgba(${baseColor}, 0.6)`,
                           filter: `blur(2px)`,
                           zIndex: 1,
                        }}
                     />
                     <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                           width: `${12 + glowIntensity * 8}px`,
                           height: `${12 + glowIntensity * 8}px`,
                           backgroundColor: `rgba(${baseColor}, 0.3)`,
                           boxShadow: `0 0 ${8 + glowIntensity * 10}px ${
                              4 + glowIntensity * 4
                           }px rgba(${baseColor}, ${
                              0.3 + glowIntensity * 0.4
                           })`,
                           filter: `blur(${3 + glowIntensity * 2}px)`,
                           zIndex: 0,
                        }}
                     />
                  </div>

                  {/* Text label */}
                  <div
                     className="absolute font-mono text-xs font-medium whitespace-nowrap"
                     style={{
                        left: `${particle.position}%`,
                        top: "-18px",
                        transform: "translateX(-50%)",
                        color: `rgb(${baseColor})`,
                        textShadow: `0 0 ${
                           5 + glowIntensity * 7
                        }px rgba(${baseColor}, ${0.5 + glowIntensity * 0.5})`,
                        zIndex: 5,
                     }}>
                     {particle.text}
                  </div>
               </div>
            );
         })}

         {/* Style for glowing effects */}
         <style>{`
            .glow-effect {
               box-shadow: 0 0 15px 5px rgba(56, 189, 248, 0.7);
               animation: pulse 2s infinite ease-in-out;
            }
            .clip-triangle {
               clip-path: polygon(100% 0, 0 0, 50% 100%);
            }
            @keyframes pulse {
               0%,
               100% {
                  box-shadow: 0 0 15px 5px rgba(56, 189, 248, 0.7);
               }
               50% {
                  box-shadow: 0 0 25px 8px rgba(56, 189, 248, 0.9);
               }
            }
         `}</style>
      </div>
   );
}
