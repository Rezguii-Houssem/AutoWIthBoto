import React from "react";

/**
 * GridBackground component that creates a premium-looking grid background 
 * with a magenta/purple orb effect.
 */
export const GridBackground = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#06030b] relative overflow-hidden">
      {/* Magenta Orb Grid Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: "#06030b",
          backgroundImage: `
            linear-gradient(to right, rgba(147, 51, 234, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(147, 51, 234, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(217, 70, 239, 0.15) 0%, rgba(147, 51, 234, 0.05) 40%, transparent 70%)
          `,
          backgroundSize: "40px 40px, 40px 40px, 100% 100%",
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
