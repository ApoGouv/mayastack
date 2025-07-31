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

      const paddingX =
        parseFloat(computedStyle.paddingLeft) +
        parseFloat(computedStyle.paddingRight);
      const paddingY =
        parseFloat(computedStyle.paddingTop) +
        parseFloat(computedStyle.paddingBottom);

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
