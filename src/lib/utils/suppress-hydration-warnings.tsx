// This is a last-resort solution to suppress hydration warnings
// by monkey-patching React's console error reporting
export function suppressHydrationWarnings() {
  // Only run this on the client
  if (typeof window === 'undefined') return;

  // Store the original console.error
  const originalConsoleError = console.error;

  // Override console.error to filter out hydration warnings
  console.error = (...args: any[]) => {
    if (
      args[0]?.includes &&
      (args[0].includes('Hydration failed because') ||
        args[0].includes('Warning: Text content did not match') ||
        args[0].includes('Warning: Expected server HTML to contain') ||
        args[0].includes('A tree hydrated but some attributes'))
    ) {
      console.log(
        'Suppressed hydration warning:',
        args[0].substring(0, 150) + '...',
      );
      return;
    }
    originalConsoleError.apply(console, args);
  };

  return () => {
    // Restore the original console.error when needed
    console.error = originalConsoleError;
  };
}
