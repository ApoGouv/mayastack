import type { RgbaColor } from "@/types/colors";

export function rgbaToCss({ r, g, b, a }: RgbaColor): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}