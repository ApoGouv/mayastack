import React from 'react';

export type RenderMode = 'number' | 'date';

interface RenderModeSwitcherProps {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
}

const RenderModeSwitcher: React.FC<RenderModeSwitcherProps> = ({ mode, onChange }) => {
  return (
    <div
      role="radiogroup"
      aria-label="Select render mode"
      className="flex items-center gap-4 mt-4"
    >
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
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

      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
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
  );
};

export default RenderModeSwitcher;