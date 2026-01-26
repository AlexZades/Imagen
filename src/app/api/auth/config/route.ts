import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    accessKeysEnabled: process.env.ENABLE_ACCESS_KEYS === 'true',
  });
}
