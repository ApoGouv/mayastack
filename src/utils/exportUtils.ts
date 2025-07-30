/**
 * SVG Export Utilities
 *
 * Provides functions for exporting SVG content to various formats (SVG, PNG)
 * with proper scaling and formatting.
 */

// =============================================
// Core Preparation Functions
// =============================================

/**
 * Prepares an SVG clone for export by copying all attributes and content
 *
 * @param originalSvg - The source SVG element to clone
 * @param width - Desired width of exported SVG
 * @param height - Desired height of exported SVG
 * @param container - Hidden container to temporarily hold the clone
 *
 * @returns Cloned and configured SVG element or null if preparation fails
 */
export function prepareSvgCloneForExport(
  originalSvg: SVGSVGElement,
  width: number,
  height: number,
  container: HTMLElement // passed from ref.current
): SVGSVGElement | null {
  if (!originalSvg || !container) return null;

  // Clone the original SVG
  const clone = originalSvg.cloneNode(true) as SVGSVGElement;

  // Set custom width/height
  clone.setAttribute('width', `${width}`);
  clone.setAttribute('height', `${height}`);
  clone.setAttribute(
    'viewBox',
    `0 0 ${originalSvg.viewBox.baseVal.width} ${originalSvg.viewBox.baseVal.height}`
  );

  // Clear old contents first (optional safety)
  container.innerHTML = '';

  // Append clone to the hidden container
  container.appendChild(clone);

  return clone;
}

// =============================================
// Shared Utility Functions
// =============================================

/**
 * Triggers download of a data URL
 *
 * @param dataUrl - The data URL to download
 * @param filename - Name for the downloaded file
 */
function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/**
 * Serializes SVG element to string with proper XML namespace
 *
 * @param svgEl - SVG element to serialize
 *
 * @returns String representation of the SVG
 */
function serializeSvg(svgEl: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgEl);

  // Add XML namespace if not present
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace(
      /<svg/,
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }

  return svgString;
}

/**
 * Creates a data URL from an SVG element
 *
 * @param svgEl - Source SVG element
 *
 * @returns Data URL containing the SVG
 */
function createSvgDataUrl(svgEl: SVGSVGElement): string {
  const svgString = serializeSvg(svgEl);

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

// =============================================
// PNG Conversion Utilities
// =============================================

/**
 * Creates and configures a canvas for SVG rendering
 *
 * @param svgEl - Source SVG element for dimension reference
 * @param scale - Scaling factor to apply to canvas dimensions
 *
 * @returns Configured canvas and 2D context
 *
 * @throws Error if canvas context cannot be created
 */
function createCanvasForSvg(
  svgEl: SVGSVGElement,
  scale: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  const width = parseInt(svgEl.getAttribute('width') || '0');
  const height = parseInt(svgEl.getAttribute('height') || '0');
  canvas.width = width * scale;
  canvas.height = height * scale;

  return { canvas, ctx };
}

/**
 * Renders SVG content to a canvas
 *
 * @param svgEl - Source SVG element
 * @param canvas - Target canvas for rendering
 * @param ctx - Canvas rendering context
 *
 * @returns Promise that resolves when rendering completes
 *
 * @throws Error if image loading fails
 */
async function renderSvgToCanvas(
  svgEl: SVGSVGElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    img.onerror = (error) => {
      console.error('SVG to Canvas rendering failed:', {
        error,
        svgSrc: createSvgDataUrl(svgEl).substring(0, 100) + '...',
      });
      reject(new Error('Failed to render SVG to canvas'));
    };
    img.src = createSvgDataUrl(svgEl);
  });
}

/**
 * Converts canvas content to PNG blob
 *
 * @param canvas - Source canvas
 *
 * @returns Promise resolving with PNG blob
 *
 * @throws Error if blob conversion fails
 */
async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas to PNG conversion failed'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}

// =============================================
// Public Export API
// =============================================

/**
 * Exports SVG element as an SVG file
 *
 * @param svgEl - SVG element to export
 * @param filename - Name for the exported file (default: 'export.svg')
 */
export async function exportSvg(
  svgEl: SVGSVGElement,
  filename = 'export.svg'
): Promise<void> {
  const svgString = serializeSvg(svgEl);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  downloadDataUrl(url, filename);

  URL.revokeObjectURL(url);
}

/**
 * Exports SVG element as a PNG file
 *
 * @param svgEl - SVG element to export
 * @param filename - Name for the exported file (default: 'export.png')
 * @param scale - Scaling factor for the output (default: 1)
 */
export async function exportPng(
  svgEl: SVGSVGElement,
  filename = 'export.png',
  scale = 1
): Promise<void> {
  const { canvas, ctx } = createCanvasForSvg(svgEl, scale);
  await renderSvgToCanvas(svgEl, canvas, ctx);
  const blob = await canvasToPngBlob(canvas);
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}
