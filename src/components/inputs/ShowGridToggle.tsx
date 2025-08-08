import React from 'react';

interface ShowGridToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

const ShowGridToggle: React.FC<ShowGridToggleProps> = ({
  value,
  onChange,
  label = 'Show Grid:',
}) => {
  return (
    <div
      className="relative inline-flex items-center justify-start gap-[0.7rem] my-[0.625rem] select-none w-full max-w-md"
    >
      <div className="flex items-center justify-between gap-4 w-full">
        {label && (
          <label className="text-sm text-gray-700 dark:text-gray-300 select-none">
            {label}
          </label>
        )}
        
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value ? "bg-ms-moss-500" : "bg-gray-300 dark:bg-gray-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default ShowGridToggle;
