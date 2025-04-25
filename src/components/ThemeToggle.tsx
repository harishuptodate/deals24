
import React, { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  // Sync the button state with the actual applied theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const root = window.document.documentElement;
    const isDark = root.classList.contains('dark');
    
    // If using system theme, update the button to reflect the actual appearance
    if (theme === 'system') {
      // No need to change the icon as it will be handled by the main return based on theme value
    }
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
      aria-label="Toggle theme"
    >
      {theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeToggle;