type DotGlyphProps = {
  x: number;
  y: number;
  scale?: number;
};

export default function DotGlyph({ x, y, scale = 1 }: DotGlyphProps) {
  return <circle cx={x} cy={y} r={5 * scale} fill="black" />;
}