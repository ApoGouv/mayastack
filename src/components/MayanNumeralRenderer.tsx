import React from 'react';
import DotGlyph from './glyphs/DotGlyph';
import BarGlyph from './glyphs/BarGlyph';
import ShellGlyph from './glyphs/ShellGlyph';

type Props = {
  digits: number[]; // e.g. [6, 3] from toBase20()
  heightPerGlyph?: number; // spacing per level
  scale?: number;
};

/**
 * Renders a vertical stack of base-20 digits using Mayan numeral visuals.
 * Dots represent 1, bars represent 5, and a shell (🯰 or ⛶ or circle) represents 0.
 */
const MayanNumeralRenderer: React.FC<Props> = ({
  digits,
  heightPerGlyph = 100,
  scale = 1,
}) => {
  return (
    <svg
      width="200"
      height={digits.length * heightPerGlyph}
      style={{ background: 'white', border: '1px solid #ccc' }}
    >
      {digits.map((digit, index) => {
        const yOffset = index * heightPerGlyph + 10;

        const renderGlyphs = () => {
          if (digit === 0) {
            return <ShellGlyph x={100} y={yOffset + 30} scale={scale} />;
          }

          const bars = Math.floor(digit / 5);
          const dots = digit % 5;
          const elements: React.JSX.Element[] = [];

          // Bars stack from bottom upward
          for (let i = 0; i < bars; i++) {
            elements.push(
              <BarGlyph
                key={`bar-${i}`}
                x={100}
                y={yOffset + i * (scale * 14)}
                scale={scale}
              />
            );
          }

          // Dots stack above bars
          for (let i = 0; i < dots; i++) {
            elements.push(
              <DotGlyph
                key={`dot-${i}`}
                x={100}
                y={yOffset + bars * (scale * 14) + i * (scale * 14)}
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
