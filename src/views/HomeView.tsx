import { useState } from "react";
import { toBase20, toBase20String } from "@utils/base20";
import MayanNumeralRenderer from "@components/MayanNumeralRenderer";
import MayanDateRenderer from "@components/MayanDateRenderer";
import MayanExportPanel from "@components/MayanExportPanel";
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
      )}

      {/* Number Mode Output */}
      {mode === "number" && isValidNumber && (
        <div className="space-y-4">

          {/* Base-20 Digits */}
          <div>
            <h3 className="text-lg font-semibold">Base-20 Representation</h3>
             <div className="flex flex-col sm:flex-row gap-4">
                {/* Notation Form */}
                <div className="flex-1 max-w-sm">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Notation</div>
                  <code
                    className="block text-sm sm:text-base p-3 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    dangerouslySetInnerHTML={{
                      __html: toBase20String(base20Digits, 'notation'),
                    }}
                  />
                </div>

                {/* Expanded Form */}
                <div className="flex-1 max-w-sm">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Expanded</div>
                  <code
                    className="block text-sm sm:text-base p-3 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    dangerouslySetInnerHTML={{
                      __html: toBase20String(base20Digits, 'expanded'),
                    }}
                  />
                </div>
              </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Mayan Numeral</h3>
            <MayanExportPanel
              filename={`mayan-numeral-number-${parsedNumber}`}
              showGrid={showGrid}
            >
              <MayanNumeralRenderer digits={base20Digits} />
            </MayanExportPanel>
          </div>
        </div>
      )}

      {/* Date Mode Output */}
      {mode === "date" && dateParts && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Base-20 Date Parts</h3>
            <code className="text-sm sm:text-base block p-2 bg-gray-100 dark:bg-gray-800 rounded">
              {toBase20(dateParts.day).join(" • ")} |{" "}
              {toBase20(dateParts.month).join(" • ")} |{" "}
              {toBase20(dateParts.year).join(" • ")}
            </code>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Mayan Numeral Date</h3>
            <div className="flex flex-wrap gap-4">
              <MayanExportPanel
                filename={`mayan-numeral-date-${dateParts.day}-${dateParts.month}-${dateParts.year}`}
                showGrid={showGrid}
              >
                <MayanDateRenderer dateParts={dateParts} />
              </MayanExportPanel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
