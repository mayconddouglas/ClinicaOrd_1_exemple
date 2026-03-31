import { getSetting } from './lib/db-tools';

async function run() {
  const token = await getSetting('__TELEGRAM_BOT_TOKEN__');
  
  if (token) {
    const url = `https://api.telegram.org/bot${token}/deleteWebhook`;
    console.log('Deleting webhook temporarily to check messages...');
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('Delete Webhook:', JSON.stringify(data, null, 2));
      
      const updatesUrl = `https://api.telegram.org/bot${token}/getUpdates`;
      const updatesResponse = await fetch(updatesUrl);
      const updatesData = await updatesResponse.json();
      console.log('Updates Info:', JSON.stringify(updatesData, null, 2));
      
      // Re-register
      const registerUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent('https://clinicaorthoai.vercel.app/api/telegram/webhook')}`;
      const regResponse = await fetch(registerUrl);
      console.log('Re-register Webhook:', JSON.stringify(await regResponse.json(), null, 2));
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }
}

run();
