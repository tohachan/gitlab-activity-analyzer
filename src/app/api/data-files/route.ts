import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic'; // Don't cache this route

export async function GET(request: NextRequest) {
  try {
    // Get the data directory path
    const dataDir = path.join(process.cwd(), 'src', 'data');
    
    // Check if directory exists
    if (!fs.existsSync(dataDir)) {
      console.error('Data directory not found:', dataDir);
      return NextResponse.json({ error: 'Data directory not found' }, { status: 404 });
    }
    
    // Read directory contents
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))  // Only include JSON files
      .sort((a, b) => {
        // Sort by modification date (newest first)
        const statA = fs.statSync(path.join(dataDir, a));
        const statB = fs.statSync(path.join(dataDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
    
    // Ensure we're returning JSON with correct headers
    return new NextResponse(JSON.stringify(files), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error reading data directory:', error);
    return NextResponse.json(
      { error: 'Failed to read data files', details: error.message },
      { status: 500 }
    );
  }
}
