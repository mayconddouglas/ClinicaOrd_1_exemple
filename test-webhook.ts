async function main() {
  const payload = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser',
        language_code: 'en'
      },
      chat: {
        id: 123456789,
        first_name: 'Test',
        username: 'testuser',
        type: 'private'
      },
      date: 1610000000,
      text: 'Olá, gostaria de agendar uma consulta.'
    }
  };

  const response = await fetch('http://localhost:3000/api/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.text();
  console.log('Webhook Response:', data);

  const logsResponse = await fetch('http://localhost:3000/api/debug-logs');
  const logsData = await logsResponse.text();
  console.log('Logs:', logsData);
}

main();