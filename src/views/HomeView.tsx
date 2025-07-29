import { useState } from "react";
import { toBase20 } from "@utils/base20";
import MayanNumeralRenderer from "@components/MayanNumeralRenderer";
import MayanDateRenderer from "@components/MayanDateRenderer";
import MayanExportPanel from "@components/MayanExportPanel";
import Base20Display from "@components/Base20Display";
import RenderModeSwitcher from "@components/inputs/RenderModeSwitcher";
import type { RenderMode } from "@components/inputs/RenderModeSwitcher";
import ColorPicker from "@components/inputs/ColorPicker";
import NumberInput from "@components/inputs/NumberInput";
import ShowGridToggle from "@components/inputs/ShowGridToggle";
import DateInput from "@components/inputs/DateInput";
import type { DateParts } from "@components/inputs/DateInput";
import { useColorContext } from "@context/ColorContext";

/**
 * HomeView is the main input view of the app.
 *  Users can convert either a number or a date to Mayan numeral glyphs.
 */
export default function HomeView() {
  const [mode, setMode] = useState<RenderMode>("number");
  const [numberInput, setNumberInput] = useState("");
  const parsedNumber = parseInt(numberInput, 10);
  const isValidNumber = !isNaN(parsedNumber) && parsedNumber >= 0;

  // Store the parsed digits once
  const base20Digits = isValidNumber ? toBase20(parsedNumber) : [];

  const [dateInputRaw, setDateInputRaw] = useState("");
  const [dateParts, setDateParts] = useState<DateParts>(null);

  const [showGrid, setShowGrid] = useState(true);

  // 🎨 Use centralized color context
  const {
    backgroundColor,
    setBackgroundColor,
    glyphColor,
    setGlyphColor,
  } = useColorContext();

  const handleNumberInputChange = (value: string) => {
    setNumberInput(value);
  };

  const handleDateInputChange = (parsed: DateParts, raw: string) => {
    setDateParts(parsed);
    setDateInputRaw(raw);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-ms-brand-500">
        🌄 Convert to Mayan Numerals
      </h1>

      {/* Mode Switcher */}
      <RenderModeSwitcher mode={mode} onChange={setMode} />

      {/* Input based on mode */}
      {mode === "number" && (
        <NumberInput value={numberInput} onChange={handleNumberInputChange} />
      )}

      {mode === "date" && (
        <DateInput value={dateInputRaw} onChange={handleDateInputChange} />
      )}

      {/* Color Pickers + Show Grid Toggle */}
      {((mode === "number" && isValidNumber) || (mode === "date" && dateParts)) && (
        <fieldset className="border border-gray-300 dark:border-gray-700 rounded-md p-4 space-y-4 max-w-3xl w-full">
          <legend className="text-sm font-semibold text-gray-600 dark:text-gray-300 px-2">
            SVG Display Settings
          </legend>
          <div className="flex flex-wrap items-center gap-4">
            <ColorPicker
              label="Background color:"
              value={backgroundColor}
              onChange={setBackgroundColor}
              showValue={false}
            />
            <ColorPicker
              label="Glyph color:"
              value={glyphColor}
              onChange={setGlyphColor}
              showValue={false}
            />
            <ShowGridToggle value={showGrid} onChange={setShowGrid} />
          </div>
        </fieldset>
      )}

      {/* Number Mode Output */}
      {mode === "number" && isValidNumber && (
        <div className="space-y-4">

          {/* Base-20 Digits */}
          <div className="max-w-3xl w-full space-y-2">
            <h3 className="text-lg font-semibold">Input to Base-20 Representation</h3>
            <Base20Display label="Number" digits={base20Digits} />
          </div>

          <div className="max-w-3xl w-full space-y-2">
            <h3 className="text-lg font-semibold">Mayan Numeral</h3>
            <div className="flex flex-wrap gap-4">
            <MayanExportPanel
              filename={`mayan-numeral-number-${parsedNumber}`}
              showGrid={showGrid}
            >
              {(ref, gridActive) => (
                <MayanNumeralRenderer 
                  digits={base20Digits} 
                  exportRef={ref} 
                  showGrid={gridActive}
                />
              )}
            </MayanExportPanel>
            </div>
          </div>
        </div>
      )}

      {/* Date Mode Output */}
      {mode === "date" && dateParts && (
        <div className="space-y-4">
          <div className="max-w-3xl w-full space-y-2">
            <h3 className="text-lg font-semibold">Input to Base-20 Representation</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Base20Display label="Day" digits={toBase20(dateParts.day)} />
              <Base20Display label="Month" digits={toBase20(dateParts.month)} />
              <Base20Display label="Year" digits={toBase20(dateParts.year)} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Mayan Numeral Date</h3>
            <div className="flex flex-wrap gap-4">
              <MayanExportPanel
                filename={`mayan-numeral-date-${dateParts.day}-${dateParts.month}-${dateParts.year}`}
                showGrid={showGrid}
              >
                {(ref, gridActive) => (
                  <MayanDateRenderer 
                    dateParts={dateParts}
                    exportRef={ref} 
                    showGrid={gridActive}
                  />
                )}
              </MayanExportPanel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
