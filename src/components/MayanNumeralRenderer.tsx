import React from "react";

import GlyphStackGroup from "@components/GlyphStackGroup";
import SvgBackground from "@components/svg/SvgBackground";
import SvgGrid from "@components/svg/SvgGrid";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
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

  const { backgroundColor, glyphColor } = useDisplaySettings();

  return (
    <svg
      ref={exportRef}
      width={svgWidth}
      height={maxHeight}
      viewBox={`0 0 ${svgWidth} ${maxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className='mep-svg'
      style={{ color: rgbaToCss(glyphColor) }}
    >
      <SvgBackground fill={rgbaToCss(backgroundColor)} />
      <SvgGrid show={showGrid} />
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
