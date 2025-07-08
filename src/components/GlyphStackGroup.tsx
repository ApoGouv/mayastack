import React from "react";

import GlyphStack from "@components/GlyphStack";

type GlyphStackGroupProps = {
  digits: number[];
  centerX: number;
  heightPerGlyphStack: number;
  scale?: number;
};

const GlyphStackGroup: React.FC<GlyphStackGroupProps> = ({
  digits,
  centerX,
  heightPerGlyphStack,
  scale = 1,
}) => {
  return (
    <>
      {digits.map((digit, index) => {
        const yOffset = index * heightPerGlyphStack;

        const exponent = digits.length - index - 1;
        const multiplier = Math.pow(20, exponent);
        const digitBase10Value = digit * multiplier;

        return (
          <g
            key={`${index}-${digit}-${exponent}`}
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
    </>
  );
};

export default GlyphStackGroup;
