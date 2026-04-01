import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient_name, description, amount, payment_method } = body;

    if (!patient_name || !description || !amount) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando.' },
        { status: 400 }
      );
    }

    // 1. Fetch clinic settings to get payment gateway info
    const { data: settings, error: settingsError } = await supabase
      .from('clinic_settings')
      .select('active_payment_gateway, mp_access_token, asaas_api_key')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Configurações da clínica não encontradas.' },
        { status: 500 }
      );
    }

    const { active_payment_gateway, mp_access_token, asaas_api_key } = settings;

    if (active_payment_gateway === 'none' || !active_payment_gateway) {
      return NextResponse.json(
        { error: 'Nenhum gateway de pagamento está ativado nas configurações.' },
        { status: 400 }
      );
    }

    // 2. Create the invoice in the database FIRST to get its ID
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert([{
        patient_name,
        description,
        amount: Number(amount),
        payment_method,
        status: 'pending'
      }])
      .select()
      .single();

    if (insertError || !invoice) {
      console.error('Invoice Insert Error:', insertError);
      return NextResponse.json({ error: 'Erro ao criar registro da fatura.' }, { status: 500 });
    }

    // Generate dynamic Webhook URL based on the request's origin
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const origin = `${protocol}://${host}`;
    const webhookUrl = `${origin}/api/payments/webhook`;

    let paymentLink = '';

    // 3. Generate link based on selected gateway
    if (active_payment_gateway === 'mercadopago') {
      if (!mp_access_token) {
        // Rollback invoice creation if token is missing
        await supabase.from('invoices').delete().eq('id', invoice.id);
        return NextResponse.json({ error: 'Access Token do Mercado Pago não configurado.' }, { status: 400 });
      }

      // Mercado Pago API
      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mp_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              id: invoice.id,
              title: description,
              description: `Cobrança para ${patient_name}`,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: Number(amount),
            },
          ],
          payer: {
            name: patient_name,
          },
          external_reference: invoice.id,
          notification_url: webhookUrl,
        }),
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        console.error('Mercado Pago Error:', JSON.stringify(mpData, null, 2));
        // Rollback
        await supabase.from('invoices').delete().eq('id', invoice.id);
        return NextResponse.json({ error: 'Erro ao gerar link no Mercado Pago. Verifique as credenciais.' }, { status: 500 });
      }
      
      console.log('Mercado Pago Success:', mpData.id);
      paymentLink = mpData.init_point; // URL for the user to pay

    } else if (active_payment_gateway === 'asaas') {
      if (!asaas_api_key) {
        await supabase.from('invoices').delete().eq('id', invoice.id);
        return NextResponse.json({ error: 'API Key do Asaas não configurada.' }, { status: 400 });
      }

      // Asaas API: Create Customer First
      const customerRes = await fetch('https://api.asaas.com/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': asaas_api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: patient_name,
          cpfCnpj: '00000000000' // Fake CPF for demo, ideally collect from UI
        }),
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        console.error('Asaas Customer Error:', customerData);
        await supabase.from('invoices').delete().eq('id', invoice.id);
        return NextResponse.json({ error: 'Erro ao registrar cliente no Asaas.' }, { status: 500 });
      }

      const customerId = customerData.id;

      // Asaas API: Create Payment
      const paymentRes = await fetch('https://api.asaas.com/v3/payments', {
        method: 'POST',
        headers: {
          'access_token': asaas_api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: payment_method === 'credit_card' ? 'CREDIT_CARD' : (payment_method === 'pix' ? 'PIX' : 'BOLETO'),
          value: Number(amount),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0], // +3 days
          description: description,
          externalReference: invoice.id,
        }),
      });

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) {
        console.error('Asaas Payment Error:', paymentData);
        await supabase.from('invoices').delete().eq('id', invoice.id);
        return NextResponse.json({ error: 'Erro ao gerar link no Asaas.' }, { status: 500 });
      }

      paymentLink = paymentData.invoiceUrl; // The public URL to pay
    }

    // 4. Update the invoice with the generated payment link
    await supabase
      .from('invoices')
      .update({ payment_link: paymentLink })
      .eq('id', invoice.id);

    return NextResponse.json({ 
      success: true, 
      payment_link: paymentLink,
      invoice_id: invoice.id
    });

  } catch (error: any) {
    console.error('Payment API Error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar pagamento.', details: error.message },
      { status: 500 }
    );
  }
}