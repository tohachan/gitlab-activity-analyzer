import { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from 'react-router';

import { ThemeProvider } from '@/context/theme-provider';
import { Layout as AppLayout } from '@/lib/layout';
import type { Route } from './+types/root';

// fonts
import '@fontsource-variable/plus-jakarta-sans';
import '@/lib/styles/globals.css';

// Simple script to remove attributes that cause hydration mismatches
const cleanupScript = `
  (function() {
    function handleDOMAttributes() {
      if (document.documentElement) {
        document.documentElement.removeAttribute('class');
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('style');
      }
      
      if (document.body && document.body.hasAttribute('cz-shortcut-listen')) {
        document.body.removeAttribute('cz-shortcut-listen');
      }
    }

    handleDOMAttributes();
    document.addEventListener('DOMContentLoaded', handleDOMAttributes);
  })();
`;

// Simple hook to prevent cz-shortcut-listen from appearing
function useBodyCleanup() {
  useEffect(() => {
    if (document.body.hasAttribute('cz-shortcut-listen')) {
      document.body.removeAttribute('cz-shortcut-listen');
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'cz-shortcut-listen'
        ) {
          document.body.removeAttribute('cz-shortcut-listen');
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);
}

export function Layout({ children }: { children: React.ReactNode }) {
  useBodyCleanup();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>vite-react-tailwind-starter</title>
        <script dangerouslySetInnerHTML={{ __html: cleanupScript }} />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <HelmetProvider>
          <ThemeProvider>
            <AppLayout>{children}</AppLayout>
          </ThemeProvider>
        </HelmetProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// biome-ignore lint/style/noDefaultExport: <explanation>
export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
