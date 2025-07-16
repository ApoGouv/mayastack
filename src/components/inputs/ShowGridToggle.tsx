import React from "react";

interface ShowGridToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const ShowGridToggle: React.FC<ShowGridToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Show Grid:
      </span>
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
  );
};

export default ShowGridToggle;