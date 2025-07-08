import React from "react";

import DotGlyph, { DOT_HEIGHT, DOT_WIDTH } from '@components/glyphs/DotGlyph';
import BarGlyph, { BAR_HEIGHT } from '@components/glyphs/BarGlyph';
import ShellGlyph, { SHELL_HEIGHT } from '@components/glyphs/ShellGlyph';
import { BAR_VALUE, SHELL_VALUE } from '@constants/mayan';

type GlyphStackProps = {
  digit: number;
  x: number; // horizontal center of the glyph stack
  y: number; // top Y coordinate of the glyph stack "cell"
  heightPerGlyphStack?: number; // for bottom alignment
  scale?: number;
};

const DOT_PADDING_FACTOR = 2;

const GlyphStack: React.FC<GlyphStackProps> = ({
  digit,
  x,
  y,
  heightPerGlyphStack = 100,
  scale = 1,
}) => {
  const barHeight = scale * BAR_HEIGHT;
  const dotHeight = scale * DOT_HEIGHT;
  const shellHeight = scale * SHELL_HEIGHT;

  const bars = Math.floor(digit / BAR_VALUE);
  const dots = digit % BAR_VALUE;

  const dotSpacing = DOT_WIDTH * DOT_PADDING_FACTOR;
  const totalDotWidth = (dots - 1) * dotSpacing;
  const dotStartX = x - totalDotWidth / 2;

  // Total height of the visual stack
  const glyphHeight =
    digit === SHELL_VALUE
      ? shellHeight
      : Math.max(bars * barHeight, dots > 0 ? dotHeight : 0);

  const startY = y + heightPerGlyphStack - glyphHeight;

  if (digit === SHELL_VALUE) {
    return <ShellGlyph x={x} y={y} scale={scale} />;
  }

  const elements: React.ReactElement[] = [];

  // Bars stack from bottom up
  for (let i = 0; i < bars; i++) {
    elements.push(
      <BarGlyph
        key={`bar-${i}`}
        x={x}
        y={startY + (bars - i - 1) * barHeight}
        scale={scale}
      />
    );
  }

  // Dots sit above the bars
  const dotsY = startY - dotHeight;
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

  return <>{elements}</>;
};

export default GlyphStack;