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

  // What the viewer and the base-20 card say while there is no result to show
  const emptyMessages: { viewer: string; base20: string } =
    mode === 'date'
      ? { viewer: 'Choose a date to see its Mayan numerals.', base20: 'Choose a date to see it in base 20.' }
      : numberValidation.status === 'invalid'
        ? { viewer: 'Correct the number to see its Mayan numeral.', base20: 'Correct the number to see it in base 20.' }
        : { viewer: 'Enter a whole number to see its Mayan numeral.', base20: 'Enter a whole number to see it in base 20.' };

  // Event handlers
  const handleNumberInputChange = (value: string): void => {
    setNumberInput(value);
  };

  const handleDateInputChange = (parsed: DateParts, raw: string): void => {
    setDateParts(parsed);
    setDateInputRaw(raw);
  };

  return (
    <div className="grid grid-cols-1 gap-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <header className="space-y-4">
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-fg">
          🌄 Convert to Mayan Numerals
        </h1>
      </header>

      {/* Workspace: from lg, the input, the base-20 representation and the display settings on the
          left (5 of 12 columns) and the numeral viewer on the right (7 of 12), spanning all three
          rows. Below lg, one column in source order: input, viewer, base-20, settings. The last row
          takes the viewer's extra height (1fr), so the left cards stay directly under each other.
          Every card stays in place without a valid input; only their results need one. */}
      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-12 lg:grid-rows-[auto_auto_1fr]">
        {/* Input Section: Render Mode + Input */}
        <section className="bg-surface rounded-lg p-6 shadow-sm dark:shadow-none space-y-4 lg:col-span-5">
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
        </section>

        {/* Right: Results Section. Only the numeral, its viewer controls and Export need a result */}
        <div className="bg-surface rounded-lg p-6 shadow-sm dark:shadow-none lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-3">
          <h2 className="font-heading text-lg font-semibold mb-4">Mayan Numeral</h2>
          {hasValidinput && mayanData ? (
            /* MayanRenderer and ExportPanel */
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
          ) : (
            <p className="rounded-lg border border-dashed border-line p-8 text-center text-fg-muted">
              {emptyMessages.viewer}
            </p>
          )}
        </div>

        {/* Left, under the input (below lg, under the viewer): Base-20 Display */}
        <div className="bg-surface rounded-lg p-6 shadow-sm dark:shadow-none lg:col-span-5 lg:col-start-1 lg:row-start-2">
          <h2 className="font-heading text-lg font-semibold mb-2">
            Base-20 Representation
          </h2>

          {hasValidinput && mayanData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
              {mayanData.digitGroups.map((group) => {
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
          ) : (
            <p className="rounded-lg border border-dashed border-line p-4 text-center text-fg-muted">
              {emptyMessages.base20}
            </p>
          )}
        </div>

        {/* Left, under the base-20 card: Display Settings. Below sm it is the last card, with the floating
            Export trigger in the corner of the screen (bottom-4, 40px tall): the margin lets it and
            its colour popovers, which reach below it, scroll clear of the trigger */}
        <div className="bg-surface rounded-lg p-6 shadow-sm dark:shadow-none mb-20 sm:mb-0 lg:col-span-5 lg:col-start-1 lg:row-start-3">
          {/* Color pickers and grid toggle */}
          <DisplaySettings />
        </div>
      </div>
    </div>
  );
}
