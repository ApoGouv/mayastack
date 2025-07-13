import React from "react";

import GlyphStackGroup from "@components/GlyphStackGroup";
import type { DateParts } from "@components/inputs/DateInput";
import { useColorContext } from "@/context/ColorContext";
import { rgbaToCss } from "@utils/colors";
import { toBase20 } from "@utils/base20";


type Props = {
  dateParts: DateParts;
  heightPerGlyphStack?: number;
  scale?: number;
  widthPerPart?: number;
  showGrid?: boolean;
};

const MayanDateRenderer: React.FC<Props> = ({
  dateParts,
  heightPerGlyphStack = 100,
  scale = 1,
  widthPerPart = 100,
}) => {
  if (!dateParts) return null;

  const dayDigits = toBase20(dateParts.day);
  const monthDigits = toBase20(dateParts.month);
  const yearDigits = toBase20(dateParts.year);

  const { glyphColor } = useColorContext();

  const spacing = 20;
  const totalWidth = widthPerPart * 3 + spacing * 2;
  const maxHeight =
    Math.max(dayDigits.length, monthDigits.length, yearDigits.length) *
    heightPerGlyphStack;

  return (
    <svg
      width={totalWidth}
      height={maxHeight}
      viewBox={`0 0 ${totalWidth} ${maxHeight}`}
      className="mep-svg"
      style={{ color: rgbaToCss(glyphColor) }}
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
