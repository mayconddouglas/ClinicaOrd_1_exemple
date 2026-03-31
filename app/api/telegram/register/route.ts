import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token, url } = await req.json();

    if (!token || !url) {
      return NextResponse.json({ error: 'Token and URL are required' }, { status: 400 });
    }

    // Register webhook with Telegram
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.description || 'Failed to set webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true, description: data.description });
  } catch (error) {
    console.error('Webhook registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
