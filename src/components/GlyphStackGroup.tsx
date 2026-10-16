import React from "react";

import GlyphStack from "@components/GlyphStack";

interface GlyphStackGroupProps {
  digits: number[];
  centerX: number;
  totalHeight: number;
  heightPerGlyphStack: number;
  scale?: number;
}

const GlyphStackGroup: React.FC<GlyphStackGroupProps> = ({
  digits,
  centerX,
  totalHeight,
  heightPerGlyphStack,
  scale = 1,
}) => {
  return (
    <>
      {digits.map((digit, index) => {
        // Compute Y offset for each digit to ensure vertical bottom alignment of stacks
        // inside the given totalHeight. Each digit stack is rendered upward from this Y.
        const yOffset = totalHeight - (digits.length - index) * heightPerGlyphStack;
        const exponent = digits.length - index - 1;

        // The digit and its exponent fully determine its place value (digit × 20^exponent).
        // The place value itself is not written out: its text grows with the exponent,
        // which made the SVG grow quadratically with the number of digits.
        return (
          <g
            key={`${index}-${digit}-${exponent}`}
            data-digit-index={index}
            data-digit-value={digit}
            data-digit-exponent={exponent}
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
    </>
  );
};

export default GlyphStackGroup;
