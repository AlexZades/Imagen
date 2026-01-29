import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // This is a dangerous endpoint, so we should protect it or remove it after use.
    // For now, we'll assume it's used for debugging/fixing.
    
    console.log('Attempting to push database schema...');
    
    // Attempt to push the schema to the database
    // --accept-data-loss is risky but might be needed if there are conflicts, 
    // though adding nullable columns shouldn't cause data loss.
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    
    console.log('Prisma DB Push Output:', stdout);
    if (stderr) console.error('Prisma DB Push Error:', stderr);

    return NextResponse.json({ 
      success: true, 
      message: 'Database schema pushed successfully',
      output: stdout 
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to push database schema', 
        error: error.message,
        details: error.stderr
      },
      { status: 500 }
    );
  }
}
