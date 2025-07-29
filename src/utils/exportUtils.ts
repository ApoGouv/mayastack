export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function downloadSvg(svgEl: SVGSVGElement, filename = 'export.svg') {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);

  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  downloadDataUrl(url, filename);

  URL.revokeObjectURL(url);
}

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
