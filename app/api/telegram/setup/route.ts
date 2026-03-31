import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/db-tools';

export async function GET() {
  const dbToken = await getSetting('__TELEGRAM_BOT_TOKEN__');
  const token = process.env.TELEGRAM_BOT_TOKEN || dbToken?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seu-dominio.com';

  if (!token || !appUrl) {
    return NextResponse.json({ error: 'Missing env variables (TELEGRAM_BOT_TOKEN or NEXT_PUBLIC_APP_URL)' }, { status: 500 })
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`

  const response = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    }
  )

  const data = await response.json()

  return NextResponse.json({
    message: 'Webhook setup attempted',
    webhookUrl,
    telegramResponse: data,
  })
}
