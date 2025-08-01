import { useState } from 'react';
import { toBase20 } from '@utils/base20';
import MayanNumeralRenderer from '@components/MayanNumeralRenderer';
import MayanDateRenderer from '@components/MayanDateRenderer';
import MayanExportPanel from '@components/MayanExportPanel';
import Base20Display from '@components/Base20Display';
import RenderModeSwitcher from '@components/inputs/RenderModeSwitcher';
import type { RenderMode } from '@components/inputs/RenderModeSwitcher';
import DisplaySettings from '@components/DisplaySettings';
import NumberInput from '@components/inputs/NumberInput';
import DateInput from '@components/inputs/DateInput';
import type { DateParts } from '@components/inputs/DateInput';

/**
 * HomeView is the main input view of the app.
 *  Users can convert either a number or a date to Mayan numeral glyphs.
 */
export default function HomeView() {
  const [mode, setMode] = useState<RenderMode>('number');
  const [numberInput, setNumberInput] = useState('');
  const parsedNumber = parseInt(numberInput, 10);
  const isValidNumber = !isNaN(parsedNumber) && parsedNumber >= 0;

  // Store the parsed digits once
  const base20Digits = isValidNumber ? toBase20(parsedNumber) : [];

  const [dateInputRaw, setDateInputRaw] = useState('');
  const [dateParts, setDateParts] = useState<DateParts>(null);

  const handleNumberInputChange = (value: string) => {
    setNumberInput(value);
  };

  const handleDateInputChange = (parsed: DateParts, raw: string) => {
    setDateParts(parsed);
    setDateInputRaw(raw);
  };

  return (
    <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <header className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-ms-brand-500">
          🌄 Convert to Mayan Numerals
        </h1>
      </header>

      {/* Input Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-4">
        {/* Mode Switcher */}
        <RenderModeSwitcher mode={mode} onChange={setMode} />

        {mode === 'number' ? (
          <NumberInput value={numberInput} onChange={handleNumberInputChange} />
        ) : (
          <DateInput value={dateInputRaw} onChange={handleDateInputChange} />
        )}
      </section>

      {/* Display Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        {/* Color pickers and grid toggle */}
        {((mode === 'number' && isValidNumber) ||
          (mode === 'date' && dateParts)) && <DisplaySettings />}
      </div>

      {/* Results Section */}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Base-20 Representation</h3>
          {/* Base20Display components */}

          {/* Number Mode Output */}
          {mode === 'number' && isValidNumber && (
            <Base20Display label="Number" digits={base20Digits} />
          )}

          {/* Date Mode Output */}
          {mode === 'date' && dateParts && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Base20Display label="Day" digits={toBase20(dateParts.day)} />
              <Base20Display label="Month" digits={toBase20(dateParts.month)} />
              <Base20Display label="Year" digits={toBase20(dateParts.year)} />
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Mayan Numeral</h3>
          {/* MayanRenderer and ExportPanel */}

          {/* Number Mode Output */}
          {mode === 'number' && isValidNumber && (
            <MayanExportPanel filename={`mayan-numeral-number-${parsedNumber}`}>
              {(ref) => (
                <MayanNumeralRenderer digits={base20Digits} exportRef={ref} />
              )}
            </MayanExportPanel>
          )}

          {/* Date Mode Output */}
          {mode === 'date' && dateParts && (
            <MayanExportPanel
              filename={`mayan-numeral-date-${dateParts.day}-${dateParts.month}-${dateParts.year}`}
            >
              {(ref) => (
                <MayanDateRenderer dateParts={dateParts} exportRef={ref} />
              )}
            </MayanExportPanel>
          )}
        </div>
      </div>
    </div>
  );
}
