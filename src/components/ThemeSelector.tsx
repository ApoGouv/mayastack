// src/components/ThemeSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDisplaySettings } from '@/hooks/useDisplaySettings';
import { useDismissOnOutsideOrEsc } from "@hooks/useDismissOnOutsideOrEsc";
import LightTheme from '@components/icons/LightTheme';
import DarkTheme from '@components/icons/DarkTheme';
import SystemTheme from '@components/icons/SystemTheme';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useDisplaySettings();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes = [
    { id: 'light', name: 'Light', icon: <LightTheme className="w-5 h-5" /> },
    { id: 'dark', name: 'Dark', icon: <DarkTheme className="w-5 h-5" /> },
    { id: 'system', name: 'System', icon: <SystemTheme className="w-5 h-5" /> },
  ];

  // Get the icon for the currently selected theme (including system)
  const currentIcon = themes.find((t) => t.id === theme)?.icon || (
    <SystemTheme className="w-5 h-5" />
  );

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      // Delay actual unmount to allow fade-out
      const timeout = setTimeout(() => setShouldRender(false), 300); // match animation duration
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useDismissOnOutsideOrEsc(dropdownRef, () => setIsOpen(false), isOpen, false);

  return (
    <div className="relative" ref={dropdownRef} data-current-theme={theme}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          cursor-pointer
          relative flex items-center space-x-2 p-2 rounded-full 
          ring-2 ring-inset ring-current
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ms-brand-500 dark:focus:ring-offset-gray-800
          transition-all
        `}
        aria-label={`Theme selector (current: ${theme})`}
        data-theme={theme}
      >
        {currentIcon}
      </button>

      {/* Dropdown menu */}
      {/* Override animation duration [animation-duration:_.5s] */}
      {shouldRender && (
        <div
          className={`absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 
          ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}
        `}
        >
          {themes.map((themeOption) => (
            <button
              key={themeOption.id}
              onClick={() => {
                setTheme(themeOption.id as 'light' | 'dark' | 'system');
                setIsOpen(false);
              }}
              className={`flex items-center space-x-3 w-full px-4 py-2 text-sm text-left transition ${
                theme === themeOption.id
                  ? 'bg-ms-brand-100 dark:bg-ms-brand-900 text-ms-brand-700 dark:text-ms-brand-200'
                  : 'cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
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
