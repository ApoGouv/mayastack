type BarGlyphProps = {
  x: number;
  y: number;
  scale?: number;
};

export default function BarGlyph({ x, y, scale = 1 }: BarGlyphProps) {
  return (
    <path
      d={`M${x - 22 * scale} ${y} H${x + 22 * scale}`}
      stroke="#000"
      strokeWidth={6 * scale}
    />
  );
}
