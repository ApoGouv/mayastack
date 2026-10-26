import React, { useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
import FloatingExportMenu from "@components/FloatingExportMenu";
import { useDimensions } from "@hooks/useDimensions";
import { useShiftKey } from "@hooks/useShiftKey";
import {
  prepareSvgCloneForExport,
  exportSvg,
  exportPng,
  PngSizeError,
} from "@utils/exportUtils";
import { getSizePresets } from "@utils/exportPresets";
import type {
  MayanExportPanelProps,
  ExportSize,
  ExportFormat,
} from "@/types/exportTypes";

const MayanExportPanel: React.FC<MayanExportPanelProps> = ({
  children,
  filename = "mayan-numeral",
}) => {
  const exportPlaceholderRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<SVGSVGElement | null>(null);

  const [format, setFormat] = useState<ExportFormat>("svg");
  const [sizeOption, setSizeOption] = useState<ExportSize>("original");
  const [customWidth, setCustomWidth] = useState<number>(800);
  const [customHeight, setCustomHeight] = useState<number>(600);

  // The SVG's logical size (its viewBox): 0 × 0 until it has been measured, just after it
  // mounts. Not debounced, so the sizes offered and exported always match the current numeral.
  const svgOriginalDimensions = useDimensions(exportRef);
  const shiftHeld = useShiftKey();

  const sizePresets = useMemo(
    () => getSizePresets(svgOriginalDimensions, customWidth, customHeight),
    [svgOriginalDimensions, customWidth, customHeight]
  );

  const handleExport = async () => {
    if (!exportRef.current || !exportPlaceholderRef.current) return;

    // Calculate dimensions based on selection
    const { width, height } = sizePresets[sizeOption].getDimensions();
    // Not measured yet: there is no size to export at
    if (!(width > 0 && height > 0)) return;

    try {
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
      // The app can only ask the browser to download: whether the file is saved is not reported
      toast.success(`${format.toUpperCase()} download started. Check your browser’s downloads.`);
    } catch (err) {
      console.error("Export failed:", err);
      if (err instanceof PngSizeError) {
        // Refused before conversion by the app's PNG size policy
        toast.error(`PNG not exported. ${err.message} Choose a smaller size, or export as SVG.`);
      } else if (format === "png") {
        // The size passed the policy, but this browser or device still could not create the image
        toast.error(`This browser could not create the ${width} × ${height} px PNG, although the size is within the app’s PNG limits. Try a smaller size, or export as SVG.`);
      } else {
        toast.error("Export failed. Please try again.");
      }
    } finally {
      // Always clean up placeholder contents
      exportPlaceholderRef.current?.replaceChildren();
    }
  };

  return (
    <div className="mt-6 flex justify-center">
      <div
        className={`mep-svg-wrapper bg-canvas p-4 rounded-xs w-full max-w-sm mx-auto`}
      >
        {children(exportRef)}
      </div>

      {/* The panel only exists while there is a result to export, so Export is always offered,
          wherever the page is scrolled */}
      <div className="my-4 space-y-4">
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
