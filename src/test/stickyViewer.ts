import { act } from '@testing-library/react';
import { vi } from 'vitest';
import { STICKY_VIEWER_QUERY } from '@/hooks/useMediaQuery';

/**
 * Stands in for the `sticky-viewer` media query (STICKY_VIEWER_QUERY), matching or not, and for
 * every other media query as not matching (light theme, no reduced motion). Returns a function
 * that changes it and tells its listeners, as a resize across the threshold does. Undone by
 * `vi.restoreAllMocks()`.
 */
export function stubStickyViewer(sticky: boolean) {
  const listeners = new Set<() => void>();
  const state = { sticky };
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (media: string) =>
      ({
        media,
        get matches() {
          return media === STICKY_VIEWER_QUERY && state.sticky;
        },
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      }) as unknown as MediaQueryList
  );
  return (next: boolean) => {
    state.sticky = next;
    act(() => listeners.forEach((listener) => listener()));
  };
}
