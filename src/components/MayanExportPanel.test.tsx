// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import { toBase20 } from '@utils/base20';
import { exportPng, PngSizeError } from '@utils/exportUtils';
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
            <NumeralViewport label="Mayan numeral">
              <MayanRenderer
                digitGroups={[toBase20(10n ** 500n - 1n)]}
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

