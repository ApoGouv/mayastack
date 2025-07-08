import React from "react";
import { isDev } from '@utils/env';

import GlyphStack from '@components/GlyphStack';

import '@components/MayanNumeralRenderer.css';


type Props = {
  digits: number[]; // e.g. [6, 3] from toBase20()
  heightPerGlyphStack?: number; // spacing per level
  scale?: number;
  width?: number;
  showGrid?: boolean;
};


/**
 * Renders a vertical stack of base-20 digits using Mayan numeral visuals.
 * Dots represent 1, bars represent 5, and a shell (🯰 or ⛶ or circle) represents 0.
 */
const MayanNumeralRenderer: React.FC<Props> = ({
  digits,
  heightPerGlyphStack = 100,
  width,
  scale = 1,
  showGrid = false,
}) => {
  const gridActive = isDev && showGrid;
  const svgWidth = width ?? 100;
  const centerX = svgWidth / 2;

  return (
    <svg
      width={svgWidth}
      height={digits.length * heightPerGlyphStack}
      className={`svg-bg ${gridActive ? 'svg-grid' : ''}`}
    >
      {digits.map((digit, index) => {
        const yOffset = index * heightPerGlyphStack;

        const exponent = digits.length - index - 1;
        const multiplier = Math.pow(20, exponent);
        const digitBase10Value = digit * multiplier;

        return (
          <g key={index} 
            data-digit-index={index} 
            data-digit-value={digit}
            data-digit-exponent={exponent}
            data-digit-multiplier={multiplier}
            data-digit-base10-value={digitBase10Value}
          >
            <GlyphStack
              digit={digit}
              x={centerX}
              y={yOffset}
              heightPerGlyphStack={heightPerGlyphStack}
              scale={scale}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default MayanNumeralRenderer;
