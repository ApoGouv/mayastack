import React from "react";

import GlyphStackGroup from "@components/GlyphStackGroup";
import { useColorContext } from "@/context/ColorContext";
import { rgbaToCss } from "@utils/colors";

interface MayanNumeralRendererProps {
  digits: number[]; // e.g. [6, 3] from toBase20()
  heightPerGlyphStack?: number; // spacing per level
  scale?: number;
  width?: number;
  exportRef?: React.RefObject<SVGSVGElement | null>;
  showGrid?: boolean;
}

/**
 * Renders a vertical stack of base-20 digits using Mayan numeral visuals.
 * Dots represent 1, bars represent 5, and a shell (🯰 or ⛶ or circle) represents 0.
 */
const MayanNumeralRenderer: React.FC<MayanNumeralRendererProps> = ({
  digits,
  heightPerGlyphStack = 100,
  width,
  scale = 1,
  exportRef,
  showGrid=false,
}) => {
  const svgWidth = width ?? 340;
  const maxHeight = digits.length * heightPerGlyphStack;
  const centerX = svgWidth / 2;

  const { backgroundColor, glyphColor } = useColorContext();

  return (
    <svg
      ref={exportRef}
      width={svgWidth}
      height={maxHeight}
      viewBox={`0 0 ${svgWidth} ${maxHeight}`}
      className={`mep-svg ${showGrid ? "mep-grid" : ""}`}
      style={{ backgroundColor: rgbaToCss(backgroundColor), color: rgbaToCss(glyphColor) }}
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
