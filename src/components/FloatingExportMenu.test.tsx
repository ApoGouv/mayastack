// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSizePresets } from '@utils/exportPresets';
import type { ExportFormat, ExportSize } from '@/types/exportTypes';
import FloatingExportMenu from './FloatingExportMenu';

afterEach(cleanup);

// The logical size of the largest supported number: 385 base-20 digits of 80 units, 350 wide
const LARGEST_NUMBER = { width: 350, height: 30800, aspectRatio: 350 / 30800 };

// The size before the numeral has been measured, just after it mounts
const UNMEASURED = { width: 0, height: 0, aspectRatio: 1 };

/** Renders the open menu (for the largest number by default) and returns its controls */
function renderMenu(format: ExportFormat, sizeOption: ExportSize, original = LARGEST_NUMBER) {
  const handleExport = vi.fn();
  const menu = (format: ExportFormat) => (
    <FloatingExportMenu
      format={format}
      setFormat={vi.fn()}
      sizeOption={sizeOption}
      setSizeOption={vi.fn()}
      sizePresets={getSizePresets(original, 800, 600)}
      shiftHeld={false}
      svgOriginalDimensions={original}
      customWidth={800}
      setCustomWidth={vi.fn()}
      customHeight={600}
      setCustomHeight={vi.fn()}
      handleExport={handleExport}
    />
  );
  const { rerender } = render(menu(format));
  fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));

  const option = (name: RegExp) => screen.getByRole('option', { name }) as HTMLOptionElement;
  const exportButton = () => screen.getByRole('button', { name: /^Export (SVG|PNG) image/ }) as HTMLButtonElement;
  const changeFormat = (format: ExportFormat) => rerender(menu(format));
  return { option, exportButton, changeFormat, handleExport };
}

describe('FloatingExportMenu PNG size limits', () => {
  it('keeps the PNG sizes that pass the check and marks the others before selection', () => {
    const { option } = renderMenu('png', 'original');

    expect(option(/^Original Size \(350×30800px\)$/).disabled).toBe(false);
    expect(option(/^Custom Size/).disabled).toBe(false);
    for (const preset of [/^Small \(600×52800px\) – PNG too large$/, /^Medium .* – PNG too large$/, /^Large .* – PNG too large$/]) {
      expect(option(preset).disabled).toBe(true);
    }
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains an unsupported selected PNG size and does not export it', () => {
    const { exportButton, handleExport } = renderMenu('png', 'large');

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe(
      'PNG isn’t available at this size. PNG export is limited to 32,767 px in width and height, the most some browsers can draw; this one would be 2,400 × 211,200 px. Choose a smaller size, or export as SVG.'
    );
    expect(exportButton().disabled).toBe(true);
    expect(exportButton().getAttribute('aria-describedby')).toBe(alert.id);
    expect(screen.getByLabelText('Size Preset').getAttribute('aria-describedby')).toBe(alert.id);

    fireEvent.click(exportButton());
    expect(handleExport).not.toHaveBeenCalled();
  });

  it('restores export when switching from PNG back to SVG', () => {
    const { exportButton, changeFormat, handleExport } = renderMenu('png', 'large');
    expect(exportButton().disabled).toBe(true);

    changeFormat('svg');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(exportButton().disabled).toBe(false);
    expect(exportButton().hasAttribute('aria-describedby')).toBe(false);
    fireEvent.click(exportButton());
    expect(handleExport).toHaveBeenCalledOnce();
  });

  it('does not present a size that is not measured yet as an error, and does not export it', () => {
    const { option, exportButton, handleExport } = renderMenu('png', 'original', UNMEASURED);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(option(/^Original Size \(0×0px\)$/).disabled).toBe(false);
    expect(exportButton().disabled).toBe(true);
    fireEvent.click(exportButton());
    expect(handleExport).not.toHaveBeenCalled();
  });

  it('keeps every size available for SVG export', () => {
    const { option, exportButton, handleExport } = renderMenu('svg', 'large');

    expect(option(/^Large \(2400×211200px\)$/).disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(exportButton());
    expect(handleExport).toHaveBeenCalledOnce();
  });
});
