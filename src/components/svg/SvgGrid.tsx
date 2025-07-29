import React from "react";

interface SvgGridProps {
  show?: boolean;
  width?: number | string;
  height?: number | string;
  gridSize?: number;
  stroke?: string;
  strokeWidth?: number;
  id?: string;
}

const SvgGrid: React.FC<SvgGridProps> = ({
  show = true,
  width = "100%",
  height = "100%",
  gridSize = 20,
  stroke = "#ddd",
  strokeWidth = 1,
  id = "grid",
}) => {
  if (!show) return null;

  const inset = 2 * strokeWidth;

  return (
    <>
      <defs>
        <pattern
          id={id}
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect 
        x={inset}
        y={inset}
        width={`calc(100% - ${inset * 2}px)`}
        height={`calc(100% - ${inset * 2}px)`}
        fill={`url(#${id})`}
      />
    </>
  );
};

export default SvgGrid;
