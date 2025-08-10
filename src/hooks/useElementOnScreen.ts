import { useState, useEffect, useMemo } from 'react';
import type { RefObject } from 'react'

/**
 * Custom React hook that tracks whether a given element is currently visible
 * in the viewport or within a specified scrollable container using
 * the Intersection Observer API.
 *
 * This hook automatically memoizes the observer options to avoid unnecessary
 * re-instantiations of the observer due to changing object references.
 *
 * @template T - The type of the element being observed (must extend Element).
 *
 * @param ref - React ref object pointing to the element we want to observe.
 * @param options - Optional IntersectionObserver configuration:
 *    - root: Element | null — The scrollable container to use for visibility checks (null = viewport).
 *    - rootMargin: string — Margin around the root’s bounding box ("0px", "10px 0px", etc.).
 *    - threshold: number | number[] — How much of the target must be visible before callback triggers
 *                      (0 means any visibility).
 *
 * @returns {boolean} - Whether the element is currently intersecting (visible within observer constraints).
 *
 * @example
 * const myRef = useRef<HTMLDivElement>(null);
 * const isVisible = useElementOnScreen(myRef, { rootMargin: "0px", threshold: 0.5 });
 */
export function useElementOnScreen<T extends Element>(
  ref: RefObject<T | null>,
  options: IntersectionObserverInit = {}
): boolean {
  // State to keep track of the element's intersection status
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Memoize observer options to avoid unnecessary observer recreation on every render
  const observerOptions = useMemo<IntersectionObserverInit>(
    () => ({
      root: null,           // Default root is viewport
      rootMargin: '0px',    // Default no margin
      threshold: 0,         // Default triggers when any pixel is visible
      ...options            // Override defaults with provided options
    }),
    [
      options.root ?? null,
      options.rootMargin ?? '0px',
      // Serialize threshold array or single number to string for stable deps
      Array.isArray(options.threshold)
        ? options.threshold.join(',')
        : options.threshold ?? 0
    ]
  );

  useEffect(() => {
    const node = ref?.current;
    if (!node) return; // If ref is not assigned yet, do nothing

    // Create IntersectionObserver instance with memoized options
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Update state when intersection status changes
        setIsIntersecting(entry.isIntersecting);
      },
      observerOptions
    );

    observer.observe(node);

    // Cleanup: unobserve and disconnect observer when effect or ref changes
    return () => {
      observer.unobserve(node);
      observer.disconnect();
    };
  }, [ref, observerOptions]);

  return isIntersecting;
}
