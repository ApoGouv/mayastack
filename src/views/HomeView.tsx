import { useState } from "react";
import { toBase20 } from "@utils/base20";
import MayanNumeralRenderer from "@components/MayanNumeralRenderer";
import MayanDateRenderer from "@components/MayanDateRenderer";
import MayanExportPanel from "@components/MayanExportPanel";
import RenderModeSwitcher from "@components/inputs/RenderModeSwitcher";
import type { RenderMode } from "@components/inputs/RenderModeSwitcher";
import ColorPicker from "@components/inputs/ColorPicker";
import NumberInput from "@components/inputs/NumberInput";
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
    <div>
      <h1>🌄 Convert to Mayan Numerals</h1>

      <RenderModeSwitcher mode={mode} onChange={setMode} />

      {mode === "number" && (
        <NumberInput value={numberInput} onChange={handleNumberInputChange} />
      )}

      {/* Color controls */}
      {((mode === "number" && isValidNumber) || (mode === "date" && dateParts)) && (
        <div 
          style={{ 
            display: "flex", 
            gap: "1rem", 
            alignItems: "center", 
            marginBottom: "1rem" 
          }}
        >
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
        </div>
      )}

      {mode === "number" && isValidNumber && (
        <div>
          <h3>Base-20 Digits:</h3>
          <code style={{ fontSize: "1.2rem" }}>
            {toBase20(parsedNumber).join(" • ")}
          </code>

          <h3>Mayan Numeral:</h3>
          <label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={() => setShowGrid(!showGrid)}
            />
            Show grid
          </label>

          <MayanExportPanel
            filename={`mayan-numeral-number-${parsedNumber}`}
            showGrid={showGrid}
          >
            <MayanNumeralRenderer digits={toBase20(parsedNumber)} />
          </MayanExportPanel>
        </div>
      )}

      {mode === "date" && (
        <DateInput value={dateInputRaw} onChange={handleDateInputChange} />
      )}

      {mode === "date" && dateParts && (
        <div>
          <h3>Date parts (base-20):</h3>
          <label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={() => setShowGrid(!showGrid)}
            />
            Show grid
          </label>

          <div
            style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}
          >
            <MayanExportPanel
              filename={`mayan-numeral-date-${dateParts?.day}-${dateParts?.month}-${dateParts?.year}`}
              showGrid={showGrid}
            >
              <MayanDateRenderer dateParts={dateParts} />
            </MayanExportPanel>
          </div>
        </div>
      )}
    </div>
  );
}
