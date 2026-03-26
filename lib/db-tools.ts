import { supabase } from './supabase';

export async function checkPatientRegistration(cpf?: string, nome?: string, telefone?: string) {
  try {
    let query = supabase.from('pacientes').select('*');
    
    if (cpf) {
      query = query.eq('cpf', cpf);
    } else if (telefone) {
      query = query.eq('telefone', telefone);
    } else if (nome) {
      query = query.ilike('nome', `%${nome}%`);
    } else {
      return { error: 'Nenhum parâmetro de busca fornecido (CPF, Nome ou Telefone).' };
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking patient:', error);
      return { error: 'Erro ao verificar paciente no banco de dados.' };
    }

    if (!data || data.length === 0) {
      return { registered: false };
    }

    return { registered: true, patient: data[0], matches: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function registerPatient(nome: string, cpf: string, telefone?: string, data_nascimento?: string) {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .insert([{ nome, cpf, telefone, data_nascimento }])
      .select()
      .single();

    if (error) {
      console.error('Error registering patient:', error);
      return { error: 'Erro ao cadastrar paciente no banco de dados.' };
    }

    return { success: true, patient: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function scheduleAppointment(paciente_id: string, data_hora: string, motivo?: string, especialidade?: string) {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([{ paciente_id, data_hora, motivo, especialidade, status: 'pendente' }])
      .select()
      .single();

    if (error) {
      console.error('Error scheduling appointment:', error);
      return { error: 'Erro ao agendar consulta no banco de dados.' };
    }

    return { success: true, appointment: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function saveTriage(paciente_id: string, pain_scale: number, symptoms: string, red_flags?: string, urgency_classification?: string) {
  try {
    const { data, error } = await supabase
      .from('triages')
      .insert([{ paciente_id, pain_scale, symptoms, red_flags, urgency_classification }])
      .select()
      .single();

    if (error) {
      console.error('Error saving triage:', error);
      return { error: 'Erro ao salvar triagem no banco de dados.' };
    }

    return { success: true, triage: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function searchLearnedAnswers(keyword: string) {
  try {
    const { data, error } = await supabase
      .from('learned_faqs')
      .select('*')
      .ilike('question', `%${keyword}%`)
      .order('usage_count', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error searching FAQs:', error);
      return { error: 'Erro ao buscar respostas aprendidas.' };
    }

    return { success: true, answers: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function saveLearnedAnswer(question: string, answer: string, category: string) {
  try {
    const { data, error } = await supabase
      .from('learned_faqs')
      .insert([{ question, answer, category }])
      .select()
      .single();

    if (error) {
      console.error('Error saving learned FAQ:', error);
      return { error: 'Erro ao salvar nova resposta aprendida.' };
    }

    return { success: true, saved: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function checkAvailability(data_hora: string) {
  try {
    const { count, error } = await supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .eq('data_hora', data_hora)
      .neq('status', 'canceled');

    if (error) {
      console.error('Error checking availability:', error);
      return { error: 'Erro ao verificar disponibilidade.' };
    }

    return { available: count === 0 };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getPatientAppointments(paciente_id: string) {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('paciente_id', paciente_id)
      .neq('status', 'canceled')
      .order('data_hora', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return { error: 'Erro ao buscar consultas do paciente.' };
    }

    return { success: true, appointments: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function cancelAppointment(appointment_id: string) {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ status: 'canceled' })
      .eq('id', appointment_id)
      .select()
      .single();

    if (error) {
      console.error('Error canceling appointment:', error);
      return { error: 'Erro ao cancelar consulta.' };
    }

    return { success: true, appointment: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function rescheduleAppointment(appointment_id: string, new_data_hora: string) {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ data_hora: new_data_hora })
      .eq('id', appointment_id)
      .select()
      .single();

    if (error) {
      console.error('Error rescheduling appointment:', error);
      return { error: 'Erro ao reagendar consulta.' };
    }

    return { success: true, appointment: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function sendAppointmentSummary(appointment_id: string) {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, pacientes(nome, email, telefone)')
      .eq('id', appointment_id)
      .single();

    if (error) {
      console.error('Error generating summary:', error);
      return { error: 'Erro ao gerar resumo da consulta.' };
    }

    return { 
      success: true, 
      message: "Resumo gerado e 'enviado' com sucesso (simulação).", 
      summary: data 
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
