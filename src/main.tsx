import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { suppressHydrationWarnings } from './lib/utils/suppress-hydration-warnings';
import { routes } from './routes';

// Suppress hydration warnings in development
if (import.meta.env.DEV) {
  suppressHydrationWarnings();
}

// Remove the cz-shortcut-listen attribute if it exists
if (document.body && document.body.hasAttribute('cz-shortcut-listen')) {
  console.log('Removing cz-shortcut-listen attribute in main.tsx');
  document.body.removeAttribute('cz-shortcut-listen');
}

const router = createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
