import React from "react";
import { isDev } from "@utils/env";

import GlyphStackGroup from "@components/GlyphStackGroup";

import "@components/MayanNumeralRenderer.css";

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
  const maxHeight = digits.length * heightPerGlyphStack;
  const centerX = svgWidth / 2;

  return (
    <svg
      width={svgWidth}
      height={maxHeight}
      className={`svg-bg ${gridActive ? "svg-grid" : ""}`}
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
