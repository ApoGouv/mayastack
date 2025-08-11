import React, { useId } from 'react';
import { Tooltip } from 'react-tooltip';

interface LogoProps {
  className?: string;
  size?: number; // Optional size prop
  color?: string; // Optional explicit color override
  tooltip?: boolean;
  tooltipId?: string;
  showBackground?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className,
  size = 40,
  color = 'currentColor',
  tooltip = true,
  tooltipId,
  showBackground = true,
}) => {
  const generatedId = useId();
  const logoTooltipId = tooltipId ?? `logo-tooltip-${generatedId}`;
  const logoTooltipContent = 'a.k.a. 2025'

  
  return (
    <>
      <svg
        viewBox="0 0 60 60"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className={className}
        fill={color}
        aria-label="Mayan numeral logo"
        role="img"
        data-tooltip-id={tooltip ? logoTooltipId : undefined}
        data-tooltip-html={tooltip ? logoTooltipContent : undefined}
      >
        {showBackground && (
          <circle cx="30" cy="30" r="28" fill="#b3482e" />
        )}

        <path d="M15 15 H45" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <circle cx="30" cy="30" r="6" fill={color} />
        <path d="M15 45 H45" stroke={color} strokeWidth="5" strokeLinecap="round" />
      </svg>
      {tooltip && (
        <Tooltip
          id={logoTooltipId}
          className="z-50 !max-w-sm !bg-gray-800 !text-white !text-sm !rounded !p-2"
          place="bottom"
          offset={10}
        />
      )}
    </>
  );
};

export default Logo;
