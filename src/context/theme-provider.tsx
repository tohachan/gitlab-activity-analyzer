import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type React from 'react';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use a state to determine if we're on client or server
  const [mounted, setMounted] = useState(false);

  // Only trigger once on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, render without next-themes to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  // Only use next-themes on the client side after hydration
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      enableColorScheme={false}
      storageKey="theme-preference"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
