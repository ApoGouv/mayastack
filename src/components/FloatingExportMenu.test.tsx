// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSizePresets } from '@utils/exportPresets';
import type { ExportFormat, ExportSize } from '@/types/exportTypes';
import FloatingExportMenu from './FloatingExportMenu';

afterEach(cleanup);

// The logical size of the largest supported number: 99 base-20 digits of 80 units, 350 wide
const LARGEST_NUMBER = { width: 350, height: 7920, aspectRatio: 350 / 7920 };

// The size before the numeral has been measured, just after it mounts
const UNMEASURED = { width: 0, height: 0, aspectRatio: 1 };

/** Renders the open menu (for the largest number by default) and returns its controls */
function renderMenu(
  format: ExportFormat,
  sizeOption: ExportSize,
  original = LARGEST_NUMBER,
  placement?: 'floating' | 'header'
) {
  const handleExport = vi.fn();
  const menu = (format: ExportFormat) => (
    <FloatingExportMenu
      placement={placement}
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

    expect(option(/^Original Size \(350×7920px\)$/).disabled).toBe(false);
    expect(option(/^Custom Size/).disabled).toBe(false);
    expect(option(/^Small \(600×13577px\)$/).disabled).toBe(false);
    expect(option(/^Medium \(1200×27154px\)$/).disabled).toBe(false);
    expect(option(/^Large \(2400×54309px\) – PNG too large$/).disabled).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains an unsupported selected PNG size and does not export it', () => {
    const { exportButton, handleExport } = renderMenu('png', 'large');

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe(
      'PNG isn’t available at this size. PNG export is limited to 32,767 px in width and height, the most some browsers can draw; this one would be 2,400 × 54,309 px. Choose a smaller size, or export as SVG.'
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

    expect(option(/^Large \(2400×54309px\)$/).disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(exportButton());
    expect(handleExport).toHaveBeenCalledOnce();
  });
});

/** Renders the open menu at the custom size (800 × 600 to start) for a small number */
function renderCustomSizeMenu() {
  const setCustomWidth = vi.fn();
  const setCustomHeight = vi.fn();
  const handleExport = vi.fn();
  const original = { width: 350, height: 160, aspectRatio: 350 / 160 };
  render(
    <FloatingExportMenu
      format="png"
      setFormat={vi.fn()}
      sizeOption="custom"
      setSizeOption={vi.fn()}
      sizePresets={getSizePresets(original, 800, 600)}
      shiftHeld={false}
      svgOriginalDimensions={original}
      customWidth={800}
      setCustomWidth={setCustomWidth}
      customHeight={600}
      setCustomHeight={setCustomHeight}
      handleExport={handleExport}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));
  const exportButton = () => screen.getByRole('button', { name: /^Export PNG image/ }) as HTMLButtonElement;
  return { setters: { Width: setCustomWidth, Height: setCustomHeight }, handleExport, exportButton };
}

const sizeField = (dimension: string) => screen.getByLabelText(`${dimension} (px)`) as HTMLInputElement;

/** Edits a field one keystroke at a time, as typing does: each change starts from what the field shows */
function typeInto(field: HTMLInputElement, text: string) {
  for (const char of text) fireEvent.change(field, { target: { value: field.value + char } });
}

const clear = (field: HTMLInputElement) => fireEvent.change(field, { target: { value: '' } });

/** The message a size field is described by, or null */
const messageFor = (field: HTMLInputElement) => {
  const id = field.getAttribute('aria-describedby');
  return id ? document.getElementById(id)?.textContent ?? null : null;
};

