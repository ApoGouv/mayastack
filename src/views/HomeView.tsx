import { useState, useMemo, useRef } from 'react';
import { toBase20 } from '@utils/base20';
import { validateNumberInput } from '@utils/numberInput';
import { getNumberExportFilename } from '@utils/exportUtils';
import MayanRenderer from '@components/MayanRenderer';
import MayanExportPanel from '@components/MayanExportPanel';
import Base20Display from '@components/Base20Display';
import Base20Expansion, { TierBadge } from '@components/Base20Expansion';
import { Functions } from '@components/icons/Functions';
import { Layers } from '@components/icons/Layers';
import RenderModeSelector from '@/components/inputs/RenderModeSelector';
import type { RenderMode } from '@/components/inputs/RenderModeSelector';
import DisplaySettings from '@components/DisplaySettings';
import NumberInput from '@components/inputs/NumberInput';
import NumeralViewport from '@components/NumeralViewport';
import DateInput from '@components/inputs/DateInput';
import type { DateParts } from '@components/inputs/DateInput';
import { PlaceTierGuides, TierHairlines } from '@components/TierGuides';
import TierAnnotations from '@components/TierAnnotations';
import TierOrientation from '@components/TierOrientation';
import GlyphKey from '@components/GlyphKey';
import { useDisplaySettings } from '@/hooks/useDisplaySettings';
import { getNumeralSize, getTierCount, type NumeralLayout } from '@utils/tierGuides';
import { getTierAnnotationRows } from '@utils/tierAnnotations';
import { getAnnotationLabelColors, getGuideColors, VIEWER_BACKDROP } from '@utils/guideColors';
import { rgbaToCss } from '@utils/colors';

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

/** The numeral's layout in each mode, shared by the renderer and the tier guides over it */
const NUMERAL_LAYOUTS: Record<RenderMode, NumeralLayout> = {
  number: { heightPerGlyphStack: 80, widthPerGroup: 350, spacing: 25 },
  date: { heightPerGlyphStack: 80, widthPerGroup: 100, spacing: 25 },
};

/**
 * HomeView is the main input view of the app.
 *  Users can convert either a number or a date to Mayan numeral glyphs.
 */
