import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/db-tools';

export async function GET() {
  const dbToken = await getSetting('__TELEGRAM_BOT_TOKEN__');
  const token = process.env.TELEGRAM_BOT_TOKEN || dbToken?.trim();

  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 })
  }

  const [webhookInfo, botInfo] = await Promise.all([
    fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then(r => r.json()),
    fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()),
  ])

  return NextResponse.json({ webhookInfo, botInfo })
}
