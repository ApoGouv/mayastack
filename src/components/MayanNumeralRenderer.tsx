import React from "react";
import DotGlyph from "./glyphs/DotGlyph";
import BarGlyph from "./glyphs/BarGlyph";
import ShellGlyph from "./glyphs/ShellGlyph";

type Props = {
  digits: number[]; // e.g. [6, 3] from toBase20()
  heightPerGlyphStack?: number; // spacing per level
  scale?: number;
  width?: number;
  size?: number; // for dot spacing
};

/**
 * Renders a vertical stack of base-20 digits using Mayan numeral visuals.
 * Dots represent 1, bars represent 5, and a shell (🯰 or ⛶ or circle) represents 0.
 */
const MayanNumeralRenderer: React.FC<Props> = ({
  digits,
  heightPerGlyphStack = 100,
  scale = 1,
  width,
  size = 6,
}) => {
  const svgWidth = width ?? 200;
  const centerX = svgWidth / 2;

  return (
    <svg
      width={svgWidth}
      height={digits.length * heightPerGlyphStack}
      style={{ background: "white", border: "1px solid #ccc" }}
    >
      {digits.map((digit, index) => {
        const yOffset = index * heightPerGlyphStack;

        const renderGlyphs = () => {
          // Number of bars and dots
          const bars = Math.floor(digit / 5);
          const dots = digit % 5;

          const dotSpacing = size * 2;
          const totalDotWidth = (dots - 1) * dotSpacing;
          const dotStartX = centerX - totalDotWidth / 2;

          // Estimate individual heights (scaled)
          const barHeight = scale * 8;
          const dotHeight = scale * 14;
          const shellHeight = scale * 19.75; // approx. from earlier

          // Total height of this glyph stack
          let totalGlypStackhHeight = 0;

          if (digit === 0) {
            totalGlypStackhHeight = shellHeight;
          } else {
            totalGlypStackhHeight = Math.max(
              bars * barHeight,
              dots > 0 ? dotHeight : 0 // only if dots exist
            );
          }

          // Adjust Y so glyph stack is bottom-aligned in its cell
          const glyphStartY = yOffset + heightPerGlyphStack - totalGlypStackhHeight;

          if (digit === 0) {
            return <ShellGlyph x={centerX} y={yOffset} scale={scale} />;
          }

          const elements: React.JSX.Element[] = [];

          // Bars stack from bottom upward
          for (let i = 0; i < bars; i++) {
            elements.push(
              <BarGlyph
                key={`bar-${i}`}
                x={centerX}
                y={glyphStartY + (bars - i - 1) * barHeight}
                scale={scale}
              />
            );
          }

          // Dots stack above bars
          const dotsY = glyphStartY - dotHeight; // Shifted above bars
          for (let i = 0; i < dots; i++) {
            elements.push(
              <DotGlyph
                key={`dot-${i}`}
                x={dotStartX + i * dotSpacing}
                y={dotsY}
                scale={scale}
              />
            );
          }

          return elements;
        };

        return <g key={index}>{renderGlyphs()}</g>;
      })}
    </svg>
  );
};

export default MayanNumeralRenderer;
