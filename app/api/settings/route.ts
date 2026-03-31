import { NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db-tools';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  const value = await getSetting(key);
  return NextResponse.json({ value });
}

export async function POST(req: Request) {
  try {
    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    const success = await setSetting(key, value);
    if (!success) {
      return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
