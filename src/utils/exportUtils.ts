export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function downloadSvg(svgEl: SVGSVGElement, filename = "export.svg") {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);

  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  downloadDataUrl(url, filename);

  URL.revokeObjectURL(url);
}
