import { useState, useEffect } from 'react';
import type { Dimensions } from '@/types/exportTypes';

export const useDimensions = (ref: React.RefObject<SVGSVGElement | null>) => {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
    aspectRatio: 1,
  });

  useEffect(() => {
    if (!ref?.current) {
      console.warn('SVG ref is not attached');
      return;
    }

    const svg = ref.current;

    const updateDimensions = () => {
      const computedStyle = window.getComputedStyle(svg);

      const contentWidth = svg.viewBox?.baseVal?.width || svg.clientWidth;
      const contentHeight = svg.viewBox?.baseVal?.height || svg.clientHeight;

      // An unset or unparseable padding counts as 0, so the size never becomes NaN
      const padding = (value: string) => parseFloat(value) || 0;
      const paddingX = padding(computedStyle.paddingLeft) + padding(computedStyle.paddingRight);
      const paddingY = padding(computedStyle.paddingTop) + padding(computedStyle.paddingBottom);

      const newWidth = contentWidth - paddingX;
      const newHeight = contentHeight - paddingY;

      setDimensions({
        width: newWidth,
        height: newHeight,
        aspectRatio: newWidth / newHeight,
      });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(svg);

    // Also observe inner SVG if different from container
    const innerSvg = svg.querySelector('svg');
    if (innerSvg) {
      resizeObserver.observe(innerSvg);
    }

    // Initial measurement
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return dimensions;
};
