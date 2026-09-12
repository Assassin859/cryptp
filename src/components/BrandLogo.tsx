import React from 'react';

type BrandLogoProps = {
  size?: number;
  className?: string;
  alt?: string;
};

/** Aethon mark from `/public/aethon-logo.png` (Vite static asset). */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 32,
  className = '',
  alt = 'Aethon',
}) => (
  <img
    src="/aethon-logo.png"
    width={size}
    height={size}
    alt={alt}
    className={`rounded-lg object-cover shrink-0 ${className}`}
    draggable={false}
  />
);

export default BrandLogo;
