import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  height?: number;
}

export const DitoLogo: React.FC<LogoProps> = ({ className = '', height = 36 }) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src="/logo.webp"
        alt="Dito Logo"
        style={{ height: `${height}px`, width: 'auto' }}
        className="object-contain"
      />
    </div>
  );
};
