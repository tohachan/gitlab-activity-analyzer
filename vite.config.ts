import path from 'path';
/* eslint-disable import/no-extraneous-dependencies */
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import type { VitePWAOptions } from 'vite-plugin-pwa';
import { VitePWA } from 'vite-plugin-pwa';
import tsConfigPaths from 'vite-tsconfig-paths';
import fs from 'fs';

const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  manifest: {
    short_name: 'vite-react-tailwind-starter',
    name: 'Vite React App Template',
    lang: 'en',
    start_url: '/',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    dir: 'ltr',
    display: 'standalone',
    prefer_related_applications: false,
    icons: [
      {
        src: '/assets/favicon.svg',
        purpose: 'any',
        sizes: '48x48 72x72 96x96 128x128 256x256',
      },
    ],
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactRouter(),
    tailwindcss(),
    checker({
      typescript: true,
      biome: true,
    }),
    tsConfigPaths(),
    visualizer({ template: 'sunburst' }) as unknown as PluginOption,
    VitePWA(pwaOptions),
    // Custom plugin to handle API routes
    {
      name: 'api-routes',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Handle API routes
          if (req.url?.startsWith('/api/')) {
            const url = new URL(req.url, 'http://localhost');
            
            try {
              if (url.pathname === '/api/data-files') {
                // Get data files
                const dataDir = path.join(process.cwd(), 'src', 'data');
                if (!fs.existsSync(dataDir)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Data directory not found' }));
                  return;
                }

                const files = fs.readdirSync(dataDir)
                  .filter(file => file.endsWith('.json'))
                  .sort((a, b) => {
                    const statA = fs.statSync(path.join(dataDir, a));
                    const statB = fs.statSync(path.join(dataDir, b));
                    return statB.mtime.getTime() - statA.mtime.getTime();
                  });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(files));
                return;
              } 
              
              if (url.pathname.startsWith('/api/data/')) {
                // Get specific data file
                const filename = decodeURIComponent(url.pathname.substring('/api/data/'.length));
                
                // Security check
                if (filename.includes('/') || filename.includes('\\')) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid filename' }));
                  return;
                }
                
                const filePath = path.join(process.cwd(), 'src', 'data', filename);
                if (!fs.existsSync(filePath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'File not found' }));
                  return;
                }
                
                const fileContent = fs.readFileSync(filePath, 'utf8');
                res.setHeader('Content-Type', 'application/json');
                res.end(fileContent);
                return;
              }
            } catch (error) {
              console.error('API error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                error: 'Internal server error', 
                details: error instanceof Error ? error.message : String(error)
              }));
              return;
            }
          }
          
          next();
        });
      }
    }
  ],
  ssr: {
    noExternal: ['react-helmet-async', '@theme-toggles/react'], // temporary
  },
  server: {
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
