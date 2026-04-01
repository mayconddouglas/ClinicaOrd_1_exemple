import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InvoiceEmailProps {
  patientName: string;
  clinicName: string;
  serviceName: string;
  amount: number;
  paymentLink: string;
  items?: any[];
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentEspecialidade?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const InvoiceEmail = ({
  patientName,
  clinicName,
  serviceName,
  amount,
  paymentLink,
  items,
  appointmentDate,
  appointmentTime,
  appointmentEspecialidade,
}: InvoiceEmailProps) => {
  const isFree = amount === 0;

  return (
    <Html>
      <Head />
      <Preview>{isFree ? 'Sua Confirmação de Agendamento' : 'Sua cobrança para o agendamento'} - {clinicName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Olá, {patientName} 👋</Heading>
          
          <Text style={paragraph}>
            Aqui estão os detalhes do seu agendamento na clínica <strong>{clinicName}</strong>.
            {!isFree && " Para confirmar seu horário, por favor realize o pagamento no link abaixo."}
          </Text>
        
        <Section style={card}>
          <Text style={cardTitle}>Resumo do Agendamento</Text>
          
          {(appointmentDate && appointmentTime) && (
            <div style={appointmentContainer}>
              <Text style={cardItem}><strong>Data:</strong> {new Date(appointmentDate).toLocaleDateString('pt-BR')} às {appointmentTime}</Text>
              <Text style={cardItem}><strong>Especialidade:</strong> {appointmentEspecialidade}</Text>
              <Hr style={innerHr} />
            </div>
          )}

          {items && items.length > 1 ? (
            <div style={itemsContainer}>
              <Text style={cardItem}><strong>Pacote de Serviços:</strong></Text>
              <ul style={itemsList}>
                {items.map((item, i) => (
                  <li key={i} style={listItem}>
                    {item.name} {item.is_free ? '(Gratuito)' : `- ${formatCurrency(item.price)}`}
                  </li>
                ))}
              </ul>
              <Hr style={innerHr} />
              <Text style={totalItem}><strong>Total a Pagar:</strong> {formatCurrency(amount)}</Text>
            </div>
          ) : (
            <>
              <Text style={cardItem}><strong>Procedimento:</strong> {serviceName}</Text>
              <Text style={cardItem}><strong>Valor:</strong> {formatCurrency(amount)}</Text>
            </>
          )}
        </Section>

        {!isFree && (
          <>
            <Section style={btnContainer}>
              <Link style={button} href={paymentLink}>
                Realizar Pagamento Seguro
              </Link>
            </Section>

            <Text style={subtext}>
              Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:
              <br />
              <Link href={paymentLink} style={link}>
                {paymentLink}
              </Link>
            </Text>
          </>
        )}

        <Hr style={hr} />
        
        <Text style={footer}>
          <strong>{clinicName}</strong>
          <br />
          Por favor, não responda a este e-mail automático.
        </Text>
      </Container>
    </Body>
  </Html>
  );
};

export default InvoiceEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '600',
  color: '#1a1a1a',
  padding: '0',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.5',
  color: '#4a4a4a',
  margin: '16px 0',
};

const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  marginTop: '24px',
  marginBottom: '24px',
};

const cardTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '16px',
  marginTop: '0',
};

const appointmentContainer = {
  marginBottom: '16px',
};

const cardItem = {
  fontSize: '15px',
  color: '#4a4a4a',
  margin: '8px 0',
};

const itemsContainer = {
  marginTop: '12px',
};

const itemsList = {
  margin: '8px 0 16px 0',
  paddingLeft: '20px',
  color: '#4a4a4a',
  fontSize: '14px',
  lineHeight: '1.6',
};

const listItem = {
  marginBottom: '4px',
};

const innerHr = {
  borderColor: '#e2e8f0',
  margin: '12px 0',
};

const totalItem = {
  fontSize: '16px',
  color: '#1a1a1a',
  margin: '8px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const subtext = {
  fontSize: '13px',
  lineHeight: '1.5',
  color: '#8c8c8c',
  marginTop: '24px',
};

const link = {
  color: '#6366f1',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  fontSize: '13px',
  color: '#8c8c8c',
  lineHeight: '1.5',
};