import React from "react";

const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 360 320" // ← Update this if needed based on your SVG
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
  >
    <g data-digit-index="0" data-digit-value="5" data-digit-exponent="2" data-digit-multiplier="400" data-digit-base10-value="2000">
        <path d="M148 92 H192" stroke="currentColor" stroke-width="6"/>
    </g>
    <g data-digit-index="1" data-digit-value="1" data-digit-exponent="1" data-digit-multiplier="20" data-digit-base10-value="20">
        <circle cx="170" cy="190" r="5" fill="currentColor"/>
    </g>
    <g data-digit-index="2" data-digit-value="5" data-digit-exponent="0" data-digit-multiplier="1" data-digit-base10-value="5">
        <path d="M148 292 H192" stroke="currentColor" stroke-width="6"/>
    </g>
  </svg>
);

export default Logo;
