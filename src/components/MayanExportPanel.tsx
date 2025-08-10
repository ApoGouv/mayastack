import React, { useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
import FloatingExportMenu from "@components/FloatingExportMenu";
import { useDebounce } from "@hooks/useDebounce";
import { useDimensions } from "@hooks/useDimensions";
import { useShiftKey } from "@hooks/useShiftKey";
import { useElementOnScreen } from "@hooks/useElementOnScreen";
import {
  prepareSvgCloneForExport,
  exportSvg,
  exportPng,
} from "@utils/exportUtils";
import { getSizePresets } from "@utils/exportPresets";
import type {
  MayanExportPanelProps,
  Dimensions,
  ExportSize,
  ExportFormat,
} from "@/types/exportTypes";

const MayanExportPanel: React.FC<MayanExportPanelProps> = ({
  children,
  filename = "mayan-numeral",
}) => {
  const exportPlaceholderRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<SVGSVGElement | null>(null);

  const isExportVisible = useElementOnScreen<SVGSVGElement>(exportRef, {
    rootMargin: '0px',
    threshold: 0.25 // Trigger when 25% of element is visible
  });

  const [format, setFormat] = useState<ExportFormat>("svg");
  const [sizeOption, setSizeOption] = useState<ExportSize>("original");
  const [customWidth, setCustomWidth] = useState<number>(800);
  const [customHeight, setCustomHeight] = useState<number>(600);

  const rawDimensions = useDimensions(exportRef);
  const svgOriginalDimensions = useDebounce<Dimensions>(rawDimensions, 100);
  const shiftHeld = useShiftKey();

  const sizePresets = useMemo(
    () => getSizePresets(svgOriginalDimensions, customWidth, customHeight),
    [svgOriginalDimensions, customWidth, customHeight]
  );

  const handleExport = async () => {
    if (!exportRef.current || !exportPlaceholderRef.current) return;

    try {
      // Calculate dimensions based on selection
      const { width, height } = sizePresets[sizeOption].getDimensions();

      // Clone the original SVG to the export placeholder and prepare it for export
      const svgClone = prepareSvgCloneForExport(
        exportRef.current,
        width,
        height,
        exportPlaceholderRef.current
      );

      // return;
      if (!svgClone) {
        toast.error("Export failed during SVG preparation.");
        return;
      }

      const exportFn = format === "svg" ? exportSvg : exportPng;
      await exportFn(svgClone, `${filename}.${format}`);
      toast.success(`${format.toUpperCase()} exported! Check your downloads.`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      // Always clean up placeholder contents
      exportPlaceholderRef.current?.replaceChildren();
    }
  };

  return (
    <div className="mt-6 flex justify-center">
      <div
        className={`mep-svg-wrapper bg-gray-200 dark:bg-gray-900 p-4 rounded-xs w-full max-w-sm mx-auto`}
      >
        {children(exportRef)}
      </div>

      <div className="my-4 space-y-4">
        {isExportVisible && (
          <FloatingExportMenu
            format={format}
            setFormat={setFormat}
            sizeOption={sizeOption}
            setSizeOption={setSizeOption}
            sizePresets={sizePresets}
            shiftHeld={shiftHeld}
            svgOriginalDimensions={svgOriginalDimensions}
            customWidth={customWidth}
            setCustomWidth={setCustomWidth}
            customHeight={customHeight}
            setCustomHeight={setCustomHeight}
            handleExport={handleExport}
          />
        )}
      </div>

      {/* Cloned SVG placeholder for eporting */}
      <div
        ref={exportPlaceholderRef}
        className="absolute -z-10 w-0 h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};

export default MayanExportPanel;
