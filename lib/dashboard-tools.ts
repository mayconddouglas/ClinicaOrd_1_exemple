import { supabase } from './supabase';

export async function getMedicos(search?: string) {
  try {
    let query = supabase.from('medicos').select('*');
    if (search) {
      query = query.or(`nome.ilike.%${search}%,especialidade.ilike.%${search}%,crm.ilike.%${search}%`);
    }
    const { data, error } = await query.order('nome', { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createMedico(data: {
  nome: string;
  crm: string;
  especialidade: string;
  telefone?: string;
  email?: string;
  bio?: string;
  disponivel?: boolean;
}) {
  try {
    const { data: novo, error } = await supabase
      .from('medicos')
      .insert([{ ...data, disponivel: data.disponivel ?? true }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: novo };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMedico(
  id: string,
  data: { nome?: string; crm?: string; especialidade?: string; telefone?: string; email?: string; bio?: string; disponivel?: boolean }
) {
  try {
    const { data: atualizado, error } = await supabase
      .from('medicos')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: atualizado };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMedico(id: string) {
  try {
    const { error } = await supabase.from('medicos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDashboardKPIs() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      { count: appointmentsCount },
      { count: urgentTriagesCount },
      { count: faqsCount },
      { count: totalPatients },
      { count: availableDoctors },
      { count: pendingTriages },
    ] = await Promise.all([
      supabase.from('agendamentos').select('*', { count: 'exact', head: true })
        .gte('data_hora', `${today}T00:00:00Z`)
        .lte('data_hora', `${today}T23:59:59Z`),
      supabase.from('triages').select('*', { count: 'exact', head: true })
        .gte('pain_scale', 7).neq('status', 'resolvido'),
      supabase.from('learned_faqs').select('*', { count: 'exact', head: true }),
      supabase.from('pacientes').select('*', { count: 'exact', head: true }),
      supabase.from('medicos').select('*', { count: 'exact', head: true }).eq('disponivel', true),
      supabase.from('triages').select('*', { count: 'exact', head: true }).neq('status', 'resolvido'),
    ]);

    return {
      success: true,
      data: {
        appointmentsToday: appointmentsCount || 0,
        urgentTriages: urgentTriagesCount || 0,
        learnedFaqs: faqsCount || 0,
        totalPatients: totalPatients || 0,
        availableDoctors: availableDoctors || 0,
        pendingTriages: pendingTriages || 0,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getRecentAppointments() {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, pacientes(nome, telefone, cpf)')
      .order('data_hora', { ascending: true })
      .limit(20);
    
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getUrgentTriages() {
  try {
    const { data, error } = await supabase
      .from('triages')
      .select('*, pacientes(nome, telefone, cpf)')
      .order('pain_scale', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getLearnedFAQs() {
  try {
    const { data, error } = await supabase
      .from('learned_faqs')
      .select('*')
      .not('category', 'like', '\\_\\_%') // Ignora qualquer categoria que comece com __ (ex: __DEBUG_LOG__, __SYSTEM_SETTING__)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateLearnedFAQ(id: string, data: { question?: string; answer?: string; category?: string }) {
  try {
    const { error } = await supabase
      .from('learned_faqs')
      .update(data)
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteLearnedFAQ(id: string) {
  try {
    const { error } = await supabase
      .from('learned_faqs')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPendingQuestions() {
  try {
    const { data, error } = await supabase
      .from('pending_questions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function answerPendingQuestion(id: string, question: string, answer: string, category: string) {
  try {
    // 1. Update status to answered
    const { error: updateError } = await supabase
      .from('pending_questions')
      .update({ status: 'answered' })
      .eq('id', id);
    if (updateError) throw updateError;

    // 2. Generate embedding (if possible via an API route or server action in the future)
    // As this is client-side code, we might not have GEMINI_API_KEY.
    // For now, we will insert without embedding. A background job or trigger could generate it later,
    // or we can just leave it as text-only fallback.
    const { error: insertError } = await supabase
      .from('learned_faqs')
      .insert([{ question, answer, category }]);
    if (insertError) throw insertError;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAllTriages() {
  try {
    const { data, error } = await supabase
      .from('triages')
      .select('*, pacientes(nome, telefone, cpf)')
      .order('pain_scale', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateAppointmentStatus(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTriageStatus(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('triages')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPatients(search?: string) {
  try {
    let query = supabase.from('pacientes').select('*');
    
    if (search) {
      query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%,telefone.ilike.%${search}%`);
    }
    
    const { data, error } = await query.limit(50);
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createPatient(data: { nome: string; cpf?: string; telefone?: string }) {
  try {
    const { data: newPatient, error } = await supabase
      .from('pacientes')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: newPatient };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePatient(id: string, data: { nome?: string; cpf?: string; telefone?: string }) {
  try {
    const { data: updatedPatient, error } = await supabase
      .from('pacientes')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: updatedPatient };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePatient(id: string) {
  try {
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAnalyticsData() {
  try {
    // 1. Triages by pain level
    const { data: triages } = await supabase.from('triages').select('pain_scale');
    const painStats = { baixa: 0, media: 0, alta: 0 };
    triages?.forEach(t => {
      if (t.pain_scale < 4) painStats.baixa++;
      else if (t.pain_scale < 7) painStats.media++;
      else painStats.alta++;
    });

    // 2. Appointments by status
    const { data: appts } = await supabase.from('agendamentos').select('status');
    const apptStats = { pendente: 0, confirmada: 0, cancelada: 0 };
    appts?.forEach(a => {
      if (a.status === 'pendente') apptStats.pendente++;
      else if (a.status === 'confirmada') apptStats.confirmada++;
      else if (a.status === 'canceled' || a.status === 'cancelada') apptStats.cancelada++;
    });

    return {
      success: true,
      data: {
        painDistribution: [
          { name: 'Dor Leve (0-3)', value: painStats.baixa, fill: '#22c55e' },
          { name: 'Dor Moderada (4-6)', value: painStats.media, fill: '#eab308' },
          { name: 'Dor Intensa (7-10)', value: painStats.alta, fill: '#ef4444' }
        ],
        appointmentStatus: [
          { name: 'Pendentes', value: apptStats.pendente, fill: '#eab308' },
          { name: 'Confirmadas', value: apptStats.confirmada, fill: '#22c55e' },
          { name: 'Canceladas', value: apptStats.cancelada, fill: '#ef4444' }
        ]
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
