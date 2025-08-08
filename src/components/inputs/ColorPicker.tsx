import React, { useState, useRef } from "react";
import { RgbaColorPicker } from "react-colorful";

import type { RgbaColor } from "@/types/colors";
import { getReadableTextColor } from "@utils/colors";
import { useDismissOnOutsideOrEsc } from "@hooks/useDismissOnOutsideOrEsc";

import "@components/inputs/ColorPicker.css";

interface ColorPickerProps {
  label?: string;
  value: RgbaColor;
  onChange: (color: RgbaColor) => void;
  showValue?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  label = "Color",
  value,
  onChange,
  showValue = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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
      className="relative inline-flex items-center justify-start gap-[0.7rem] my-[0.625rem] select-none"
    >
      <div className="flex items-center justify-between gap-4">
        {label && <label className="block text-[0.9rem]">{label}</label>}
        <div
          className={`${
              showValue
                ? "min-w-[215px] h-[36px] px-[0.6rem] py-[0.4rem]"
                : "w-[26px] h-[26px] p-0 inline-block"
            } flex items-center justify-between border border-gray-300 bg-white font-mono text-[0.85rem] leading-[1.2rem] rounded cursor-pointer text-center select-none transition-all duration-200 ease-in-out`}        
          style={{
            backgroundColor: rgbaString,
            color: textColor
          }}
          onClick={togglePicker}
        >
          {showValue && rgbaString}
        </div>
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
