import React from "react";
import { isDev } from '../utils/env';
import DotGlyph from "./glyphs/DotGlyph";
import BarGlyph from "./glyphs/BarGlyph";
import ShellGlyph from "./glyphs/ShellGlyph";

import { DOT_HEIGHT, DOT_WIDTH } from './glyphs/DotGlyph';
import { BAR_HEIGHT } from './glyphs/BarGlyph';
import { SHELL_HEIGHT } from './glyphs/ShellGlyph';
import { BAR_VALUE, SHELL_VALUE } from '../constants/mayan';

import './MayanNumeralRenderer.css';


type Props = {
  digits: number[]; // e.g. [6, 3] from toBase20()
  heightPerGlyphStack?: number; // spacing per level
  scale?: number;
  width?: number;
  showGrid?: boolean;
};

const DOT_SPACING  = 2;

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
  const centerX = svgWidth / 2;

  return (
    <svg
      width={svgWidth}
      height={digits.length * heightPerGlyphStack}
      className={`svg-bg ${gridActive ? 'svg-grid' : ''}`}
    >
      {digits.map((digit, index) => {
        const yOffset = index * heightPerGlyphStack;

        const renderGlyphs = () => {
          // Number of bars and dots
          const bars = Math.floor(digit / BAR_VALUE);
          const dots = digit % BAR_VALUE;

          const dotSpacing = DOT_WIDTH * DOT_SPACING;
          const totalDotWidth = (dots - 1) * dotSpacing;
          const dotStartX = centerX - totalDotWidth / 2;

          // Estimate individual heights (scaled)
          const barHeight = scale * BAR_HEIGHT;
          const dotHeight = scale * DOT_HEIGHT;
          const shellHeight = scale * SHELL_HEIGHT;

          // Total height of this glyph stack
          let totalGlypStackhHeight = 0;

          if (digit === SHELL_VALUE) {
            totalGlypStackhHeight = shellHeight;
          } else {
            totalGlypStackhHeight = Math.max(
              bars * barHeight,
              dots > 0 ? dotHeight : 0 // only if dots exist
            );
          }

          // Adjust Y so glyph stack is bottom-aligned in its cell
          const glyphStartY = yOffset + heightPerGlyphStack - totalGlypStackhHeight;

          if (digit === SHELL_VALUE) {
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
