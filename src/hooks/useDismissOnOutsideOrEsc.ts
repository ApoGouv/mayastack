import { useEffect } from 'react';

export function useDismissOnOutsideOrEsc(
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  enabled: boolean = true,
  closeOnEscape: boolean = false
) {
  useEffect(() => {
    if (!enabled) return;

    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onDismiss();
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (closeOnEscape && event.key === 'Escape') {
        onDismiss();
      }
    }

    document.addEventListener('mousedown', handleClick);
    if (closeOnEscape) {
      document.addEventListener('keydown', handleKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClick);
      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKey);
      }
    };
  }, [ref, onDismiss, enabled, closeOnEscape]);
}
