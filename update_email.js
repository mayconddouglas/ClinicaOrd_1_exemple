const fs = require('fs');

const htmlTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 40px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #2563eb;
      padding: 32px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .icon-wrapper {
      font-size: 40px;
      line-height: 1;
      margin-bottom: 16px;
      display: inline-block;
    }
    .content {
      padding: 40px;
      color: #374151;
      line-height: 1.6;
      font-size: 16px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .details-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      margin: 32px 0;
    }
    .detail-row {
      margin-bottom: 16px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      color: #64748b;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-bottom: 4px;
      display: block;
    }
    .detail-value {
      color: #0f172a;
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 16px 0;
    }
    .instructions {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 16px 24px;
      margin: 32px 0;
      border-radius: 0 8px 8px 0;
      color: #1e3a8a;
      font-size: 15px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.5;
    }
    .clinic-name {
      font-weight: 600;
      color: #334155;
      font-size: 16px;
      margin-bottom: 8px !important;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 10px; }
      .content { padding: 30px 20px; }
      .header { padding: 24px 20px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <div class="icon-wrapper">✨</div>
        <h1>Confirmação de Agendamento</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Olá, \${paciente.nome}! 👋</p>
        
        <p>É com grande alegria que confirmamos o seu agendamento na <strong>\${clinicName}</strong>. Abaixo estão os detalhes da sua consulta:</p>
        
        <div class="details-card">
          <div class="detail-row">
            <span class="detail-label">Data e Hora</span>
            <p class="detail-value">📅 \${dataHoraBR}</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="detail-row">
            <span class="detail-label">Especialidade / Motivo</span>
            <p class="detail-value">🩺 \${data.especialidade || data.motivo || 'Consulta Geral'}</p>
          </div>
        </div>

        <div class="instructions">
          <strong>💡 Dica importante:</strong><br>
          Por favor, tente chegar com <strong>10 minutos de antecedência</strong> para realizarmos a sua recepção com toda a tranquilidade.
        </div>

        <p>Caso precise remarcar ou tenha alguma dúvida, basta responder a este e-mail ou entrar em contato conosco pelo nosso canal de atendimento.</p>
      </div>
      
      <div class="footer">
        <p class="clinic-name">\${clinicName}</p>
        <p>Este é um e-mail automático, mas feito com muito carinho para você.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

const fileContent = fs.readFileSync('lib/db-tools.ts', 'utf8');

const regex = /html: `<p>Olá <strong>\${paciente\.nome}<\/strong>,<\/p><p>Sua consulta está confirmada para <strong>\${dataHoraBR}<\/strong>\.<\/p><p>Especialidade: \${data\.especialidade \|\| 'Não informada'}<\/p><br\/><p>Obrigado, equipe \${clinicName}!<\/p>`/;

const updatedContent = fileContent.replace(regex, 'html: `' + htmlTemplate + '`');

fs.writeFileSync('lib/db-tools.ts', updatedContent);
console.log('Template updated successfully!');
