const fs = require('fs');

const htmlTemplate = `\`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
              .email-wrapper { width: 100%; background-color: #f3f4f6; padding: 40px 0; }
              .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
              .header { background-color: #3b82f6; padding: 32px 40px; text-align: center; }
              .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
              .icon-wrapper { font-size: 40px; line-height: 1; margin-bottom: 16px; display: inline-block; }
              .content { padding: 40px; color: #374151; line-height: 1.6; font-size: 16px; }
              .greeting { font-size: 20px; font-weight: 600; color: #111827; margin-top: 0; margin-bottom: 24px; }
              .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 32px 0; }
              .detail-row { margin-bottom: 16px; }
              .detail-row:last-child { margin-bottom: 0; }
              .detail-label { color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px; display: block; }
              .detail-value { color: #0f172a; font-size: 16px; font-weight: 500; margin: 0; }
              .divider { height: 1px; background-color: #e2e8f0; margin: 16px 0; }
              .btn-container { text-align: center; margin: 40px 0 20px; }
              .btn { background-color: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; }
              .footer { background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
              .footer p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.5; }
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
                  <div class="icon-wrapper">⏰</div>
                  <h1>Lembrete de Consulta</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá, \${paciente.nome}! 👋</p>
                  
                  <p>Este é um lembrete amigável de que você tem uma consulta marcada conosco <strong>hoje</strong>.</p>
                  
                  <div class="details-card">
                    <div class="detail-row">
                      <span class="detail-label">Data e Hora</span>
                      <p class="detail-value">📅 \${dataFormatada} às \${horaFormatada}</p>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="detail-row">
                      <span class="detail-label">Especialidade / Motivo</span>
                      <p class="detail-value">🩺 \${agendamento.especialidade || 'Consulta Geral'}</p>
                    </div>
                  </div>

                  <p style="text-align: center; margin-top: 32px;">Por favor, confirme sua presença clicando no botão abaixo:</p>

                  <div class="btn-container">
                    <a href="\${confirmLink}" class="btn" style="color: #ffffff;">Confirmar Presença</a>
                  </div>
                </div>
                
                <div class="footer">
                  <p>Se precisar cancelar, por favor entre em contato com a clínica o mais rápido possível para liberarmos o horário.</p>
                  <p style="margin-top: 16px;"><strong>Clínica Ortopedia</strong></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        \``;

const fileContent = fs.readFileSync('app/api/email/reminder/route.ts', 'utf8');

const regex = /html: `[\s\S]*?`,\n\s*};/m;

const updatedContent = fileContent.replace(regex, 'html: ' + htmlTemplate + ',\n      };');

fs.writeFileSync('app/api/email/reminder/route.ts', updatedContent);
console.log('Reminder template updated successfully!');
