import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Whether a height-capped box's content is taller than the box, so that it scrolls.
 *
 * It is measured again when the box is resized and whenever `content` changes: content
 * growing inside a capped box does not resize the box itself.
 *
 * @param ref - The scrolling box
 * @param content - A value that changes whenever the box's content does
 */
export function useOverflowing(ref: RefObject<HTMLElement | null>, content: unknown): boolean {
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const update = () => setOverflowing(box.scrollHeight > box.clientHeight);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(box);
    return () => resizeObserver.disconnect();
  }, [ref, content]);

  return overflowing;
}
