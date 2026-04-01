import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendReceiptEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let body: any = {};
    
    // Parse JSON body if present
    try {
      body = await request.json();
    } catch (e) {
      // Body might be empty or not JSON, which is fine for some Mercado Pago GET/POST callbacks
    }

    // 1. Fetch clinic settings to get tokens for validation and SMTP config
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('clinic_name, mp_access_token, asaas_api_key, smtp_user, smtp_pass')
      .limit(1)
      .single();

    // ---------------------------------------------------------
    // MERCADO PAGO WEBHOOK (IPN / Webhook)
    // ---------------------------------------------------------
    
    // Log headers to see what MP sends
    console.log('[Webhook] Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[Webhook] Query Params:', url.search);
    console.log('[Webhook] Body:', JSON.stringify(body));

    // Mercado Pago sends the ID either in query params (?data.id=123) or body (body.data.id)
    const mpId = url.searchParams.get('data.id') || url.searchParams.get('id') || body?.data?.id;
    const mpTopic = url.searchParams.get('type') || url.searchParams.get('topic') || body?.type || body?.action;

    // Se o topic for 'payment' ou 'payment.created' / 'payment.updated', validamos.
    // Em notificações de IPN, às vezes só vem 'payment'
    if (mpId && (mpTopic === 'payment' || mpTopic?.startsWith('payment') || url.searchParams.has('data.id'))) {
      console.log(`[Webhook] Mercado Pago Notification Received. ID: ${mpId}`);

      if (!settings?.mp_access_token) {
        console.error('Mercado Pago Token is missing in settings');
        return NextResponse.json({ error: 'Gateway não configurado' }, { status: 400 });
      }

      // Fetch payment details directly from Mercado Pago API to ensure security and get status
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
        headers: { Authorization: `Bearer ${settings.mp_access_token}` }
      });
      
      if (!mpRes.ok) {
        console.error('Failed to fetch payment info from MP');
        return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
      }

      const paymentInfo = await mpRes.json();
      
      // Check if payment was approved
      if (paymentInfo.status === 'approved') {
        const invoiceId = paymentInfo.external_reference; // This is the ID we passed during creation
        
        if (invoiceId) {
          // Get patient email before updating
          const { data: invoiceData } = await supabase
            .from('invoices')
            .select('customer_email, patient_name, description')
            .eq('id', invoiceId)
            .single();

          // Update our Supabase database
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString()
            })
            .eq('id', invoiceId);
            
          console.log(`[Webhook] Invoice ${invoiceId} marked as PAID.`);

          // Send a "Payment Confirmed" email to the patient using Nodemailer
          if (invoiceData?.customer_email && settings?.smtp_user && settings?.smtp_pass) {
            console.log(`[Email Service] Enviando recibo de confirmação para ${invoiceData.customer_email}`);
            try {
              await sendReceiptEmail(
                { user: settings.smtp_user, pass: settings.smtp_pass },
                invoiceData.customer_email,
                {
                  patientName: invoiceData.patient_name,
                  clinicName: settings.clinic_name || 'Clínica',
                  serviceName: invoiceData.description,
                  amount: Number(paymentInfo.transaction_amount)
                }
              );
              console.log(`[Email Service] Recibo enviado com sucesso!`);
            } catch (emailError) {
              console.error(`[Email Service] Erro ao enviar recibo:`, emailError);
            }
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    // ---------------------------------------------------------
    // ASAAS WEBHOOK
    // ---------------------------------------------------------
    if (body?.event === 'PAYMENT_RECEIVED' || body?.event === 'PAYMENT_CONFIRMED') {
      console.log(`[Webhook] Asaas Notification Received.`);
      const invoiceId = body.payment?.externalReference;
      
      if (invoiceId) {
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', invoiceId);
          
        console.log(`[Webhook] Invoice ${invoiceId} marked as PAID.`);
      }
      return NextResponse.json({ success: true });
    }

    // Return 200 OK for ignored events to stop retries
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error) {
    console.error('[Webhook] Internal Error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar webhook' },
      { status: 500 }
    );
  }
}
