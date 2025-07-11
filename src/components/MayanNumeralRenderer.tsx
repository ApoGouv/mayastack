import React from "react";

import GlyphStackGroup from "@components/GlyphStackGroup";

type Props = {
  digits: number[]; // e.g. [6, 3] from toBase20()
  heightPerGlyphStack?: number; // spacing per level
  scale?: number;
  width?: number;
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
}) => {
  const svgWidth = width ?? 100;
  const maxHeight = digits.length * heightPerGlyphStack;
  const centerX = svgWidth / 2;

  return (
    <svg
      width={svgWidth}
      height={maxHeight}
      className="mep-svg"
    >
      <GlyphStackGroup
        digits={digits}
        centerX={centerX}
        totalHeight={maxHeight}
        heightPerGlyphStack={heightPerGlyphStack}
        scale={scale}
      />
    </svg>
  );
};

export default MayanNumeralRenderer;
