// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import { toBase20 } from '@utils/base20';
import MayanExportPanel from './MayanExportPanel';
import MayanRenderer from './MayanRenderer';
import NumeralViewport from './NumeralViewport';

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
});

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
});
