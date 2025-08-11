import React, { useId } from 'react';

interface ToggleSwitchProps {
  id?: string;
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  value,
  label,
  onChange,
  disabled = false,
}) => {

  const generatedId = useId();
  const switchId = id ?? `toggle-switch-${generatedId}`;

  return (
    <div
      className="relative inline-flex items-center justify-start gap-[0.7rem] my-[0.625rem] select-none w-full max-w-md"
    >
      <div className="flex items-center justify-between gap-4 w-full">
        {label && (
          <label 
            htmlFor={switchId} 
            className={`text-sm text-gray-700 dark:text-gray-300 select-none ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {label}
          </label>
        )}
        
        <button
          id={switchId}
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ms-moss-500 ${
            value ? 'bg-ms-moss-500' : 'bg-gray-300 dark:bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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

export default ToggleSwitch;
