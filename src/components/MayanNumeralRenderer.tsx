import React from 'react';

type Props = {
  digits: number[]; // e.g. [6, 3] from toBase20()
  heightPerGlyph?: number; // spacing per level
  size?: number; // dot/bar size
};

/**
 * Renders a vertical stack of base-20 digits using Mayan numeral visuals.
 * Dots represent 1, bars represent 5, and a shell (🯰 or ⛶ or circle) represents 0.
 */
const MayanNumeralRenderer: React.FC<Props> = ({
  digits,
  heightPerGlyph = 80,
  size = 20,
}) => {
  return (
    <svg
      width="200"
      height={digits.length * heightPerGlyph}
      style={{ background: 'white', border: '1px solid #ccc' }}
    >
      {digits.map((digit, index) => {
        const yOffset = index * heightPerGlyph;

        const renderGlyphs = () => {
          if (digit === 0) {
            return (
              <circle
                cx={100}
                cy={yOffset + size}
                r={size / 2}
                fill="lightgray"
                stroke="black"
              />
            );
          }

          const bars = Math.floor(digit / 5);
          const dots = digit % 5;

          const elements: React.JSX.Element[] = [];

          // Add bars
          for (let i = 0; i < bars; i++) {
            elements.push(
              <rect
                key={`bar-${i}`}
                x={50}
                y={yOffset + i * (size + 2)}
                width={100}
                height={size / 2}
                fill="black"
                rx={4}
              />
            );
          }

          // Add dots (above bars)
          for (let i = 0; i < dots; i++) {
            elements.push(
              <circle
                key={`dot-${i}`}
                cx={100}
                cy={yOffset + bars * (size + 2) + i * (size + 2)}
                r={size / 2.5}
                fill="black"
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
