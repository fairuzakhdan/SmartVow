
import React from 'react';

export const SmartVowLogo: React.FC<{ className?: string, variant?: 'light' | 'dark' | 'color' }> = ({ className = "w-10 h-10", variant = 'color' }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Ring 1 - The Traditional Vow */}
      <circle 
        cx="40" 
        cy="50" 
        r="25" 
        stroke="currentColor" 
        strokeWidth="8"
        className={variant === 'color' ? 'text-indigo-600' : 'text-current'}
      />
      
      {/* Ring 2 - The Digital Chain (Hexagonal/Geometric) */}
      <path 
        d="M60 25L81.6506 37.5V62.5L60 75L38.3494 62.5V37.5L60 25Z" 
        stroke="currentColor" 
        strokeWidth="8"
        strokeLinejoin="round"
        className={variant === 'color' ? 'text-rose-500' : 'text-current'}
      />

      {/* Interlocking Intersection Highlight */}
      <path 
        d="M48 35C52 38 55 44 55 50C55 56 52 62 48 65" 
        stroke="white" 
        strokeWidth="4" 
        strokeLinecap="round"
        className="opacity-40"
      />
      
      {/* Small "Node" point to emphasize blockchain */}
      <circle 
        cx="60" 
        cy="50" 
        r="4" 
        fill="currentColor"
        className={variant === 'color' ? 'text-rose-500' : 'text-current'}
      />
    </svg>
  );
};

export default SmartVowLogo;
