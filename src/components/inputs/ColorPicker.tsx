import React, { useState, useRef, useId } from "react";
import { RgbaColorPicker } from "react-colorful";

import type { RgbaColor } from "@/types/colors";
import { getReadableTextColor } from "@utils/colors";
import { useDismissOnOutsideOrEsc } from "@hooks/useDismissOnOutsideOrEsc";

import "@components/inputs/ColorPicker.css";

interface ColorPickerProps {
  id?: string;
  label?: string;
  value: RgbaColor;
  onChange: (color: RgbaColor) => void;
  showValue?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  id,
  label = "Color:",
  value,
  onChange,
  showValue = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const generatedId = useId();
  const buttonId = id ?? `color-picker-button-${generatedId}`;

  const rgbaString = `rgba(${value.r}, ${value.g}, ${
    value.b
  }, ${value.a.toFixed(2)})`;

  const togglePicker = () => setIsOpen((prev) => !prev);
  const textColor = getReadableTextColor(value);

  // Close on click outside or ESC
  useDismissOnOutsideOrEsc(pickerRef, () => setIsOpen(false), isOpen, true);

  return (
    <div
      ref={pickerRef}
      className="relative inline-flex items-center justify-start gap-[0.7rem] my-[0.625rem] select-none w-full max-w-md"
    >
      <div className="flex items-center justify-between gap-4 w-full">
        {label && (
          <label htmlFor={buttonId} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            {label}
          </label>
        )}

        <button
          id={buttonId}
          type="button"
          onClick={togglePicker}
          className={`${
              showValue
                ? "min-w-[215px] h-[34px] px-[0.6rem] py-[0.4rem] font-mono text-[0.85rem] leading-[1.2rem] text-center"
                : "w-[24px] h-[24px] p-0 inline-block"
            } flex items-center justify-between border border-gray-300 bg-white rounded cursor-pointer select-none transition-all duration-200 ease-in-out color-preview`}        
          style={{
            backgroundColor: rgbaString,
            color: textColor
          }}
          aria-label={label}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          {showValue && rgbaString}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-[6px] z-10 bg-neutral-800 border border-gray-300 p-2 rounded-lg shadow-md">
          <RgbaColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
