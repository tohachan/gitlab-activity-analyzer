const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Setup API routes
// API route to get list of data files
app.get('/api/data-files', (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'src', 'data');
    
    if (!fs.existsSync(dataDir)) {
      return res.status(404).json({ error: 'Data directory not found' });
    }
    
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(dataDir, a));
        const statB = fs.statSync(path.join(dataDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
    
    return res.json(files);
  } catch (error) {
    console.error('Error reading data directory:', error);
    return res.status(500).json({ 
      error: 'Failed to read data files', 
      details: error.message 
    });
  }
});

// API route to get specific data file
app.get('/api/data/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check - prevent path traversal attacks
    if (filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(__dirname, 'src', 'data', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    return res.json(jsonData);
  } catch (error) {
    console.error('Error reading data file:', error);
    return res.status(500).json({ 
      error: 'Failed to read data file', 
      details: error.message 
    });
  }
});

if (isDev) {
  // In development mode, start Vite and use it as a proxy
  console.log('Starting in development mode...');
  
  // Start Vite development server as a child process
  const vite = spawn('npx', ['vite'], { 
    stdio: 'inherit',
    shell: true
  });
  
  // Forward requests to Vite server
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      // Handle API requests with our Express routes
      return next();
    } else {
      // Forward all other requests to Vite's dev server (default: localhost:5173)
      res.redirect(`http://localhost:5173${req.url}`);
    }
  });
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    vite.kill();
    process.exit();
  });
} else {
  // In production mode, serve the built files from 'dist'
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    // Serve static files from the 'dist' directory
    app.use(express.static(distPath));
    
    // For all other GET requests, serve the React app
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api')) {
        return next(); // Let API routes handle these
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.error('Error: Build directory (dist) not found. Run "npm run build" first.');
  }
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log(`  - GET http://localhost:${PORT}/api/data-files`);
  console.log(`  - GET http://localhost:${PORT}/api/data/:filename`);
  
  if (isDev) {
    console.log('\nDevelopment UI available at http://localhost:5173');
  }
});
