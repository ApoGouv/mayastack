import { useState, useMemo } from 'react';
import { toBase20 } from '@utils/base20';
import { validateNumberInput } from '@utils/numberInput';
import { getNumberExportFilename } from '@utils/exportUtils';
import MayanRenderer from '@components/MayanRenderer';
import MayanExportPanel from '@components/MayanExportPanel';
import Base20Display from '@components/Base20Display';
import RenderModeSelector from '@/components/inputs/RenderModeSelector';
import type { RenderMode } from '@/components/inputs/RenderModeSelector';
import DisplaySettings from '@components/DisplaySettings';
import NumberInput from '@components/inputs/NumberInput';
import NumeralViewport from '@components/NumeralViewport';
import DateInput from '@components/inputs/DateInput';
import type { DateParts } from '@components/inputs/DateInput';

type DigitGroup = { label: string; digits: number[] };

type MayanRenderData = {
  /** Identifies the numeral exactly: a new one starts at the top of the viewer */
  key: string;
  /** Export filename, without extension: abbreviated for long numbers, so not unique */
  filename: string;
  digitGroups: DigitGroup[];
  /** Accessible description of the rendered numeral */
  label: string;
};

/** Longer numbers are described by their length rather than read out in full */
const MAX_DIGITS_IN_LABEL = 30;

/**
 * HomeView is the main input view of the app.
 *  Users can convert either a number or a date to Mayan numeral glyphs.
 */
export default function HomeView() {
  const [mode, setMode] = useState<RenderMode>('number');
  const [numberInput, setNumberInput] = useState('');
  const [dateInputRaw, setDateInputRaw] = useState('');
  const [dateParts, setDateParts] = useState<DateParts | null>(null);

  // Derived values: the exact bigint value, or null while the input is empty or invalid
  // (NumberInput shows the validation message from the same validateNumberInput)
  const numberValidation = validateNumberInput(numberInput);
  const parsedNumber: bigint | null =
    numberValidation.status === 'valid' ? numberValidation.value : null;
  const isValidNumber: boolean = parsedNumber !== null;

  // Validation flags
  const hasValidNumberInput: boolean = mode === 'number' && isValidNumber;
  const hasValidDateInput: boolean = mode === 'date' && dateParts !== null;
  const hasValidinput: boolean = hasValidNumberInput || hasValidDateInput;

  const mayanData: MayanRenderData | null = useMemo(() => {
    if (mode === 'number' && parsedNumber !== null) {
      const digits = toBase20(parsedNumber);
      const decimal = parsedNumber.toString();
      const number = decimal.length <= MAX_DIGITS_IN_LABEL ? decimal : `a ${decimal.length}-digit number`;
      return {
        key: `number-${decimal}`,
        filename: getNumberExportFilename(decimal),
        digitGroups: [
          { label: 'Number', digits }
        ],
        label: `Mayan numeral for ${number}: ${digits.length} stacked base-20 ${digits.length === 1 ? 'digit' : 'digits'}, highest place value at the top`
      };
    }

    if (mode === 'date' && dateParts) {
      return {
        key: `date-${dateParts.day}-${dateParts.month}-${dateParts.year}`,
        filename: `mayan-numeral-date-${dateParts.day}-${dateParts.month}-${dateParts.year}`,
        digitGroups: [
          { label: 'Day', digits: toBase20(dateParts.day) },
          { label: 'Month', digits: toBase20(dateParts.month) },
          { label: 'Year', digits: toBase20(dateParts.year) }
        ],
        label: `Mayan numerals for day ${dateParts.day}, month ${dateParts.month} and year ${dateParts.year}`
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
                <NumeralViewport label={mayanData.label} resetKey={mayanData.key}>
                  <MayanRenderer
                    digitGroups={mayanData?.digitGroups.map(g => g.digits) ?? []}
                    heightPerGlyphStack={80}
                    widthPerGroup={mode === 'number' ? 350 : 100}
                    spacing={25}
                    scale={1}
                    exportRef={ref}
                  />
                </NumeralViewport>
              }
            </MayanExportPanel>
          </div>
        </div>
      )}
      
    </div>
  );
}
