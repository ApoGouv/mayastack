import { useState, useEffect } from 'react';

export const useShiftKey = () => {
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) =>
      e.key === 'Shift' && setShiftHeld(true);
    const handleKeyUp = (e: KeyboardEvent) =>
      e.key === 'Shift' && setShiftHeld(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return shiftHeld;
};
