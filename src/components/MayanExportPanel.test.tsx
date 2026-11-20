// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import { toBase20 } from '@utils/base20';
import { exportPng, PngSizeError } from '@utils/exportUtils';
import { stubStickyViewer } from '@/test/stickyViewer';
import type { ExportPlacement } from '@/types/exportTypes';
import MayanExportPanel from './MayanExportPanel';
import MayanRenderer from './MayanRenderer';
import NumeralViewport from './NumeralViewport';

// The real PNG conversion needs a browser; here it is replaced to simulate failures
vi.mock('@utils/exportUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/exportUtils')>()),
  exportPng: vi.fn(),
}));

/** Reports every observed element as off-screen, as when the result is scrolled out of view */
class OffScreenIntersectionObserver {
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ target, isIntersecting: false, intersectionRatio: 0 } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', OffScreenIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(exportPng).mockReset();
});

/** Renders the panel for a small number (logical size 350 × 160) */
function renderSmallResult() {
  render(
    <DisplaySettingsProvider>
      <Toaster />
      <MayanExportPanel filename="mayan-numeral-number-123">
        {(ref) => (
          <MayanRenderer digitGroups={[toBase20(123n)]} heightPerGlyphStack={80} widthPerGroup={350} exportRef={ref} />
        )}
      </MayanExportPanel>
    </DisplaySettingsProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));
}

/** Renders the panel for a small number and starts a PNG export at the custom size (800 × 600) */
async function exportCustomPng() {
  renderSmallResult();
  fireEvent.change(screen.getByLabelText('Export Format'), { target: { value: 'png' } });
  fireEvent.change(screen.getByLabelText('Size Preset'), { target: { value: 'custom' } });
  fireEvent.click(screen.getByRole('button', { name: /^Export PNG image/ }));
}

