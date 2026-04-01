import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, email, appPassword } = body;

    if (!to || !email || !appPassword) {
      return NextResponse.json(
        { error: 'Faltam parâmetros obrigatórios (to, email, appPassword)' },
        { status: 400 }
      );
    }

    // Configurar o transporter do Nodemailer para Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: appPassword, // A Senha de Aplicativo do Google
      },
    });

    // Definir o e-mail
    const mailOptions = {
      from: `"Clínica Ortopedia (Teste)" <${email}>`,
      to: to,
      subject: 'Conexão com Gmail Estabelecida com Sucesso! ✅',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Integração Ativa!</h2>
          <p>Olá,</p>
          <p>Se você está recebendo este e-mail, significa que a sua integração do <strong>Google Workspace (Gmail)</strong> com o painel da clínica está funcionando perfeitamente!</p>
          <p>A partir de agora, o sistema poderá enviar lembretes automáticos de consulta para os seus pacientes usando este endereço de e-mail.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">Este é um e-mail automático gerado pelo teste de conexão do seu Dashboard.</p>
        </div>
      `,
    };

    // Enviar o e-mail
    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de teste:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar o e-mail. Verifique suas credenciais.', details: error.message },
      { status: 500 }
    );
  }
}