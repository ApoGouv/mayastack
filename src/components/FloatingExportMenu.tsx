import React, { useState, useRef } from 'react';
import type { ExportFormat, ExportSize, Dimensions } from '@/types/exportTypes';
import type { SizePreset } from '@utils/exportPresets';
import { useDismissOnOutsideOrEsc } from "@hooks/useDismissOnOutsideOrEsc";

interface FloatingExportMenuProps {
  format: ExportFormat;
  sizeOption: ExportSize;
  sizePresets: Record<ExportSize, SizePreset>;
  shiftHeld: boolean;
  svgOriginalDimensions: Dimensions;
  customWidth: number;
  customHeight: number;
  setFormat: (f: ExportFormat) => void;
  setSizeOption: (s: ExportSize) => void;
  setCustomWidth: (w: number) => void;
  setCustomHeight: (h: number) => void;
  handleExport: () => void;
}

const FloatingExportMenu: React.FC<FloatingExportMenuProps> = ({
  format,
  sizeOption,
  sizePresets,
  shiftHeld,
  svgOriginalDimensions,
  customWidth,
  customHeight,
  setFormat,
  setSizeOption,
  setCustomWidth,
  setCustomHeight,
  handleExport,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportMenuRef = useRef<HTMLDivElement>(null);

  useDismissOnOutsideOrEsc(exportMenuRef, () => setIsOpen(false), isOpen, true);

  return (
    <div ref={exportMenuRef} className="fixed bottom-4 sm:bottom-16 right-4 z-50 ">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-ms-clay-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-ms-amber-500 hover:shadow-lg 
hover:shadow-ms-clay-500/50 transition duration-300"
      >
        📦 Export
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 sm:bottom-30 right-4 z-40 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg w-[350px] max-h-[80vh] overflow-y-auto"
        >
          <div className="flex flex-wrap gap-4">
            {/* Format Selector */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium mb-1">
                Export Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="svg">SVG (Vector)</option>
                <option value="png">PNG (Raster)</option>
              </select>
            </div>

            {/* Size Preset Selector */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium mb-1">
                Size Preset
              </label>
              <select
                value={sizeOption}
                onChange={(e) => setSizeOption(e.target.value as ExportSize)}
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                {Object.entries(sizePresets).map(
                  ([key, { label, getDimensions }]) => {
                    const { width, height } = getDimensions();
                    return (
                      <option key={key} value={key}>
                        {label} ({width}×{height}px)
                      </option>
                    );
                  }
                )}
              </select>
            </div>
          </div>

          {sizeOption === 'custom' && (
            <div className="space-y-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {shiftHeld ? (
                  <span className="text-ms-brand-500">
                    ⇧ Shift held: Aspect ratio locked
                  </span>
                ) : (
                  <span>Hold ⇧ Shift to maintain aspect ratio</span>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[250px]">
                  <label className="block text-sm font-medium mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => {
                      const val = Math.min(
                        Math.max(100, Number(e.target.value)),
                        5000
                      );
                      setCustomWidth(val);
                      if (shiftHeld && svgOriginalDimensions.width > 0) {
                        setCustomHeight(
                          Math.round(
                            (val * svgOriginalDimensions.height) /
                              svgOriginalDimensions.width
                          )
                        );
                      }
                    }}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="flex-1 min-w-[250px]">
                  <label className="block text-sm font-medium mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => {
                      const val = Math.min(
                        Math.max(100, Number(e.target.value)),
                        5000
                      );
                      setCustomHeight(val);
                      if (shiftHeld && svgOriginalDimensions.height > 0) {
                        setCustomWidth(
                          Math.round(
                            (val * svgOriginalDimensions.width) /
                              svgOriginalDimensions.height
                          )
                        );
                      }
                    }}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            className="cursor-pointer w-full mt-2 px-4 py-2 bg-ms-clay-500 text-white rounded hover:bg-ms-amber-500 transition"
          >
            Export {format.toUpperCase()} ({sizePresets[sizeOption].label}:{' '}
            {sizePresets[sizeOption].getDimensions().width}×
            {sizePresets[sizeOption].getDimensions().height}px)
          </button>
        </div>
      )}
    </div>
  );
};

export default FloatingExportMenu;
