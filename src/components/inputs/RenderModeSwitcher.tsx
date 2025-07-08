import React from 'react';

export type RenderMode = 'number' | 'date';

interface RenderModeSwitcherProps {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
}

const RenderModeSwitcher: React.FC<RenderModeSwitcherProps> = ({ mode, onChange }) => {
  return (
    <div role="radiogroup" aria-label="Select render mode">
      <label>
        <input
          type="radio"
          name="renderMode"
          value="number"
          checked={mode === 'number'}
          onChange={() => onChange('number')}
        />
        Number
      </label>
      <label style={{ marginLeft: '1rem' }}>
        <input
          type="radio"
          name="renderMode"
          value="date"
          checked={mode === 'date'}
          onChange={() => onChange('date')}
        />
        Date
      </label>
    </div>
  );
};

export default RenderModeSwitcher;