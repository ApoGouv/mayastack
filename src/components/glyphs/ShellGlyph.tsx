type ShellGlyphProps = {
  x: number;
  y: number;
  scale?: number;
};

export default function ShellGlyph({ x, y, scale = 1 }: ShellGlyphProps) {
    const shellWidth = 38.87; // width of glyph - 2 * 44.5 | 38.87
    const shellHeight = 19.75; // estimated from path range
  return (
    <g
      transform={`translate(${x - (shellWidth * scale) / 2}, ${y}) scale(${scale})`}
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeWidth={1.5}
    >
      <path d="m44.45 75.628a19.436 9.8745 0 0 1-19.436 9.8745 19.436 9.8745 0 0 1-19.436-9.8745 19.436 9.8745 0 0 1 19.436-9.8745 19.436 9.8745 0 0 1 19.436 9.8745z" />
      <path d="m43.55 72.678c-2.4711 4.0111-9.8462 6.9243-18.552 6.9243-8.6929 0-16.059-2.9043-18.541-6.9059" />
      <path d="m25.25 79.628c-1.7531-1.8226-2.7617-3.9572-2.7617-6.2384 0-2.8323 1.5549-5.4387 4.1591-7.5025" />
      <path d="m32.25 78.888c-0.9309-1.4182-1.4443-2.9712-1.4443-4.5987 0-2.7072 1.4206-5.208 3.8202-7.2259" />
      <path d="m17.25 78.798c-1.4864-1.7151-2.3308-3.6796-2.3308-5.7668 0-2.4304 1.1449-4.6944 3.1152-6.5921" />
    </g>
  );
}
