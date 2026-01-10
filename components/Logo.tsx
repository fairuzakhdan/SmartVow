
import React from 'react';

export const SmartVowLogo: React.FC<{ className?: string, variant?: 'light' | 'dark' | 'color' }> = ({ className = "w-10 h-10", variant = 'color' }) => {
  return (
    <img 
      src="/images/iconlogo.png" 
      alt="SmartVow Logo"
      className={className}
    />
  );
};

export default SmartVowLogo;