describe.each(['Width', 'Height'] as const)('FloatingExportMenu custom %s', (dimension) => {
  it('can be cleared and stays empty and editable, without becoming 100', () => {
    const { setters, exportButton } = renderCustomSizeMenu();
    clear(sizeField(dimension));

    expect(sizeField(dimension).value).toBe('');
    expect(messageFor(sizeField(dimension))).toBe(`Enter a ${dimension.toLowerCase()} from 100 to 5,000 px.`);
    expect(exportButton().disabled).toBe(true);
    expect(setters[dimension]).not.toHaveBeenCalled();
  });

  it('accepts 500 typed digit by digit', () => {
    const { setters, exportButton } = renderCustomSizeMenu();
    clear(sizeField(dimension));
    typeInto(sizeField(dimension), '500');

    expect(sizeField(dimension).value).toBe('500');
    expect(sizeField(dimension).getAttribute('aria-invalid')).toBe('false');
    expect(messageFor(sizeField(dimension))).toBeNull();
    expect(setters[dimension]).toHaveBeenCalledOnce();
    expect(setters[dimension]).toHaveBeenCalledWith(500);
    expect(exportButton().disabled).toBe(false);
  });

  it.each(['50', '7000'])('rejects %s with a message instead of changing it', (text) => {
    const { setters, exportButton, handleExport } = renderCustomSizeMenu();
    clear(sizeField(dimension));
    typeInto(sizeField(dimension), text);

    expect(sizeField(dimension).value).toBe(text);
    expect(sizeField(dimension).getAttribute('aria-invalid')).toBe('true');
    expect(messageFor(sizeField(dimension))).toBe(`${dimension} must be from 100 to 5,000 px.`);
    // Never passed on, neither as typed nor as a value within the limits; 700, typed on the
    // way to 7000, is valid in itself
    expect(setters[dimension]).not.toHaveBeenCalledWith(Number(text));
    expect(setters[dimension].mock.calls.flat().every((size) => size !== 100 && size !== 5000)).toBe(true);
    expect(exportButton().disabled).toBe(true);
    fireEvent.click(exportButton());
    expect(handleExport).not.toHaveBeenCalled();
  });

  it('cannot export an incomplete or fractional size, and shows no stale size for it', () => {
    const { exportButton, handleExport } = renderCustomSizeMenu();
    for (const text of ['', '12.5']) {
      fireEvent.change(sizeField(dimension), { target: { value: text } });
      expect(exportButton().disabled).toBe(true);
      expect(exportButton().textContent).toBe('Export PNG (Custom Size)');
      expect(screen.getByRole('option', { name: /^Custom Size/ }).textContent).toBe('Custom Size');
    }
    expect(messageFor(sizeField(dimension))).toBe(`${dimension} must be a whole number of pixels, from 100 to 5,000 px.`);
    fireEvent.click(exportButton());
    expect(handleExport).not.toHaveBeenCalled();
  });

  it('accepts the limits 100 and 5000 and is exportable again once corrected', () => {
    const { setters, exportButton } = renderCustomSizeMenu();
    for (const text of ['100', '5000']) {
      fireEvent.change(sizeField(dimension), { target: { value: text } });
      expect(messageFor(sizeField(dimension))).toBeNull();
      expect(setters[dimension]).toHaveBeenLastCalledWith(Number(text));
    }
    fireEvent.change(sizeField(dimension), { target: { value: '99' } });
    expect(exportButton().disabled).toBe(true);
    fireEvent.change(sizeField(dimension), { target: { value: '640' } });
    expect(exportButton().disabled).toBe(false);
    expect(setters[dimension]).toHaveBeenLastCalledWith(640);
  });
});

