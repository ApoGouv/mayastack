import React from 'react';

interface LogoProps {
  className?: string;
  size?: number; // Optional size prop
  color?: string; // Optional explicit color override
}

const Logo: React.FC<LogoProps> = ({
  className,
  size = 40,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 60 60"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    fill={color}
    aria-label="Mayan numeral logo"
    role="img"
  >
    <path d="M15 10 H45" stroke={color} strokeWidth="4" strokeLinecap="round" />

    <circle cx="30" cy="30" r="3" fill={color} />

    <path d="M15 50 H45" stroke={color} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export default Logo;
