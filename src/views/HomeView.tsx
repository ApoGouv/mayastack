import { useState, useMemo } from 'react';
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
import type { MayanExportPanelProps } from '@/types/exportTypes';

/**
 * HomeView is the main input view of the app.
 *  Users can convert either a number or a date to Mayan numeral glyphs.
 */
export default function HomeView() {
  const [mode, setMode] = useState<RenderMode>('number');
  const [numberInput, setNumberInput] = useState('');
  const [dateInputRaw, setDateInputRaw] = useState('');
  const [dateParts, setDateParts] = useState<DateParts | null>(null);

  // Derived values
  const parsedNumber: number = parseInt(numberInput, 10);
  const isValidNumber: boolean = !isNaN(parsedNumber) && parsedNumber >= 0;
  const base20Digits: number[] = useMemo(() => {
    // Store the parsed digits once
    return isValidNumber ? toBase20(parsedNumber) : []
  }, [isValidNumber, parsedNumber]);

  // Validation flags
  const hasValidNumberInput: boolean = mode === 'number' && isValidNumber;
  const hasValidDateInput: boolean = mode === 'date' && dateParts !== null;
  const hasValidinput: boolean = hasValidNumberInput || hasValidDateInput;

  // Event handlers
  const handleNumberInputChange = (value: string): void => {
    setNumberInput(value);
  };

  const handleDateInputChange = (parsed: DateParts, raw: string): void => {
    setDateParts(parsed);
    setDateInputRaw(raw);
  };

  const exportConfig = useMemo<MayanExportPanelProps | null>(() => {
    if (!hasValidinput) return null;

    {/* Number Mode Output */}
    if (hasValidNumberInput) {
      return {
        filename: `mayan-numeral-number-${parsedNumber}`,
        children: (ref) => (
          <MayanNumeralRenderer digits={base20Digits} exportRef={ref} />
        ),
      };
    }

    {/* Date Mode Output */}
    if (hasValidDateInput && dateParts) {
      return {
        filename: `mayan-numeral-date-${dateParts.day}-${dateParts.month}-${dateParts.year}`,
        children: (ref) => (
          <MayanDateRenderer dateParts={dateParts} exportRef={ref} />
        ),
      };
    }

    return null;
  }, [hasValidinput, hasValidNumberInput, hasValidDateInput, dateParts, base20Digits, parsedNumber]);

  return (
    <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <header className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-ms-brand-500">
          🌄 Convert to Mayan Numerals
        </h1>
      </header>

      {/* Input & Base-20 Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-4">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Left: Render Mode + Input */}
          <div className="space-y-4">
            <RenderModeSwitcher mode={mode} onChange={setMode} />

            {mode === 'number' ? (
              <NumberInput
                value={numberInput}
                onChange={handleNumberInputChange}
              />
            ) : (
              <DateInput
                value={dateInputRaw}
                onChange={handleDateInputChange}
              />
            )}
          </div>

          {/* Right: Base-20 Display */}
          {hasValidinput && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Base-20 Representation
              </h3>

              {hasValidNumberInput && (
                <Base20Display label="Number" digits={base20Digits} />
              )}

              {hasValidDateInput && dateParts && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Base20Display label="Day" digits={toBase20(dateParts.day)} />
                  <Base20Display
                    label="Month"
                    digits={toBase20(dateParts.month)}
                  />
                  <Base20Display
                    label="Year"
                    digits={toBase20(dateParts.year)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {hasValidinput && exportConfig && (
        <div className="grid gap-6 md:grid-cols-[30%_1fr]">
          {/* Left: Display Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Display Options</h3>
            {/* Color pickers and grid toggle */}
            <DisplaySettings />
          </div>

          {/* Right: Results Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Mayan Numeral</h3>
            {/* MayanRenderer and ExportPanel */}
            <MayanExportPanel filename={exportConfig.filename}>
              {(ref) => exportConfig.children(ref)}
            </MayanExportPanel>
          </div>
        </div>
      )}
      
    </div>
  );
}
