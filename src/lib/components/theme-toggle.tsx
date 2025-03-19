import { Classic } from '@theme-toggles/react';
import '@theme-toggles/react/css/Classic.css';
import { useEffect, useState } from 'react';

// Static placeholder that exactly matches what the server renders
function StaticPlaceholder() {
  return (
    <div className="text-3xl" style={{ width: '1em', height: '1em' }}></div>
  );
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    setMounted(true);
    // Get saved theme on client-side only
    const savedTheme =
      localStorage.getItem('theme-preference') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    setTheme(savedTheme);

    // Apply theme
    applyTheme(savedTheme);
  }, []);

  // Apply theme function
  const applyTheme = (newTheme: string) => {
    // Set data-theme attribute
    document.documentElement.setAttribute('data-theme', newTheme);

    // Save preference
    localStorage.setItem('theme-preference', newTheme);
  };

  // Toggle function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Placeholder during SSR and initial client render
  if (!mounted) {
    return <StaticPlaceholder />;
  }

  return (
    <Classic
      toggle={() => toggleTheme()}
      toggled={theme === 'light'}
      placeholder=""
      className="text-3xl"
      onPointerEnterCapture={undefined}
      onPointerLeaveCapture={undefined}
    />
  );
}