describe('FloatingExportMenu panel focus', () => {
  const trigger = () => screen.getByRole('button', { name: '📦 Export' });
  const panel = () => screen.queryByRole('dialog', { name: 'Export Options' });

  it('is announced as a non-modal dialog', () => {
    renderMenu('svg', 'original');

    expect(panel()).not.toBeNull();
    expect(panel()!.hasAttribute('aria-modal')).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('returns focus to the Export button when Escape closes it from inside', () => {
    renderMenu('svg', 'original');
    const format = screen.getByLabelText('Export Format');
    format.focus();
    expect(document.activeElement).toBe(format);

    fireEvent.keyDown(format, { key: 'Escape' });

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('does not move focus to the Export button when a click outside closes it', () => {
    renderMenu('svg', 'original');
    screen.getByLabelText('Export Format').focus();

    fireEvent.mouseDown(document.body);

    expect(panel()).toBeNull();
    expect(document.activeElement).not.toBe(trigger());
  });
});

// UI-11: floating in the corner of the screen, or in the viewer's header where the viewer sticks
describe('FloatingExportMenu placement', () => {
  const trigger = () => screen.getByRole('button', { name: '📦 Export' });
  const panel = () => screen.queryByRole('dialog', { name: 'Export Options' });
  const classes = (el: Element) => el.className.split(/\s+/).filter(Boolean);

  afterEach(() => vi.restoreAllMocks());

  it('floats by default exactly as before: the trigger fixed in the corner, the panel fixed above it', () => {
    renderMenu('svg', 'original');
    const wrapper = trigger().parentElement!;

    expect(classes(wrapper)).toEqual(['fixed', 'bottom-4', 'sm:bottom-16', 'right-4', 'z-50']);
    expect(classes(trigger())).toEqual(expect.arrayContaining(['px-3.75', 'py-1.75', 'shadow-lg', 'rounded-full', 'bg-accent']));
    expect(classes(panel()!)).toEqual(expect.arrayContaining(['fixed', 'bottom-18', 'sm:bottom-30', 'right-4', 'z-40', 'max-w-[350px]', 'max-h-[80vh]', 'overflow-y-auto']));
    expect(classes(panel()!)).not.toContain('absolute');
    expect(panel()!.style.width).toBe('calc(100% - 2*var(--spacing) * 4)');
    expect(panel()!.style.maxHeight).toBe('');
  });

  it('sits in the header flow with the zoom controls’ height, its panel below it at its right edge', () => {
    renderMenu('svg', 'original', LARGEST_NUMBER, 'header');
    const wrapper = trigger().parentElement!;

    expect(classes(wrapper)).toEqual(['relative', 'shrink-0']);
    // Gold, 32 px tall like the zoom controls (h-8), flat in the toolbar
    expect(classes(trigger())).toEqual(expect.arrayContaining(['bg-accent', 'text-on-accent', 'border-accent-fg', 'rounded-full', 'h-8', 'px-3', 'text-sm']));
    expect(classes(trigger())).not.toEqual(expect.arrayContaining(['shadow-lg']));
    expect(classes(trigger()).some((c) => c.startsWith('py-'))).toBe(false);
    // Below the trigger, right-aligned, not fixed, nor at the floating offsets
    expect(classes(panel()!)).toEqual(expect.arrayContaining(['absolute', 'top-full', 'right-0', 'mt-2', 'z-40', 'max-w-[350px]', 'max-h-[80vh]', 'overflow-y-auto']));
    expect(classes(panel()!).filter((c) => /^(fixed|(sm:)?bottom-)/.test(c))).toEqual([]);
    // As wide as when floating, against the screen rather than the trigger
    expect(panel()!.style.width).toBe('calc(100vw - 2*var(--spacing) * 4)');
  });

  it('limits the header panel to the room below the trigger, measured again as the page scrolls', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(720);
    const bottom = { value: 200 };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top: bottom.value - 32, bottom: bottom.value, left: 0, right: 0, width: 0, height: 32, x: 0, y: 0 }) as DOMRect
    );
    renderMenu('svg', 'original', LARGEST_NUMBER, 'header');

    // 720 − 200 − 8 (gap) − 16 (margin)
    expect(panel()!.style.maxHeight).toBe('min(80vh, 496px)');
    bottom.value = 300;
    fireEvent.scroll(window);
    expect(panel()!.style.maxHeight).toBe('min(80vh, 396px)');
  });

  it('keeps the dialog’s interactions in the header: Escape returns focus, an outside click does not take it', () => {
    renderMenu('svg', 'original', LARGEST_NUMBER, 'header');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const format = screen.getByLabelText('Export Format');
    format.focus();
    fireEvent.keyDown(format, { key: 'Escape' });
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());

    fireEvent.click(trigger());
    screen.getByLabelText('Export Format').focus();
    fireEvent.mouseDown(document.body);
    expect(panel()).toBeNull();
    expect(document.activeElement).not.toBe(trigger());
  });
});
