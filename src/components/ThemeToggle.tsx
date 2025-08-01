import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme(); // theme = 'light' | 'dark' | 'system'
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const matchDark = window.matchMedia('(prefers-color-scheme: dark)');

    const updateDarkMode = () => {
      const isDark = theme === 'dark' || (theme === 'system' && matchDark.matches);
      setIsDarkMode(isDark);
    };

    updateDarkMode(); // Initial run

    matchDark.addEventListener('change', updateDarkMode);
    return () => matchDark.removeEventListener('change', updateDarkMode);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // theme === 'system'
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'light' : 'dark'); // toggle opposite of system preference
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-in-out size-8rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeToggle;