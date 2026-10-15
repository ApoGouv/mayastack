import React from "react";

import GlyphStack from "@components/GlyphStack";
import { getPlaceValues } from "@utils/base20";

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
      {getPlaceValues(digits).map(({ digit, exponent, multiplier, value }, index) => {
        // Compute Y offset for each digit to ensure vertical bottom alignment of stacks
        // inside the given totalHeight. Each digit stack is rendered upward from this Y.
        const yOffset = totalHeight - (digits.length - index) * heightPerGlyphStack;

        return (
          <g
            key={`${index}-${digit}-${exponent}`}
            data-digit-index={index}
            data-digit-value={digit}
            data-digit-exponent={exponent}
            // Exact integer strings (bigint), never rounded or in exponent notation
            data-digit-multiplier={multiplier.toString()}
            data-digit-base10-value={value.toString()}
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
