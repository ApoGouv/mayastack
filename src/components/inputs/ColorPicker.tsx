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
    <div className="color-picker" ref={pickerRef}>
      <div className="flex items-center justify-between gap-4">
        {label && <label className="color-picker-label">{label}</label>}
        <div
          className={`color-picker-swatch ${showValue ? 'with-value' : 'no-value'}`}
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
        <div className="color-picker-popover">
          <RgbaColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
