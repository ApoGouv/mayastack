import React from "react";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { rgbaToCss } from "@utils/colors";
import SvgBackground from "@components/svg/SvgBackground";
import SvgGrid from "@components/svg/SvgGrid";
import GlyphStackGroup from "@components/GlyphStackGroup";

interface MayanRendererProps {
  /** Each group is a base-20 digit array */
  digitGroups: number[][];
  /** Height per glyph step */
  heightPerGlyphStack?: number;
  /** Horizontal scale factor for glyphs */
  scale?: number;
  /** Width allocated for each glyph stack group */
  widthPerGroup?: number;
  /** Horizontal spacing between groups */
  spacing?: number;
  /** Export ref for saving */
  exportRef?: React.RefObject<SVGSVGElement | null>;
}

const MayanRenderer: React.FC<MayanRendererProps> = ({
  digitGroups,
  heightPerGlyphStack = 100,
  scale = 1,
  widthPerGroup = 100,
  spacing = 25,
  exportRef
}) => {
  const { backgroundColor, glyphColor, showGrid } = useDisplaySettings();

  // Calculate SVG dimensions
  const totalWidth =
    digitGroups.length > 1
      ? widthPerGroup * digitGroups.length + spacing * (digitGroups.length - 1)
      : widthPerGroup;

  const maxHeight =
    Math.max(...digitGroups.map((d) => d.length)) * heightPerGlyphStack;

  return (
    <svg
      ref={exportRef}
      width={totalWidth}
      height={maxHeight}
      viewBox={`0 0 ${totalWidth} ${maxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className="mep-svg"
      style={{ color: rgbaToCss(glyphColor) }}
    >
      <SvgBackground fill={rgbaToCss(backgroundColor)} />
      <SvgGrid show={showGrid} />

      {digitGroups.map((digits, idx) => (
        <GlyphStackGroup
          key={idx}
          digits={digits}
          centerX={idx * (widthPerGroup + spacing) + widthPerGroup / 2}
          totalHeight={maxHeight}
          heightPerGlyphStack={heightPerGlyphStack}
          scale={scale}
        />
      ))}
    </svg>
  );
};

export default MayanRenderer;
