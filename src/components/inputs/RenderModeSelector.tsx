import React from 'react';

export type RenderMode = 'number' | 'date';

interface RenderModeSelectorProps {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
  label?: string;
  name?: string; // for radio group name attribute, defaulted below
  layout?: 'horizontal' | 'vertical'; // optional layout control
}

const RenderModeSelector: React.FC<RenderModeSelectorProps> = ({ 
  mode, 
  onChange,
  label = 'Choose Input Mode',
  name = 'renderMode',
  layout = 'horizontal',
 }) => {

  const containerClass =
    layout === 'horizontal'
      ? 'flex items-center gap-4'
      : 'flex flex-col gap-2';

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        className={containerClass}
      >
        <label 
          htmlFor={`${name}-number`}
          className="inline-flex items-center gap-2 cursor-pointer text-sm"
        >
          <input
            id={`${name}-number`}
            type="radio"
            name={name}
            value="number"
            checked={mode === "number"}
            onChange={() => onChange("number")}
            className="w-5 h-5 accent-ms-moss-500"
          />
          Number
        </label>

        <label
          htmlFor={`${name}-date`}
          className="inline-flex items-center gap-2 cursor-pointer text-sm"
        >
          <input
            id={`${name}-date`}
            type="radio"
            name={name}
            value="date"
            checked={mode === "date"}
            onChange={() => onChange("date")}
            className="w-5 h-5 accent-ms-moss-500"
          />
          Date
        </label>
      </div>
    </fieldset>
  );
};

export default RenderModeSelector;