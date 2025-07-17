import React from "react";

import GlyphStackGroup from "@components/GlyphStackGroup";
import type { DateParts } from "@components/inputs/DateInput";
import { useColorContext } from "@/context/ColorContext";
import { rgbaToCss } from "@utils/colors";
import { toBase20 } from "@utils/base20";


interface MayanDateRendererProps {
  dateParts: DateParts;
  heightPerGlyphStack?: number;
  scale?: number;
  widthPerPart?: number;
  exportRef?: React.RefObject<SVGSVGElement | null>;
  showGrid?: boolean;
}

const MayanDateRenderer: React.FC<MayanDateRendererProps> = ({
  dateParts,
  heightPerGlyphStack = 100,
  scale = 1,
  widthPerPart = 100,
  exportRef,
  showGrid=false,
}) => {
  if (!dateParts) return null;

  const dayDigits = toBase20(dateParts.day);
  const monthDigits = toBase20(dateParts.month);
  const yearDigits = toBase20(dateParts.year);

  const { backgroundColor, glyphColor } = useColorContext();

  const spacing = 20;
  const totalWidth = widthPerPart * 3 + spacing * 2;
  const maxHeight =
    Math.max(dayDigits.length, monthDigits.length, yearDigits.length) *
    heightPerGlyphStack;

  return (
    <svg
      ref={exportRef}
      width={totalWidth}
      height={maxHeight}
      viewBox={`0 0 ${totalWidth} ${maxHeight}`}
      className={`mep-svg ${showGrid ? "mep-grid" : ""}`}
      style={{ backgroundColor: rgbaToCss(backgroundColor), color: rgbaToCss(glyphColor) }}
    >
      {/* Day */}
      <GlyphStackGroup
        digits={dayDigits}
        centerX={widthPerPart / 2}
        totalHeight={maxHeight}
        heightPerGlyphStack={heightPerGlyphStack}
        scale={scale}
      />
      {/* Month */}
      <GlyphStackGroup
        digits={monthDigits}
        centerX={widthPerPart + spacing + widthPerPart / 2}
        totalHeight={maxHeight}
        heightPerGlyphStack={heightPerGlyphStack}
        scale={scale}
      />
      {/* Year */}
      <GlyphStackGroup
        digits={yearDigits}
        centerX={2 * (widthPerPart + spacing) + widthPerPart / 2}
        totalHeight={maxHeight}
        heightPerGlyphStack={heightPerGlyphStack}
        scale={scale}
      />
    </svg>
  );
};

export default MayanDateRenderer;
