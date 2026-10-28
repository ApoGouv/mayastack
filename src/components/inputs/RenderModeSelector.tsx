import React from 'react';
import { Input } from '@components/icons/Input';

export type RenderMode = 'number' | 'date';

interface RenderModeSelectorProps {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
  label?: string;
  name?: string; // for radio group name attribute, defaulted below
  layout?: 'horizontal' | 'vertical'; // optional layout control
}

// Date stays without a description: it converts the day, month and year separately and is
// not a Long Count date (docs/plans/ui-redesign-roadmap.md, G §2)
const MODES: { value: RenderMode; label: string }[] = [
  { value: 'number', label: 'Number (Decimal)' },
  { value: 'date', label: 'Date' },
];

/**
 * Native radio buttons in a fieldset, shown as a compact segmented control (design-reference
 * concept 3): the legend, with its icon, on the left and the modes on the right. Each radio
 * stays visible as the dot in its segment, filled when selected; the selected segment is
 * also gold and bold, and the segment shows the focus ring of its radio.
 */
const RenderModeSelector: React.FC<RenderModeSelectorProps> = ({
  mode,
  onChange,
  label = 'Input Type',
  name = 'renderMode',
  layout = 'horizontal',
 }) => {

  const segmentsClass =
    layout === 'horizontal'
      ? 'inline-flex items-center'
      : 'inline-flex flex-col items-stretch';

  return (
    // The legend is floated, so it is laid out as a flex item beside the segments, while
    // still naming the group
    <fieldset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <legend className="float-left flex items-center gap-2 text-sm font-semibold text-fg">
        <Input className="w-4.5 h-4.5 text-accent-fg" aria-hidden="true" />
        {label}
      </legend>
      <div className={`${segmentsClass} ml-auto gap-0.5 rounded-md bg-well p-0.5`}>
        {MODES.map(({ value, label: modeLabel }) => (
          <label
            key={value}
            htmlFor={`${name}-${value}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-transparent text-sm cursor-pointer text-fg-muted hover:bg-surface-hover hover:text-fg has-checked:border-accent-fg has-checked:bg-accent has-checked:font-semibold has-checked:text-on-accent has-checked:hover:bg-accent-hover has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
          >
            <input
              id={`${name}-${value}`}
              type="radio"
              name={name}
              value={value}
              checked={mode === value}
              onChange={() => onChange(value)}
              // In forced-colours mode the browser would paint the fill as the background, leaving
              // every dot empty: there the dot keeps its own system colours, filled when checked
              className="appearance-none w-2.5 h-2.5 shrink-0 rounded-full border border-current checked:bg-current cursor-pointer focus:outline-none forced-colors:forced-color-adjust-none forced-colors:border-[CanvasText] forced-colors:checked:bg-[CanvasText]"
            />
            {modeLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default RenderModeSelector;
