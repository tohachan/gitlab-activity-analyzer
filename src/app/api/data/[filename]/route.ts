import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic'; // Don't cache this route

export async function GET(
  request: NextRequest, 
  { params }: { params: { filename: string } }
) {
  try {
    const filename = decodeURIComponent(params.filename);
    
    // Security check - prevent path traversal attacks
    if (filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    console.log('Attempting to read file:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Read file contents
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Parse JSON content
      const jsonData = JSON.parse(fileContent);
      
      // Return with explicit headers
      return new NextResponse(JSON.stringify(jsonData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON file', details: parseError.message }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error reading data file:', error);
    return NextResponse.json(
      { error: 'Failed to read data file', details: error.message }, 
      { status: 500 }
    );
  }
}
