import React from 'react';

export type RenderMode = 'number' | 'date';

interface RenderModeSwitcherProps {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
  label?: string; // Optional prop for customization
}

const RenderModeSwitcher: React.FC<RenderModeSwitcherProps> = ({ 
  mode, 
  onChange,
  label = 'Choose Input Mode' // Default label
 }) => {
  return (
    <div className="space-y-2">
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-4"
      >
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="radio"
            name="renderMode"
            value="number"
            checked={mode === "number"}
            onChange={() => onChange("number")}
            className="w-5 h-5 accent-ms-moss-500"
          />
          Number
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="radio"
            name="renderMode"
            value="date"
            checked={mode === "date"}
            onChange={() => onChange("date")}
            className="w-5 h-5 accent-ms-moss-500"
          />
          Date
        </label>
      </div>
    </div>
  );
};

export default RenderModeSwitcher;