export default function HomeView() {
  const [mode, setMode] = useState<RenderMode>('number');
  // Number mode starts at 0, with the zero glyph shown; Zero returns to it, Clear empties the field
  const [numberInput, setNumberInput] = useState('0');
  const [dateInputRaw, setDateInputRaw] = useState('');
  const [dateParts, setDateParts] = useState<DateParts | null>(null);
  // Whether the analytical breakdown is open: the user's latest choice, kept here so that it
  // survives Clear, invalid input and a switch to Date mode, which remove the breakdown itself
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  // The numeral viewer's scroller, which the place tier guides follow while it scrolls
  const viewerScrollerRef = useRef<HTMLDivElement>(null);
  const { showPlaceTierGuides, showTierHairlines, showTierAnnotations, backgroundColor, resolvedTheme } =
    useDisplaySettings();

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

  const numeralLayout = NUMERAL_LAYOUTS[mode];
  // The tier guides' colours follow the numeral's background as the viewer shows it, never the glyphs
  const guideColors = useMemo(
    () => getGuideColors(backgroundColor, VIEWER_BACKDROP[resolvedTheme]),
    [backgroundColor, resolvedTheme]
  );
  // The tier annotation labels' colours, for the gutters' colour (the paper's as shown), legible
  // on it whatever the theme
  const annotationInks = useMemo(() => {
    const { power, digit } = getAnnotationLabelColors(guideColors.background);
    return { power: rgbaToCss({ ...power, a: 1 }), digit: rgbaToCss({ ...digit, a: 1 }) };
  }, [guideColors.background]);
  const digitGroups = useMemo(() => mayanData?.digitGroups.map((g) => g.digits) ?? [], [mayanData]);
  // The numeral's size in SVG units, shown at 1 CSS px per unit at 100% zoom
  const numeralSize = getNumeralSize(digitGroups, numeralLayout);
  // The tier annotation rows, shared by both gutters; not calculated while the annotations are off
  const annotationRows = useMemo(
    () => (showTierAnnotations ? getTierAnnotationRows(digitGroups, numeralLayout) : []),
    [showTierAnnotations, digitGroups, numeralLayout]
  );

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

  // The viewer card's heading, the same with and without a result. Its icon (Layers, stacked
  // tiers) differs from the base-20 card's (Functions, Σ for the positional sum). It never wraps
  // (it fits at 320 px), so the header cluster is never narrower than the whole heading
  const viewerHeading = (
    <h2 className="font-heading text-lg font-semibold flex items-center gap-2 whitespace-nowrap">
      <Layers className="w-5 h-5 shrink-0 text-accent-fg" aria-hidden="true" />
      Mayan Numeral Stack
    </h2>
  );

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
          Every card stays in place without a valid input; only their results need one. Items
          start at the top of their areas (`items-start`), so the viewer card is only as tall as
          its content, and its area leaves it room to stick (UI-13, slice 5e). */}
      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-12 lg:grid-rows-[auto_auto_1fr]">
        {/* Input Section: Render Mode + Input */}
        <section className="bg-surface rounded-lg p-4 shadow-sm dark:shadow-none space-y-4 lg:col-span-5">
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

        {/* Right: Results Section. Only the numeral, its viewer controls and Export need a result.
            On desktop screens tall enough for all of it (the `sticky-viewer` variant, src/index.css),
            it sticks 1rem below the top of the screen while the page scrolls (UI-13, slice 5e):
            within its grid area, which spans all three rows, so it moves only while the left
            column is taller than the card, and stops at the column's end, above the footer. The
            stage keeps its own scrolling */}
        <div
          data-viewer-card
          className="bg-surface rounded-lg p-4 shadow-sm dark:shadow-none lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-3 sticky-viewer:sticky sticky-viewer:top-4"
        >
          {/* The heading leads the viewer's header row, beside its zoom controls; without a result,
              it stands alone */}
          {hasValidinput && mayanData ? (
            /* MayanRenderer and ExportPanel. Where the viewer sticks (the `sticky-viewer` variant),
               Export is in its header, after the zoom controls, so it never covers the stage
               (UI-11); elsewhere it floats in the corner of the screen, as before */
            <MayanExportPanel filename={mayanData?.filename ?? ''} exportPlacement="viewer-header">
              {(ref, headerExport) =>
                <NumeralViewport
                  numeralWidth={numeralSize.width}
                  numeralHeight={numeralSize.height}
                  // The numeral's background, as MayanRenderer fills it: the viewer's paper
                  // paints it on screen, once, around and behind the numeral
                  background={rgbaToCss(backgroundColor)}
                  // The annotation gutters' background (UI-13): the paper's colour as the viewer
                  // shows it, opaque (a translucent background over the theme's canvas), which
                  // the guides' colours already follow, so the gutters and the paper are one sheet
                  annotationBackground={rgbaToCss({ ...guideColors.background, a: 1 })}
                  // The annotation labels' colours on that background, at least 4.5:1
                  annotationInks={annotationInks}
                  label={mayanData.label}
                  resetKey={mayanData.key}
                  scrollerRef={viewerScrollerRef}
                  header={
                    // The heading and the tier-direction indicator (UI-13, slice 5b), outside the
                    // heading so its name is unchanged. The cluster wraps first: its basis is 0, so
                    // the zoom controls go under it only where even the heading leaves no room
                    // beside them, and otherwise it takes the rest of the row, with the indicator
                    // beside the heading or under it. From the tallest group, also in Date mode
                    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      {viewerHeading}
                      <TierOrientation tiers={getTierCount(digitGroups)} />
                    </div>
                  }
                  headerEnd={headerExport}
                  // The glyph key (UI-13, slice 5c), under the stage, outside the numeral and its
                  // export; only with a result, like the stage it explains
                  footer={<GlyphKey />}
                  underlay={
                    showPlaceTierGuides && (
                      <PlaceTierGuides
                        digitGroups={digitGroups}
                        layout={numeralLayout}
                        colors={guideColors}
                        scrollerRef={viewerScrollerRef}
                      />
                    )
                  }
                  // Screen-only tier annotations (UI-10), in gutters beside the paper, outside the
                  // SVG. Powers of 20 at the start; at the end, Number mode's digit of each tier.
                  // Date mode has none: its end slot stays empty, but the gutter is still laid out
                  // (the start slot is given), so the paper stays centred
                  annotationsStart={showTierAnnotations && <TierAnnotations rows={annotationRows} kind="power" />}
                  annotationsEnd={
                    showTierAnnotations && mode === 'number' && <TierAnnotations rows={annotationRows} kind="digit" />
                  }
                  overlay={
                    showTierHairlines && (
                      <TierHairlines digitGroups={digitGroups} layout={numeralLayout} color={guideColors.hairline} />
                    )
                  }
                >
                  <MayanRenderer
                    digitGroups={digitGroups}
                    {...numeralLayout}
                    scale={1}
                    exportRef={ref}
                  />
                </NumeralViewport>
              }
            </MayanExportPanel>
          ) : (
            <>
              {viewerHeading}
              <p className="mt-4 rounded-lg border border-dashed border-line p-8 text-center text-fg-muted">
                {emptyMessages.viewer}
              </p>
            </>
          )}
        </div>

        {/* Left, under the input (below lg, under the viewer): Base-20 Display */}
        {/* The heading and, in Number mode, the tier badge share the first line (the badge wraps
            under the heading where there is no room); the content takes a full line below them */}
        <div className="bg-surface rounded-lg p-4 shadow-sm dark:shadow-none flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:col-span-5 lg:col-start-1 lg:row-start-2">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Functions className="w-5 h-5 shrink-0 text-accent-fg" aria-hidden="true" />
            Base-20 Representation
          </h2>
          {hasValidNumberInput && mayanData && <TierBadge tiers={mayanData.digitGroups[0].digits.length} />}

          {hasValidNumberInput && mayanData ? (
            // Number mode: the formula, Copy Formula and the analytical breakdown, across the card
            <Base20Expansion
              digits={mayanData.digitGroups[0].digits}
              breakdownOpen={breakdownOpen}
              onBreakdownOpenChange={setBreakdownOpen}
            />
          ) : hasValidDateInput && mayanData ? (
            // Date mode: the day, month and year, each in its own expanded form
            <div className="basis-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
                {mayanData.digitGroups.map((group) => (
                  <Base20Display
                    key={group.label}
                    label={group.label}
                    digits={group.digits}
                    className={group.label === 'Year' ? 'sm:col-span-2' : 'sm:col-span-1'}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="basis-full rounded-lg border border-dashed border-line p-4 text-center text-fg-muted">
              {emptyMessages.base20}
            </p>
          )}
        </div>

        {/* Left, under the base-20 card: Display Settings. Below sm it is the last card, with the floating
            Export trigger in the corner of the screen (bottom-4, 40px tall): the margin lets it and
            its colour popovers, which reach below it, scroll clear of the trigger */}
        <div className="bg-surface rounded-lg p-4 shadow-sm dark:shadow-none mb-20 sm:mb-0 lg:col-span-5 lg:col-start-1 lg:row-start-3">
          {/* Color pickers and grid toggle */}
          <DisplaySettings />
        </div>
      </div>
    </div>
  );
}
