import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import InvoiceEmail from '@/components/emails/InvoiceEmail';
import ReceiptEmail from '@/components/emails/ReceiptEmail';

interface EmailConfig {
  user: string;
  pass: string;
}

export const sendInvoiceEmail = async (
  config: EmailConfig,
  to: string,
  data: {
    patientName: string;
    clinicName: string;
    serviceName: string;
    amount: number;
    paymentLink: string;
    items?: any[];
  }
) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const emailHtml = await render(
    InvoiceEmail(data)
  );

  const options = {
    from: `"${data.clinicName}" <${config.user}>`,
    to,
    subject: `Sua cobrança - ${data.clinicName}`,
    html: emailHtml,
  };

  return transporter.sendMail(options);
};

export const sendReceiptEmail = async (
  config: EmailConfig,
  to: string,
  data: {
    patientName: string;
    clinicName: string;
    serviceName: string;
    amount: number;
    items?: any[];
  }
) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const emailHtml = await render(
    ReceiptEmail(data)
  );

  const options = {
    from: `"${data.clinicName}" <${config.user}>`,
    to,
    subject: `Pagamento Confirmado ✅ - ${data.clinicName}`,
    html: emailHtml,
  };

  return transporter.sendMail(options);
};