describe('MayanExportPanel', () => {
  it('offers Export for the largest number even while the result is off-screen', () => {
    render(
      <DisplaySettingsProvider>
        <MayanExportPanel filename="mayan-numeral-number-max">
          {(ref) => (
            <NumeralViewport numeralWidth={350} background="rgba(255, 255, 255, 1)" label="Mayan numeral">
              <MayanRenderer
                digitGroups={[toBase20(10n ** 128n - 1n)]}
                heightPerGlyphStack={80}
                widthPerGroup={350}
                exportRef={ref}
              />
            </NumeralViewport>
          )}
        </MayanExportPanel>
      </DisplaySettingsProvider>
    );

    expect(screen.getByRole('button', { name: '📦 Export' })).toBeTruthy();
  });

  it('offers the measured original size as soon as the result appears, without a transient 0 × 0', () => {
    renderSmallResult();
    fireEvent.change(screen.getByLabelText('Export Format'), { target: { value: 'png' } });

    expect(screen.getByRole('option', { name: 'Original Size (350×160px)' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('button', { name: /^Export PNG image/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('reports a PNG that passed the size check but could not be created', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(exportPng).mockRejectedValueOnce(new Error('Canvas to PNG conversion failed'));
    await exportCustomPng();

    expect(
      await screen.findByText(
        'This browser could not create the 800 × 600 px PNG, although the size is within the app’s PNG limits. Try a smaller size, or export as SVG.'
      )
    ).toBeTruthy();
    expect(vi.mocked(exportPng).mock.calls[0][1]).toBe('mayan-numeral-number-123.png');
  });

  it('exports a custom PNG at exactly the width and height entered', async () => {
    vi.mocked(exportPng).mockResolvedValueOnce();
    renderSmallResult();
    fireEvent.change(screen.getByLabelText('Export Format'), { target: { value: 'png' } });
    fireEvent.change(screen.getByLabelText('Size Preset'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Width (px)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Width (px)'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Height (px)'), { target: { value: '4321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export PNG image with size Custom Size (500 by 4321 pixels)' }));

    expect(await screen.findByText('PNG download started. Check your browser’s downloads.')).toBeTruthy();
    const [svg, filename] = vi.mocked(exportPng).mock.calls[0];
    expect([svg.getAttribute('width'), svg.getAttribute('height')]).toEqual(['500', '4321']);
    expect(filename).toBe('mayan-numeral-number-123.png');
  });

  it('reports a PNG refused by the size check', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(exportPng).mockRejectedValueOnce(new PngSizeError('A PNG can be at most 32,767 px wide or tall.'));
    await exportCustomPng();

    expect(
      await screen.findByText(
        'PNG not exported. A PNG can be at most 32,767 px wide or tall. Choose a smaller size, or export as SVG.'
      )
    ).toBeTruthy();
  });
});

// UI-11: the Export control in the viewer's header where the viewer sticks, floating elsewhere
describe('MayanExportPanel Export placement', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Renders the panel around a viewer that places the header control, if given, after its zoom controls */
  function renderPlaced(exportPlacement?: ExportPlacement) {
    const given: unknown[] = [];
    render(
      <DisplaySettingsProvider>
        <MayanExportPanel filename="mayan-numeral-number-123" exportPlacement={exportPlacement}>
          {(ref, headerExport) => {
            given.push(headerExport);
            return (
              <NumeralViewport numeralWidth={350} background="rgba(255, 255, 255, 1)" label="Mayan numeral" headerEnd={headerExport}>
                <MayanRenderer digitGroups={[toBase20(123n)]} heightPerGlyphStack={80} widthPerGroup={350} exportRef={ref} />
              </NumeralViewport>
            );
          }}
        </MayanExportPanel>
      </DisplaySettingsProvider>
    );
    const triggers = () => screen.getAllByRole('button', { name: '📦 Export' });
    const inHeader = () => screen.getByRole('group', { name: 'Zoom controls' }).parentElement!.contains(triggers()[0]);
    return { given, triggers, inHeader };
  }

  it('gives the viewer the control where the viewer sticks, and renders no floating copy', () => {
    stubStickyViewer(true);
    const { given, triggers, inHeader } = renderPlaced('viewer-header');

    expect(triggers()).toHaveLength(1);
    expect(inHeader()).toBe(true);
    expect(given.at(-1)).not.toBeNull();
    expect(triggers()[0].closest('.fixed')).toBeNull();
  });

  it('keeps it floating, outside the viewer, below the sticky-viewer layout', () => {
    stubStickyViewer(false);
    const { given, triggers, inHeader } = renderPlaced('viewer-header');

    expect(triggers()).toHaveLength(1);
    expect(inHeader()).toBe(false);
    expect(given.every((control) => control === null)).toBe(true);
    expect(triggers()[0].parentElement!.className).toBe('fixed bottom-4 sm:bottom-16 right-4 z-50 ');
  });

  it('keeps it floating by default, even where the viewer sticks', () => {
    stubStickyViewer(true);
    const { given, triggers, inHeader } = renderPlaced();

    expect(triggers()).toHaveLength(1);
    expect(inHeader()).toBe(false);
    expect(given.every((control) => control === null)).toBe(true);
  });

  it('moves the one control as the screen crosses the sticky-viewer threshold, and exports the same from either place', async () => {
    vi.mocked(exportPng).mockResolvedValue();
    const setSticky = stubStickyViewer(false);
    const { triggers, inHeader } = renderPlaced('viewer-header');
    const exportCustomPng = async () => {
      fireEvent.click(triggers()[0]);
      fireEvent.change(screen.getByLabelText('Export Format'), { target: { value: 'png' } });
      fireEvent.change(screen.getByLabelText('Size Preset'), { target: { value: 'custom' } });
      fireEvent.click(screen.getByRole('button', { name: /^Export PNG image/ }));
      await vi.waitFor(() => expect(vi.mocked(exportPng)).toHaveBeenCalled());
      const [svg, filename] = vi.mocked(exportPng).mock.calls.at(-1)!;
      vi.mocked(exportPng).mockClear();
      fireEvent.click(triggers()[0]); // close the menu
      return { markup: new XMLSerializer().serializeToString(svg), filename };
    };

    const floating = await exportCustomPng();
    setSticky(true);
    expect(triggers()).toHaveLength(1);
    expect(inHeader()).toBe(true);
    const header = await exportCustomPng();
    setSticky(false);
    expect(triggers()).toHaveLength(1);
    expect(inHeader()).toBe(false);

    expect(header).toEqual(floating);
  });
});
