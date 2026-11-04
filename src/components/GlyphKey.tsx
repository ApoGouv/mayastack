import React from 'react';
import ShellGlyph, {
  SHELL_HEIGHT,
  SHELL_STROKE_WIDTH,
  SHELL_VISUAL_Y_OFFSET,
  SHELL_WIDTH,
  VISUAL_SHELL_WIDTH,
} from '@components/glyphs/ShellGlyph';
import DotGlyph from '@components/glyphs/DotGlyph';
import BarGlyph, { BAR_WIDTH } from '@components/glyphs/BarGlyph';

/** The key's glyphs, at this share of their size in the viewer at 100% zoom (1 CSS px per unit) */
export const GLYPH_KEY_SCALE = 0.6;

/** A glyph's drawn box, stroke included, in its own SVG units */
interface GlyphBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/*
 * Each glyph is drawn at scale 1, unchanged, in its own SVG whose viewBox is exactly the glyph's
 * drawn box, so the SVG's size sets the glyph's size and keeps its proportions.
 *
 * ShellGlyph at (VISUAL_SHELL_WIDTH / 2, SHELL_VISUAL_Y_OFFSET) is drawn in its path's own
 * coordinates. Its outline, the widest and tallest part, is an ellipse SHELL_WIDTH × SHELL_HEIGHT
 * centred at (25.014, 75.628) in those coordinates, with half its stroke outside.
 */
const SHELL_CENTRE = { x: 25.014, y: 75.628 };
const SHELL_BOX: GlyphBox = {
  x: SHELL_CENTRE.x - (SHELL_WIDTH + SHELL_STROKE_WIDTH) / 2,
  y: SHELL_CENTRE.y - (SHELL_HEIGHT + SHELL_STROKE_WIDTH) / 2,
  width: SHELL_WIDTH + SHELL_STROKE_WIDTH,
  height: SHELL_HEIGHT + SHELL_STROKE_WIDTH,
};

/** DotGlyph's radius at scale 1 */
const DOT_RADIUS = 5;
const DOT_BOX: GlyphBox = { x: 0, y: 0, width: DOT_RADIUS * 2, height: DOT_RADIUS * 2 };

/** BarGlyph's stroke width at scale 1: the bar's thickness, its butt ends flush with BAR_WIDTH */
const BAR_STROKE_WIDTH = 6;
const BAR_BOX: GlyphBox = { x: 0, y: 0, width: BAR_WIDTH, height: BAR_STROKE_WIDTH };

const ENTRIES = [
  {
    label: 'Shell = 0',
    box: SHELL_BOX,
    glyph: <ShellGlyph x={VISUAL_SHELL_WIDTH / 2} y={SHELL_VISUAL_Y_OFFSET} />,
  },
  { label: 'Dot = 1', box: DOT_BOX, glyph: <DotGlyph x={DOT_RADIUS} y={DOT_RADIUS} /> },
  { label: 'Bar = 5', box: BAR_BOX, glyph: <BarGlyph x={BAR_WIDTH / 2} y={BAR_STROKE_WIDTH / 2} /> },
] as const;

/**
 * A compact key to the numeral's glyphs, under the viewer's stage (UI-13, slice 5c): the actual
 * ShellGlyph, DotGlyph and BarGlyph, decorative, each beside its value as text. Screen-only: it
 * is never inside the numeral's SVG, the source of SVG and PNG export.
 *
 * The glyphs draw in currentColor: the theme's accent text colour, one colour for all three (G
 * §3.3), not the numeral's glyph colour, which is chosen for the numeral's own background. The
 * labels are in the muted text colour. The entries start at the card's content edge and wrap as
 * wholes, each glyph staying beside its label.
 *
 * Each SVG's viewBox is flush with its glyph's drawn box, so overflow-visible keeps the browser's
 * snapping of the SVG to device pixels from clipping the anti-aliased edge of the shell's stroke.
 */
const GlyphKey: React.FC = () => (
  // role="list": a list without bullets loses its list semantics in some browsers
  <ul role="list" aria-label="Glyph key" className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-xs text-fg-muted">
    {ENTRIES.map(({ label, box, glyph }) => (
      <li key={label} className="flex items-center gap-1.5 whitespace-nowrap">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          width={box.width * GLYPH_KEY_SCALE}
          height={box.height * GLYPH_KEY_SCALE}
          className="shrink-0 overflow-visible text-accent-fg"
        >
          {glyph}
        </svg>
        <span>{label}</span>
      </li>
    ))}
  </ul>
);

export default GlyphKey;
