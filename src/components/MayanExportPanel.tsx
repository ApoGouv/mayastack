import React, { useRef } from "react";
import { toPng } from "html-to-image";
import toast from "react-hot-toast";
import { downloadDataUrl, downloadSvg } from "@/utils/exportUtils";
import { isDev } from "@utils/env";

import "@components/MayanExportPanel.css";

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
  const exportRef = useRef<SVGSVGElement>(null);
  const gridActive = isDev && showGrid;

  const handleExport = async (format: ExportFormat) => {
    if (!exportRef.current) return;

    try {
      const node = exportRef.current as unknown as HTMLElement | null;
      if (!node) return;

      if (format === "svg") {
        downloadSvg(exportRef.current, `${filename}.svg`);
        toast.success("SVG exported! Check your downloads.");
        return;
      }

      if (format === "png") {
        const dataUrl = await toPng(node);
        downloadDataUrl(dataUrl, `${filename}.png`);
        toast.success("PNG exported! Check your downloads.");
        return;
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
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

      <div className="mt-4 flex gap-3">
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
    </div>
  );
};

export default MayanExportPanel;
