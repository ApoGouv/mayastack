import { useCallback, useSyncExternalStore } from 'react';

/**
 * The `sticky-viewer` variant's media query (src/index.css), for script: from lg (64rem wide) and
 * only on screens at least 40rem tall, where the viewer card sticks. Keep the two the same.
 */
export const STICKY_VIEWER_QUERY = '(min-width: 64rem) and (min-height: 40rem)';

/** Whether a media query matches now, updated as it starts or stops matching; false without matchMedia */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    },
    [query]
  );
  const getSnapshot = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
