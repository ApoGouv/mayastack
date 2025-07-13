interface DotGlyphProps {
  x: number;
  y: number;
  scale?: number;
}

export const DOT_HEIGHT = 5;
export const DOT_WIDTH = 6; // visual radius + border

export default function DotGlyph({ x, y, scale = 1 }: DotGlyphProps) {
  return <circle cx={x} cy={y} r={5 * scale} fill="currentColor" />;
}