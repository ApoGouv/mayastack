import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { Tooltip } from "react-tooltip";
import { toBase20String } from "@utils/base20";

interface Base20DisplayProps {
  label?: string;
  digits: number[];
  tooltip?: boolean;
  tooltipId?: string;
  className?: string;
}

const Base20Display: React.FC<Base20DisplayProps> = ({
  label,
  digits,
  tooltip = true,
  tooltipId,
  className = "",
}) => {
  const generatedId = useId();
  const id = tooltipId || `base20-tooltip-${generatedId}`;
  const expanded = toBase20String(digits, "expanded");

  // The expanded form has one term per digit, so for large numbers it is capped in height
  // and scrolls. Only then does it become a focusable, labelled region, so keyboard users
  // can scroll it; short representations stay plain text with their natural height.
  const boxRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScrollable(box.scrollHeight > box.clientHeight);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(box);
    return () => resizeObserver.disconnect();
  }, [expanded]);

  return (
    <div className={`w-full max-w-sm space-y-1 ${className}`}>
      {label && (
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </div>
      )}

      <div
        ref={boxRef}
        className="text-sm sm:text-base rounded-md px-4 py-3 mb-0 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 max-h-64 overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ms-moss-500"
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? `${label ?? "Number"} in base 20, expanded form` : undefined}
        data-tooltip-id={tooltip ? id : undefined}
        dangerouslySetInnerHTML={{ __html: expanded }}
      />

      {tooltip && (
        <Tooltip
          id={id}
          className="z-50 max-w-sm! bg-gray-900! text-white! text-sm! rounded! p-2!"
          place="top"
          offset={10}
          // Hover only: focusing the box is for scrolling it, and the tooltip would cover the content
          openEvents={{ mouseenter: true, focus: false }}
        >
          Notation: {digits.join(",")}
          <sub>20</sub>
        </Tooltip>
      )}
    </div>
  );
};

export default Base20Display;
