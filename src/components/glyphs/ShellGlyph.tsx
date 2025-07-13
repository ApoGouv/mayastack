type ShellGlyphProps = {
  x: number;
  y: number;
  scale?: number;
};

export const SHELL_WIDTH = 38.872;   // actual width
export const SHELL_HEIGHT = 19.749;  // actual height
export const SHELL_STROKE_WIDTH = 1.5;
export const SHELL_MARGIN = 9;
export const VISUAL_SHELL_WIDTH = SHELL_WIDTH + (SHELL_STROKE_WIDTH * 2) + SHELL_MARGIN;   // actual visual width
export const SHELL_VISUAL_Y_OFFSET = 72.678; // This is the starting Y of the <path>

export default function ShellGlyph({ x, y, scale = 1 }: ShellGlyphProps) {

  return (
    <g
      transform={`translate(${x - (VISUAL_SHELL_WIDTH * scale) / 2}, ${y - SHELL_VISUAL_Y_OFFSET}) scale(${scale})`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={SHELL_STROKE_WIDTH}
    >
      <path d="m44.45 75.628a19.436 9.8745 0 0 1-19.436 9.8745 19.436 9.8745 0 0 1-19.436-9.8745 19.436 9.8745 0 0 1 19.436-9.8745 19.436 9.8745 0 0 1 19.436 9.8745z" />
      <path d="m43.55 72.678c-2.4711 4.0111-9.8462 6.9243-18.552 6.9243-8.6929 0-16.059-2.9043-18.541-6.9059" />
      <path d="m25.25 79.628c-1.7531-1.8226-2.7617-3.9572-2.7617-6.2384 0-2.8323 1.5549-5.4387 4.1591-7.5025" />
      <path d="m32.25 78.888c-0.9309-1.4182-1.4443-2.9712-1.4443-4.5987 0-2.7072 1.4206-5.208 3.8202-7.2259" />
      <path d="m17.25 78.798c-1.4864-1.7151-2.3308-3.6796-2.3308-5.7668 0-2.4304 1.1449-4.6944 3.1152-6.5921" />
    </g>
  );
}
