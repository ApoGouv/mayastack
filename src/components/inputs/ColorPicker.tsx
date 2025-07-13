import React, { useState, useRef, useEffect } from "react";
import { RgbaColorPicker } from "react-colorful";

import "@components/inputs/ColorPicker.css";

export type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

interface ColorPickerProps {
  label?: string;
  value: RgbaColor;
  onChange: (color: RgbaColor) => void;
  showValue?: boolean;
}

export function getReadableTextColor({ r, g, b, a }: RgbaColor): string {
  if (a === 0) return "#000"; // Transparent → black text by default

  // Normalize RGB to [0,1]
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  // Luminance formula
  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

  // Contrast with white and black
  const contrastWithWhite = (1.05) / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;

  return contrastWithWhite > contrastWithBlack ? "#fff" : "#000";
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
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  return (
    <div className="color-picker" ref={pickerRef}>
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

      {isOpen && (
        <div className="color-picker-popover">
          <RgbaColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
