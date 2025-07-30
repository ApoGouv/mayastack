import React, { useRef } from "react";
import toast from "react-hot-toast";
import { prepareSvgCloneForExport, exportSvg, exportPng } from "@/utils/exportUtils";
import { isDev } from "@utils/env";

type ExportFormat = "png" | "svg";

interface MayanExportPanelProps {
  children: (
    ref: React.RefObject<SVGSVGElement | null>,
    gridActive: boolean
  ) => React.ReactNode;
  filename?: string;
  formats?: ExportFormat[];
  showGrid?: boolean;
}

const MayanExportPanel: React.FC<MayanExportPanelProps> = ({
  children,
  filename = "mayan-numeral",
  formats = ["png", "svg"],
  showGrid = false,
}) => {
  const exportPlaceholderRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<SVGSVGElement>(null);
  const gridActive = isDev && showGrid;

  const handleExport = async (format: ExportFormat) => {
    if (!exportRef.current || !exportPlaceholderRef.current) return;

    const svgOriginalNode = exportRef.current;
    const exportPlaceholder = exportPlaceholderRef.current;

    if (!svgOriginalNode || !exportPlaceholder) return;

    try {

      // Clone the original SVG to the export placeholder
      const svgClone = prepareSvgCloneForExport(
        svgOriginalNode,
        svgOriginalNode.clientWidth,
        svgOriginalNode.clientHeight,
        exportPlaceholder
      );

      // return;
      if (!svgClone) {
        toast.error("Export failed during SVG preparation.");
        return;
      }

      if (format === "svg") {
        await exportSvg(svgClone, `${filename}.svg`);
        toast.success("SVG exported! Check your downloads.");
      } else if (format === "png") {
        await exportPng(svgClone, `${filename}.png`);
        toast.success("PNG exported! Check your downloads.");
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      // Always clean up placeholder contents
      exportPlaceholder.replaceChildren();
    }
  };

  return (
    <div className="mt-6">
      <div
        data-exportable
        className={`mep-svg-wrapper bg-white dark:bg-gray-900 p-4 rounded-xs w-full`}
      >
        {children(exportRef, gridActive)}
      </div>

      <div className="my-4 flex gap-3">
        {formats.map((format) => (
          <button
            key={format}
            onClick={() => handleExport(format)}
            className="px-4 py-2 bg-ms-clay-500 text-white rounded hover:bg-ms-amber-500 transition cursor-pointer"
            role="button"
          >
            Export as {format.toUpperCase()}
          </button>
        ))}
      </div>

      <div 
        ref={exportPlaceholderRef}
        className="absolute -z-10 w-0 h-0 overflow-hidden pointer-events-none" 
        aria-hidden="true" 
      />

    </div>
  );
};

export default MayanExportPanel;
