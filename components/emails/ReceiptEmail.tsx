import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ReceiptEmailProps {
  patientName: string;
  clinicName: string;
  serviceName: string;
  amount: number;
  items?: any[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ReceiptEmail = ({
  patientName,
  clinicName,
  serviceName,
  amount,
  items,
}: ReceiptEmailProps) => (
  <Html>
    <Head />
    <Preview>Recibo de Pagamento - {clinicName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Pagamento Confirmado! ✅</Heading>
        
        <Text style={paragraph}>
          Olá, <strong>{patientName}</strong>! Seu pagamento foi recebido com sucesso pela clínica <strong>{clinicName}</strong>.
        </Text>
        
        <Section style={card}>
          <Text style={cardTitle}>Detalhes do Recibo</Text>
          
          {items && items.length > 1 ? (
            <div style={itemsContainer}>
              <Text style={cardItem}><strong>Pacote de Serviços:</strong></Text>
              <ul style={itemsList}>
                {items.map((item, i) => (
                  <li key={i} style={listItem}>
                    {item.name}
                  </li>
                ))}
              </ul>
              <Hr style={innerHr} />
              <Text style={totalItem}><strong>Valor Total:</strong> {amount === 0 ? 'Gratuito / Isento' : formatCurrency(amount)}</Text>
            </div>
          ) : (
            <>
              <Text style={cardItem}><strong>Procedimento:</strong> {serviceName}</Text>
              <Text style={cardItem}><strong>Valor Pago:</strong> {amount === 0 ? 'Gratuito / Isento' : formatCurrency(amount)}</Text>
            </>
          )}

          <Text style={cardItem}><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</Text>
        </Section>

        <Text style={paragraph}>
          Seu agendamento está 100% garantido. Nos vemos em breve!
        </Text>

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

export default ReceiptEmail;

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
  color: '#10b981', // green for success
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

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  fontSize: '13px',
  color: '#8c8c8c',
  lineHeight: '1.5',
};