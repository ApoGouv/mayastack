import React from "react";

import GlyphStackGroup from "@components/GlyphStackGroup";
import type { DateParts } from "@components/inputs/DateInput";
import SvgBackground from "@components/svg/SvgBackground";
import SvgGrid from "@components/svg/SvgGrid";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { rgbaToCss } from "@utils/colors";
import { toBase20 } from "@utils/base20";


interface MayanDateRendererProps {
  dateParts: DateParts;
  heightPerGlyphStack?: number;
  scale?: number;
  widthPerPart?: number;
  exportRef?: React.RefObject<SVGSVGElement | null>;
}

const MayanDateRenderer: React.FC<MayanDateRendererProps> = ({
  dateParts,
  heightPerGlyphStack = 100,
  scale = 1,
  widthPerPart = 100,
  exportRef,
}) => {
  const { backgroundColor, glyphColor, showGrid } = useDisplaySettings();

  if (!dateParts) return null;

  const dayDigits = toBase20(dateParts.day);
  const monthDigits = toBase20(dateParts.month);
  const yearDigits = toBase20(dateParts.year);


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
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className='mep-svg'
      style={{ color: rgbaToCss(glyphColor) }}
    >
      <SvgBackground fill={rgbaToCss(backgroundColor)} />
      
      <SvgGrid show={showGrid} />

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
