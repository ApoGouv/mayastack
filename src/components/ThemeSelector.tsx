// src/components/ThemeSelector.tsx
import React, { useState } from 'react';
import { useColorContext } from '@/context/ColorContext';
import LightTheme from '@/components/icons/LightTheme';
import DarkTheme from '@/components/icons/DarkTheme';
import SystemTheme from '@/components/icons/SystemTheme';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useColorContext();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'light', name: 'Light', icon: <LightTheme className="w-5 h-5" /> },
    { id: 'dark', name: 'Dark', icon: <DarkTheme className="w-5 h-5" /> },
    { id: 'system', name: 'System', icon: <SystemTheme className="w-5 h-5" /> },
  ];

  // Get the icon for the currently selected theme (including system)
  const currentIcon = themes.find(t => t.id === theme)?.icon || <SystemTheme className="w-5 h-5" />;

  return (
    <div className="relative" data-current-theme={theme}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ms-brand-500 dark:focus:ring-offset-gray-800"
        aria-label={`Theme selector (current: ${theme})`}
        data-theme={theme}
      >
        {currentIcon}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
          {themes.map((themeOption) => (
            <button
              key={themeOption.id}
              onClick={() => {
                setTheme(themeOption.id as 'light' | 'dark' | 'system');
                setIsOpen(false);
              }}
              className={`flex items-center space-x-3 w-full px-4 py-2 text-sm text-left ${
                theme === themeOption.id
                  ? 'bg-ms-brand-100 dark:bg-ms-brand-900 text-ms-brand-700 dark:text-ms-brand-200'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              data-theme-option={themeOption.id}
            >
              {themeOption.icon}
              <span>{themeOption.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
