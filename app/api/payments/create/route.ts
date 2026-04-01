import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendInvoiceEmail, sendReceiptEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      patient_id, 
      patient_name, 
      patient_email, 
      items, 
      description, 
      subtotal, 
      discount, 
      amount, 
      payment_method, 
      send_email,
      appointment_date_time,
      appointment_medico_id,
      appointment_medico_nome,
      appointment_especialidade 
    } = body;

    // Check if amount is undefined (0 is allowed)
    if (!patient_name || !items || items.length === 0 || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando.' },
        { status: 400 }
      );
    }

    // 1. Fetch clinic settings to get payment gateway and SMTP info
    const { data: settings, error: settingsError } = await supabase
      .from('clinic_settings')
      .select('clinic_name, active_payment_gateway, mp_access_token, asaas_api_key, smtp_user, smtp_pass')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Configurações da clínica não encontradas.' },
        { status: 500 }
      );
    }

    const { clinic_name, active_payment_gateway, mp_access_token, asaas_api_key, smtp_user, smtp_pass } = settings;

    if (active_payment_gateway === 'none' || !active_payment_gateway) {
      return NextResponse.json(
        { error: 'Nenhum gateway de pagamento está ativado nas configurações.' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    const isFree = numAmount === 0;

    let appointmentId = null;

    // 1.5. If appointment date/time provided, create appointment first
    if (appointment_date_time) {
      // Optional conflict check can be added here
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('agendamentos')
        .insert([{
          paciente_id: patient_id,
          medico_id: appointment_medico_id,
          data_hora: appointment_date_time,
          motivo: description,
          especialidade: appointment_especialidade || 'Consulta',
          status: isFree ? 'confirmada' : 'pendente' // If free, auto confirm!
        }])
        .select()
        .single();

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError);
        return NextResponse.json({ error: `Erro ao reservar horário: ${appointmentError.message}` }, { status: 500 });
      }

      appointmentId = appointment.id;
    }

    // 2. Create the invoice in the database
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert([{
        patient_id,
        patient_name,
        customer_email: patient_email,
        items,
        description,
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        amount: numAmount,
        payment_method: isFree ? 'free' : payment_method,
        status: isFree ? 'paid' : 'pending',
        paid_at: isFree ? new Date().toISOString() : null,
        appointment_id: appointmentId
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

    if (isFree) {
      // 3. FREE SERVICE: Bypass payment gateway
      paymentLink = 'Agendamento Gratuito';
      
      const especialidadeStr = appointment_medico_nome 
        ? `Dr(a). ${appointment_medico_nome} (${appointment_especialidade})` 
        : appointment_especialidade;

      // If send email, we send a Confirmation Receipt immediately instead of an Invoice
      if (send_email && patient_email && smtp_user && smtp_pass) {
        try {
          await sendReceiptEmail(
            { user: smtp_user, pass: smtp_pass },
            patient_email,
            {
              patientName: patient_name,
              clinicName: clinic_name || 'Clínica',
              serviceName: description,
              amount: 0,
              items: items,
              appointmentDate: appointment_date_time ? appointment_date_time.split('T')[0] : undefined,
              appointmentTime: appointment_date_time ? appointment_date_time.split('T')[1].substring(0, 5) : undefined,
              appointmentEspecialidade: appointment_medico_nome ? `Dr(a). ${appointment_medico_nome} (${appointment_especialidade})` : appointment_especialidade
            }
          );
          console.log(`[Email Service] Recibo de isenção enviado com sucesso para ${patient_email}`);
        } catch (emailError) {
          console.error(`[Email Service] Falha ao enviar recibo de isenção:`, emailError);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        payment_link: paymentLink,
        invoice_id: invoice.id,
        is_free: true
      });
    }

    // 4. PAID SERVICE: Generate link based on selected gateway
    if (active_payment_gateway === 'mercadopago') {
      const especialidadeStr = appointment_medico_nome 
        ? `Dr(a). ${appointment_medico_nome} (${appointment_especialidade})` 
        : appointment_especialidade;
      if (!mp_access_token) {
        // Rollback invoice creation if token is missing
        await supabase.from('invoices').delete().eq('id', invoice.id);
        return NextResponse.json({ error: 'Access Token do Mercado Pago não configurado.' }, { status: 400 });
      }

      // Mercado Pago API
      const mpPayload: any = {
        items: [
          {
            id: invoice.id,
            title: description,
            description: `Cobrança para ${patient_name}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: numAmount,
          },
        ],
        payer: {
          name: patient_name,
        },
        external_reference: invoice.id,
        notification_url: webhookUrl,
      };

      if (patient_email) {
        mpPayload.payer.email = patient_email;
      }

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mp_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mpPayload),
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

    // 5. If send_email is true and patient has email, we send the real email via Nodemailer
    if (send_email && patient_email) {
      if (smtp_user && smtp_pass) {
        console.log(`[Email Service] Enviando link de cobrança (${paymentLink}) para o e-mail: ${patient_email}`);
        try {
          await sendInvoiceEmail(
            { user: smtp_user, pass: smtp_pass },
            patient_email,
            {
              patientName: patient_name,
              clinicName: clinic_name || 'Clínica',
              serviceName: description,
              amount: numAmount,
              paymentLink: paymentLink,
              items: items,
              appointmentDate: appointment_date_time ? appointment_date_time.split('T')[0] : undefined,
              appointmentTime: appointment_date_time ? appointment_date_time.split('T')[1].substring(0, 5) : undefined,
              appointmentEspecialidade: appointment_medico_nome ? `Dr(a). ${appointment_medico_nome} (${appointment_especialidade})` : appointment_especialidade
            }
          );
          console.log(`[Email Service] E-mail de cobrança enviado com sucesso!`);
        } catch (emailError) {
          console.error(`[Email Service] Falha ao enviar e-mail:`, emailError);
          // We don't throw error here to not break the payment link generation, just log it.
        }
      } else {
        console.log(`[Email Service] SMTP não configurado. E-mail de cobrança não enviado para ${patient_email}`);
      }
    }

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