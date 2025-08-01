import React, { useRef, useState, useMemo} from 'react';
import toast from 'react-hot-toast';
import { useDebounce } from '@hooks/useDebounce';
import { useDimensions } from '@hooks/useDimensions';
import { useShiftKey } from '@hooks/useShiftKey';
import {
  prepareSvgCloneForExport,
  exportSvg,
  exportPng,
} from '@utils/exportUtils';
import {getSizePresets} from '@utils/exportPresets';
import type { MayanExportPanelProps, Dimensions, ExportSize, ExportFormat } from '@/types/exportTypes';

const MayanExportPanel: React.FC<MayanExportPanelProps> = ({
  children,
  filename = 'mayan-numeral',
}) => {
  const exportPlaceholderRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<SVGSVGElement | null>(null);

  const [format, setFormat] = useState<ExportFormat>('svg');
  const [sizeOption, setSizeOption] = useState<ExportSize>('original');
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
        toast.error('Export failed during SVG preparation.');
        return;
      }

      const exportFn = format === 'svg' ? exportSvg : exportPng;
      await exportFn(svgClone, `${filename}.${format}`);
      toast.success(`${format.toUpperCase()} exported! Check your downloads.`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    } finally {
      // Always clean up placeholder contents
      exportPlaceholderRef.current?.replaceChildren();
    }
  };

  return (
    <div className="mt-6">
      <div
        className={`mep-svg-wrapper bg-gray-200 dark:bg-gray-900 p-4 rounded-xs w-full max-w-sm`}
      >
        {children(exportRef)}
      </div>

      <div className="my-4 space-y-4">
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
              {Object.entries(sizePresets).map(([key, { label, getDimensions }]) => {
                const dimensions = getDimensions();
                return (
                  <option key={key} value={key}>
                    {label} ({dimensions.width}×{dimensions.height}px)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Custom Size Controls */}
        {sizeOption === 'custom' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {shiftHeld ? (
                <span className="text-ms-brand-500">⇧ Shift held: Aspect ratio locked</span>
              ) : (
                <span>Hold ⇧ Shift while changing values to maintain aspect ratio</span>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = Math.min(Math.max(100, Number(e.target.value)), 5000);
                    setCustomWidth(value);
                    // Maintain aspect ratio if holding shift
                    if (shiftHeld && svgOriginalDimensions.width > 0) {
                      setCustomHeight(Math.round(value * svgOriginalDimensions.height / svgOriginalDimensions.width));
                    }
                  }}
                  min="100"
                  max="5000"
                  step="10"
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = Math.min(Math.max(100, Number(e.target.value)), 5000);
                    setCustomHeight(value);
                    // Maintain aspect ratio if holding shift
                    if (shiftHeld && svgOriginalDimensions.height > 0) {
                      setCustomWidth(Math.round(value * svgOriginalDimensions.width / svgOriginalDimensions.height));
                    }
                  }}
                  min="100"
                  max="5000"
                  step="10"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-ms-clay-500 text-white rounded hover:bg-ms-amber-500 transition cursor-pointer"
        >
          Export {format.toUpperCase()} (
            {sizePresets[sizeOption].label}: {sizePresets[sizeOption].getDimensions().width}×{sizePresets[sizeOption].getDimensions().height}px
          )
        </button>
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
