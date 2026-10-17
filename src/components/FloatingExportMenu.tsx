import React, { useState, useRef, useId } from 'react';
import type { ExportFormat, ExportSize, Dimensions } from '@/types/exportTypes';
import type { SizePreset } from '@utils/exportPresets';
import { useDismissOnOutsideOrEsc } from "@hooks/useDismissOnOutsideOrEsc";
import { checkPngSize } from '@utils/exportUtils';

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

/** The allowed range of a custom export width or height, in px */
const MIN_CUSTOM_SIZE = 100;
const MAX_CUSTOM_SIZE = 5000;

const CUSTOM_SIZE_RANGE = `${MIN_CUSTOM_SIZE.toLocaleString('en-US')} to ${MAX_CUSTOM_SIZE.toLocaleString('en-US')} px`;

/** Why the text of a custom width or height can't be exported, or null if it can */
function customSizeError(text: string, dimension: 'Width' | 'Height'): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return `Enter a ${dimension.toLowerCase()} from ${CUSTOM_SIZE_RANGE}.`;
  if (!/^\d+$/.test(trimmed)) return `${dimension} must be a whole number of pixels, from ${CUSTOM_SIZE_RANGE}.`;
  const size = Number(trimmed);
  if (size < MIN_CUSTOM_SIZE || size > MAX_CUSTOM_SIZE) return `${dimension} must be from ${CUSTOM_SIZE_RANGE}.`;
  return null;
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

  // Sizes derived from the numeral are 0 × 0 until it has been measured, just after it mounts:
  // such a size is not known yet, rather than invalid, so it is neither flagged nor exported
  const isKnownSize = (size: ExportSize) => {
    const { width, height } = sizePresets[size].getDimensions();
    return width > 0 && height > 0;
  };
  // Why the app's PNG size policy refuses a known size, or null; SVG export has no size limit
  const pngRefusalFor = (size: ExportSize) => {
    if (format !== 'png' || !isKnownSize(size)) return null;
    const { width, height } = sizePresets[size].getDimensions();
    const check = checkPngSize(width, height);
    return check.supported ? null : check.reason;
  };
  const unsupportedReason = pngRefusalFor(sizeOption);
  const unsupportedMessageId = useId();

  // The custom size as typed. It is never rewritten while it is edited: only a valid value is
  // passed on to be exported, and while either one is invalid the custom size can't be exported
  const [widthText, setWidthText] = useState(String(customWidth));
  const [heightText, setHeightText] = useState(String(customHeight));
  const widthError = customSizeError(widthText, 'Width');
  const heightError = customSizeError(heightText, 'Height');
  const widthErrorId = useId();
  const heightErrorId = useId();
  const customSizeInvalid = widthError !== null || heightError !== null;

  const changeCustomWidth = (text: string) => {
    setWidthText(text);
    if (customSizeError(text, 'Width') !== null) return;
    const width = Number(text);
    setCustomWidth(width);
    if (shiftHeld && svgOriginalDimensions.width > 0) {
      const height = Math.round((width * svgOriginalDimensions.height) / svgOriginalDimensions.width);
      setHeightText(String(height));
      if (customSizeError(String(height), 'Height') === null) setCustomHeight(height);
    }
  };

  const changeCustomHeight = (text: string) => {
    setHeightText(text);
    if (customSizeError(text, 'Height') !== null) return;
    const height = Number(text);
    setCustomHeight(height);
    if (shiftHeld && svgOriginalDimensions.height > 0) {
      const width = Math.round((height * svgOriginalDimensions.width) / svgOriginalDimensions.height);
      setWidthText(String(width));
      if (customSizeError(String(width), 'Width') === null) setCustomWidth(width);
    }
  };

  // The size to show for a preset: none for a custom size that can't be exported as typed
  const shownSize = (size: ExportSize) =>
    size === 'custom' && customSizeInvalid ? null : sizePresets[size].getDimensions();
  const selectedLabel = sizePresets[sizeOption].label;
  const selectedSize = shownSize(sizeOption);
  const canExport =
    unsupportedReason === null && isKnownSize(sizeOption) && !(sizeOption === 'custom' && customSizeInvalid);

  const sizeInputClass = (error: string | null) =>
    `w-full p-2 border rounded dark:bg-gray-800 ${
      error ? 'border-red-500 dark:border-red-400' : 'dark:border-gray-700'
    }`;

  return (
    <div ref={exportMenuRef} className="fixed bottom-4 sm:bottom-16 right-4 z-50 ">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="floating-export-menu-panel"
        className="cursor-pointer bg-ms-clay-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-ms-amber-500 hover:shadow-lg 
hover:shadow-ms-clay-500/50 transition duration-300"
      >
        📦 Export
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div
          id="floating-export-menu-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-menu-heading"
          className="fixed bottom-18 sm:bottom-30 right-4 z-40 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg max-w-[350px] max-h-[80vh] overflow-y-auto"
          style={{ width: 'calc(100% - 2*var(--spacing) * 4)' }}
        >
          <div className="flex flex-wrap gap-4">
            <h2 id="export-menu-heading" className="sr-only">Export Options</h2>

            {/* Format Selector */}
            <div className="flex-1 min-w-[250px]">
              <label htmlFor="export-format-select" className="block text-sm font-medium mb-1">
                Export Format
              </label>
              <select
                id="export-format-select"
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
              <label htmlFor="size-preset-select" className="block text-sm font-medium mb-1">
                Size Preset
              </label>
              <select
                id="size-preset-select"
                value={sizeOption}
                onChange={(e) => setSizeOption(e.target.value as ExportSize)}
                aria-describedby={unsupportedReason ? unsupportedMessageId : undefined}
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                {Object.entries(sizePresets).map(
                  ([key, { label }]) => {
                    const size = shownSize(key as ExportSize);
                    const tooLargeForPng = pngRefusalFor(key as ExportSize) !== null;
                    return (
                      <option key={key} value={key} disabled={tooLargeForPng}>
                        {label}{size && ` (${size.width}×${size.height}px)`}{tooLargeForPng && ' – PNG too large'}
                      </option>
                    );
                  }
                )}
              </select>
            </div>
          </div>

          {unsupportedReason && (
            <p id={unsupportedMessageId} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              PNG isn’t available at this size. {unsupportedReason} Choose a smaller size, or export as SVG.
            </p>
          )}

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
                  <label htmlFor="size-custom-width" className="block text-sm font-medium mb-1">
                    Width (px)
                  </label>
                  <input
                    id="size-custom-width"
                    type="number"
                    min={MIN_CUSTOM_SIZE}
                    max={MAX_CUSTOM_SIZE}
                    step={1}
                    value={widthText}
                    onChange={(e) => changeCustomWidth(e.target.value)}
                    aria-invalid={widthError !== null}
                    aria-describedby={widthError ? widthErrorId : undefined}
                    className={sizeInputClass(widthError)}
                  />
                  {/* Always rendered so screen readers announce the message when it appears */}
                  <p
                    id={widthErrorId}
                    aria-live="polite"
                    className={`text-sm text-red-600 dark:text-red-400 ${widthError ? 'mt-1' : ''}`}
                  >
                    {widthError}
                  </p>
                </div>
                <div className="flex-1 min-w-[250px]">
                  <label htmlFor="size-custom-height" className="block text-sm font-medium mb-1">
                    Height (px)
                  </label>
                  <input
                    id="size-custom-height"
                    type="number"
                    min={MIN_CUSTOM_SIZE}
                    max={MAX_CUSTOM_SIZE}
                    step={1}
                    value={heightText}
                    onChange={(e) => changeCustomHeight(e.target.value)}
                    aria-invalid={heightError !== null}
                    aria-describedby={heightError ? heightErrorId : undefined}
                    className={sizeInputClass(heightError)}
                  />
                  <p
                    id={heightErrorId}
                    aria-live="polite"
                    className={`text-sm text-red-600 dark:text-red-400 ${heightError ? 'mt-1' : ''}`}
                  >
                    {heightError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={!canExport}
            aria-describedby={unsupportedReason ? unsupportedMessageId : undefined}
            className="cursor-pointer w-full mt-2 px-4 py-2 bg-ms-clay-500 text-white rounded hover:bg-ms-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-ms-clay-500"
            aria-label={`Export ${format.toUpperCase()} image with size ${selectedLabel}${
              selectedSize ? ` (${selectedSize.width} by ${selectedSize.height} pixels)` : ''
            }`}
          >
            Export {format.toUpperCase()} ({selectedLabel}
            {selectedSize && `: ${selectedSize.width}×${selectedSize.height}px`})
          </button>
        </div>
      )}
    </div>
  );
};

export default FloatingExportMenu;
