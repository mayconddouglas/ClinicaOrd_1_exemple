import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseServer } from '@/lib/supabase-server';

// Esta rota deve ser chamada por um CRON JOB (ex: a cada hora)
// Pode ser configurado no Vercel Cron ou em um serviço externo como cron-job.org
export async function GET(req: Request) {
  try {
    // 1. Verificar se a integração do Gmail está ativa
    const { data: config, error: configError } = await supabaseServer
      .from('workspace_integrations')
      .select('is_gmail_active, gmail_email, gmail_app_password')
      .single();

    if (configError || !config?.is_gmail_active || !config.gmail_email || !config.gmail_app_password) {
      return NextResponse.json({ error: 'Integração do Gmail não está ativa ou configurada.' }, { status: 400 });
    }

    // 2. Buscar agendamentos que acontecerão nas próximas 4 horas (status: pendente)
    // Calcula a janela de tempo: (Agora) até (Agora + 4 horas e 59 minutos)
    const now = new Date();
    const future = new Date(now.getTime() + 5 * 60 * 60 * 1000); // +5 horas para garantir uma margem
    const targetStart = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3 horas

    const { data: agendamentos, error: agendamentosError } = await supabaseServer
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        especialidade,
        pacientes!inner (
          nome,
          email
        )
      `)
      .eq('status', 'pendente')
      .gte('data_hora', targetStart.toISOString())
      .lte('data_hora', future.toISOString());

    if (agendamentosError) {
      throw agendamentosError;
    }

    if (!agendamentos || agendamentos.length === 0) {
      return NextResponse.json({ message: 'Nenhum lembrete para enviar no momento.' });
    }

    // 3. Configurar Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail_email,
        pass: config.gmail_app_password,
      },
    });

    const results = [];

    // 4. Enviar e-mails
    for (const agendamento of agendamentos) {
      const paciente = Array.isArray(agendamento.pacientes) ? agendamento.pacientes[0] : agendamento.pacientes;
      
      // Pula se o paciente não tiver e-mail
      if (!paciente || !paciente.email) continue;

      const dataObj = new Date(agendamento.data_hora);
      const dataFormatada = dataObj.toLocaleDateString('pt-BR');
      const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Link simulado de confirmação
      const confirmLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/appointments/confirm?id=${agendamento.id}`;

      const mailOptions = {
        from: `"Clínica Ortopedia" <${config.gmail_email}>`,
        to: paciente.email,
        subject: `Lembrete de Consulta: Hoje às ${horaFormatada}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb;">Lembrete de Consulta</h2>
            <p>Olá, <strong>${paciente.nome}</strong>!</p>
            <p>Este é um lembrete automático de que você tem uma consulta marcada conosco hoje.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Especialidade:</strong> ${agendamento.especialidade || 'Clínico Geral'}</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> ${dataFormatada}</p>
              <p style="margin: 5px 0;"><strong>Horário:</strong> ${horaFormatada}</p>
            </div>

            <p>Por favor, confirme sua presença clicando no botão abaixo:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirmar Presença</a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Se precisar cancelar, por favor entre em contato com a clínica o mais rápido possível.</p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        results.push({ id: agendamento.id, status: 'success', email: paciente.email });
      } catch (err: any) {
        console.error(`Erro ao enviar email para ${paciente.email}:`, err);
        results.push({ id: agendamento.id, status: 'error', email: paciente.email, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: agendamentos.length,
      sent: results.filter(r => r.status === 'success').length,
      results 
    });

  } catch (error: any) {
    console.error('Erro na rotina de lembretes:', error);
    return NextResponse.json({ error: 'Falha interna do servidor', details: error.message }, { status: 500 });
  }
}