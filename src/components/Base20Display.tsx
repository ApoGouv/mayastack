import React, { useId } from 'react';
import { Tooltip } from 'react-tooltip';
import { toBase20String } from '@utils/base20';

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
  className = '',
}) => {
  const generatedId = useId();
  const id = tooltipId || `base20-tooltip-${generatedId}`;
  const expanded = toBase20String(digits, 'expanded');
  const notation = 'Notation: ' + toBase20String(digits, 'notation');

  return (
    <div className={`w-full max-w-sm space-y-1 ${className}`}>
      {label && (
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </div>
      )}

      <div
        className="text-sm sm:text-base rounded-md px-4 py-3 mb-0 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700"
        data-tooltip-id={tooltip ? id : undefined}
        data-tooltip-html={tooltip ? notation : undefined}
        dangerouslySetInnerHTML={{ __html: expanded }}
      />

      {tooltip && (
        <Tooltip
          id={id}
          className="z-50 !max-w-sm !bg-gray-900 !text-white !text-sm !rounded !p-2"
          place="top"
          offset={10}
        />
      )}
    </div>
  );
};

export default Base20Display;