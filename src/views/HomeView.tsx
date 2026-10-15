import { useState, useMemo } from 'react';
import { toBase20 } from '@utils/base20';
import MayanRenderer from '@components/MayanRenderer';
import MayanExportPanel from '@components/MayanExportPanel';
import Base20Display from '@components/Base20Display';
import RenderModeSelector from '@/components/inputs/RenderModeSelector';
import type { RenderMode } from '@/components/inputs/RenderModeSelector';
import DisplaySettings from '@components/DisplaySettings';
import NumberInput from '@components/inputs/NumberInput';
import DateInput from '@components/inputs/DateInput';
import type { DateParts } from '@components/inputs/DateInput';

type DigitGroup = { label: string; digits: number[] };

type MayanRenderData = {
  filename: string;
  digitGroups: DigitGroup[];
};

/**
 * HomeView is the main input view of the app.
 *  Users can convert either a number or a date to Mayan numeral glyphs.
 */
export default function HomeView() {
  const [mode, setMode] = useState<RenderMode>('number');
  const [numberInput, setNumberInput] = useState('');
  const [dateInputRaw, setDateInputRaw] = useState('');
  const [dateParts, setDateParts] = useState<DateParts | null>(null);

  // Derived values: parse the digits exactly as a bigint
  // (parseInt would lose precision beyond Number.MAX_SAFE_INTEGER)
  const parsedNumber: bigint | null = /^\d+$/.test(numberInput)
    ? BigInt(numberInput)
    : null;
  const isValidNumber: boolean = parsedNumber !== null;

  // Validation flags
  const hasValidNumberInput: boolean = mode === 'number' && isValidNumber;
  const hasValidDateInput: boolean = mode === 'date' && dateParts !== null;
  const hasValidinput: boolean = hasValidNumberInput || hasValidDateInput;

  const mayanData: MayanRenderData | null = useMemo(() => {
    if (mode === 'number' && parsedNumber !== null) {
      return {
        filename: `mayan-numeral-number-${parsedNumber}`,
        digitGroups: [
          { label: 'Number', digits: toBase20(parsedNumber) }
        ]
      };
    }

    if (mode === 'date' && dateParts) {
      return {
        filename: `mayan-numeral-date-${dateParts.day}-${dateParts.month}-${dateParts.year}`,
        digitGroups: [
          { label: 'Day', digits: toBase20(dateParts.day) },
          { label: 'Month', digits: toBase20(dateParts.month) },
          { label: 'Year', digits: toBase20(dateParts.year) }
        ]
      };
    }

    return null;
  }, [mode, parsedNumber, dateParts]);

  // Event handlers
  const handleNumberInputChange = (value: string): void => {
    setNumberInput(value);
  };

  const handleDateInputChange = (parsed: DateParts, raw: string): void => {
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

      {/* Input & Base-20 Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-4">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Left: Render Mode + Input */}
          <div className="space-y-4">
            <RenderModeSelector mode={mode} onChange={setMode} />

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
                {mayanData?.digitGroups.map((group) => {
                  let extraClass = '';

                  if (mode === 'date') {
                    if (group.label === 'Year') extraClass = 'sm:col-span-2';
                    else extraClass = 'sm:col-span-1';
                  } else if (mode === 'number') {
                    extraClass = 'sm:col-span-2';
                  }

                  return (
                    <Base20Display
                      key={group.label}
                      label={group.label}
                      digits={group.digits}
                      className={extraClass}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {hasValidinput && mayanData && (
        <div className="grid gap-6 md:grid-cols-[30%_1fr]">
          {/* Left: Display Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            {/* Color pickers and grid toggle */}
            <DisplaySettings />
          </div>

          {/* Right: Results Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Mayan Numeral</h3>
            {/* MayanRenderer and ExportPanel */}
            <MayanExportPanel filename={mayanData?.filename ?? ''}>
              {(ref) => 
                <MayanRenderer
                  digitGroups={mayanData?.digitGroups.map(g => g.digits) ?? []}
                  heightPerGlyphStack={80}
                  widthPerGroup={mode === 'number' ? 350 : 100}
                  spacing={25}
                  scale={1}
                  exportRef={ref}
                />
              }
            </MayanExportPanel>
          </div>
        </div>
      )}
      
    </div>
  );
}
