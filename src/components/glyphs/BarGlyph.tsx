type BarGlyphProps = {
  x: number;
  y: number;
  scale?: number;
};

export const BAR_HEIGHT = 8;
export const BAR_WIDTH = 44; // match the <path> length

export default function BarGlyph({ x, y, scale = 1 }: BarGlyphProps) {
  return (
    <path
      d={`M${x - (BAR_WIDTH / 2) * scale} ${y} H${x + (BAR_WIDTH / 2) * scale}`}
      stroke="#000"
      strokeWidth={6 * scale}
    />
  );
}
