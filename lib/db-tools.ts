import { supabaseServer as supabase } from './supabase-server';

export async function getAvailableDoctors() {
  try {
    const { data, error } = await supabase
      .from('medicos')
      .select('*')
      .eq('disponivel', true)
      .order('nome', { ascending: true });

    if (error) return { error: 'Erro ao buscar médicos disponíveis.' };
    return { success: true, doctors: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getDoctorsBySpecialty(especialidade: string) {
  try {
    const { data, error } = await supabase
      .from('medicos')
      .select('*')
      .ilike('especialidade', `%${especialidade}%`)
      .eq('disponivel', true)
      .order('nome', { ascending: true });

    if (error) return { error: 'Erro ao buscar médicos por especialidade.' };
    return { success: true, doctors: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

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

// --- SYSTEM SETTINGS (Relational) ---
export async function getSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
      
    if (error || !data) return null;
    return data.value;
  } catch (err) {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    return !error;
  } catch (err) {
    return false;
  }
}

// --- CHAT HISTORY (Relational) ---
async function getOrCreateSession(platform: string, externalId: string): Promise<string | null> {
  try {
    // Tenta buscar a sessão existente
    let { data: session } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('platform', platform)
      .eq('external_id', externalId)
      .single();

    if (session) return session.id;

    // Se não existir, cria uma nova
    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert([{ platform, external_id: externalId }])
      .select('id')
      .single();

    if (error || !newSession) {
      console.error('Error creating chat session:', error);
      return null;
    }
    return newSession.id;
  } catch (err) {
    console.error('Session error:', err);
    return null;
  }
}

async function getHistory(platform: string, externalId: string, limit: number = 10): Promise<any[]> {
  try {
    const sessionId = await getOrCreateSession(platform, externalId);
    if (!sessionId) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    // Invertemos para ficar na ordem cronológica (mais antigo primeiro)
    return data.reverse().map(m => ({
      role: m.role,
      parts: m.content
    }));
  } catch (err) {
    return [];
  }
}

async function appendMessages(platform: string, externalId: string, newMessages: any[]): Promise<boolean> {
  try {
    const sessionId = await getOrCreateSession(platform, externalId);
    if (!sessionId) return false;

    // Atualiza o updated_at da sessão
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);

    const inserts = newMessages.map(m => ({
      session_id: sessionId,
      role: m.role,
      content: m.parts
    }));

    const { error } = await supabase.from('chat_messages').insert(inserts);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function getTelegramHistory(chatId: string): Promise<any[]> {
  return getHistory('telegram', chatId);
}

export async function saveTelegramHistory(chatId: string, history: any[]): Promise<boolean> {
  // Para manter compatibilidade com o código atual que passa o array todo, 
  // vamos extrair apenas as últimas mensagens que foram adicionadas (geralmente as últimas 2: user e model)
  // Como o webhook envia o history atualizado inteiro, pegamos os que não estão no banco?
  // O mais seguro para não quebrar o webhook existente agora é limpar o limit excedente e recriar, OU melhor: 
  // refatorar o webhook para chamar appendMessages direto. Mas para não quebrar as rotas, vamos fazer um replace inteligente aqui:
  // Mas como a tarefa é refatorar a gambiarra, vamos apagar as mensagens antigas da sessão e inserir as novas (até 10).
  // Ou melhor, o webhook já deve ser refatorado na Sprint 1. Então vamos apenas exportar os métodos novos.
  return false; // Deprecated, will be replaced in webhooks
}

export async function getWhatsappHistory(phone: string): Promise<any[]> {
  return getHistory('whatsapp', phone);
}

export async function saveWhatsappHistory(phone: string, history: any[]): Promise<boolean> {
  return false; // Deprecated, will be replaced in webhooks
}

export async function appendChatMessages(platform: string, externalId: string, messages: any[]): Promise<boolean> {
  return appendMessages(platform, externalId, messages);
}

export async function escalateToHuman(question: string, patientPhone: string = 'anonymous') {
  try {
    const { data, error } = await supabase
      .from('pending_questions')
      .insert([{ question, patient_phone: patientPhone, status: 'pending' }])
      .select()
      .single();

    if (error) {
      console.error('Error escalating to human:', error);
      return { error: 'Erro ao enviar pergunta para a equipe.' };
    }

    return { success: true, data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function registerPatientAlert(paciente_id: string, message: string, severity: string = 'normal') {
  try {
    // Reusing pending_questions table as an alert queue for the dashboard
    const { data, error } = await supabase
      .from('pending_questions')
      .insert([{ 
        question: `[ALERTA PÓS-CONSULTA - ${severity.toUpperCase()}] ${message}`, 
        patient_phone: paciente_id, 
        status: 'pending' 
      }])
      .select()
      .single();

    if (error) {
      console.error('Error registering alert:', error);
      return { error: 'Erro ao registrar alerta para a equipe médica.' };
    }

    return { success: true, alert: data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getAvailableSlots(dateStr: string) {
  try {
    // 1. Parse date and get day of week safely (avoid timezone shift)
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) return { error: 'Data inválida. Use o formato YYYY-MM-DD.' };
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // 2. Fetch business hours for this day
    const { data: hoursData, error: hoursError } = await supabase
      .from('business_hours')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single();

    if (hoursError || !hoursData) {
      return { error: 'Não foi possível carregar os horários de funcionamento.' };
    }

    if (hoursData.is_closed) {
      return { success: true, availableSlots: [], message: 'A clínica está fechada neste dia.' };
    }

    // 3. Fetch schedule blocks (holidays/exceptions) for this date
    const { data: blocksData, error: blocksError } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('block_date', dateStr.split('T')[0]);

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
    }

    // 4. Fetch existing appointments for this date
    const startOfDay = new Date(year, month - 1, day);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: apptsData, error: apptsError } = await supabase
      .from('agendamentos')
      .select('data_hora')
      .gte('data_hora', startOfDay.toISOString())
      .lte('data_hora', endOfDay.toISOString())
      .neq('status', 'canceled')
      .neq('status', 'cancelada');

    if (apptsError) {
      console.error('Error fetching appointments:', apptsError);
    }

    // 5. Generate slots
    const availableSlots: string[] = [];
    const slotDurationMs = (hoursData.slot_duration || 30) * 60000;
    
    // Helper to convert HH:MM:SS to Date object on the specific day
    const timeToDate = (timeStr: string) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      const d = new Date(year, month - 1, day);
      d.setHours(hours, minutes, seconds || 0, 0);
      return d;
    };

    const openTime = timeToDate(hoursData.open_time);
    const closeTime = timeToDate(hoursData.close_time);
    const lunchStart = hoursData.lunch_start ? timeToDate(hoursData.lunch_start) : null;
    const lunchEnd = hoursData.lunch_end ? timeToDate(hoursData.lunch_end) : null;

    let currentSlot = new Date(openTime);

    while (currentSlot.getTime() + slotDurationMs <= closeTime.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + slotDurationMs);
      let isAvailable = true;

      // Check lunch break
      if (lunchStart && lunchEnd) {
        if (
          (currentSlot.getTime() >= lunchStart.getTime() && currentSlot.getTime() < lunchEnd.getTime()) ||
          (slotEnd.getTime() > lunchStart.getTime() && slotEnd.getTime() <= lunchEnd.getTime()) ||
          (currentSlot.getTime() <= lunchStart.getTime() && slotEnd.getTime() >= lunchEnd.getTime())
        ) {
          isAvailable = false;
        }
      }

      // Check schedule blocks
      if (isAvailable && blocksData) {
        for (const block of blocksData) {
          const blockStart = timeToDate(block.start_time);
          const blockEnd = timeToDate(block.end_time);
          if (
            (currentSlot.getTime() >= blockStart.getTime() && currentSlot.getTime() < blockEnd.getTime()) ||
            (slotEnd.getTime() > blockStart.getTime() && slotEnd.getTime() <= blockEnd.getTime()) ||
            (currentSlot.getTime() <= blockStart.getTime() && slotEnd.getTime() >= blockEnd.getTime())
          ) {
            isAvailable = false;
            break;
          }
        }
      }

      // Check existing appointments
      if (isAvailable && apptsData) {
        for (const appt of apptsData) {
          const apptTime = new Date(appt.data_hora);
          // Assuming appointments take exactly 1 slot duration for simplicity
          const apptEnd = new Date(apptTime.getTime() + slotDurationMs);
          
          if (
            (currentSlot.getTime() >= apptTime.getTime() && currentSlot.getTime() < apptEnd.getTime()) ||
            (slotEnd.getTime() > apptTime.getTime() && slotEnd.getTime() <= apptEnd.getTime()) ||
            (currentSlot.getTime() === apptTime.getTime())
          ) {
            isAvailable = false;
            break;
          }
        }
      }

      // Check if slot is in the past (only relevant for today)
      if (isAvailable && currentSlot.getTime() < new Date().getTime()) {
        isAvailable = false;
      }

      if (isAvailable) {
        // Format to HH:MM
        const hours = currentSlot.getHours().toString().padStart(2, '0');
        const minutes = currentSlot.getMinutes().toString().padStart(2, '0');
        availableSlots.push(`${hours}:${minutes}`);
      }

      currentSlot = new Date(currentSlot.getTime() + slotDurationMs);
    }

    return { 
      success: true, 
      date: dateStr.split('T')[0],
      availableSlots,
      message: availableSlots.length > 0 
        ? `Encontrados ${availableSlots.length} horários disponíveis.` 
        : 'Nenhum horário disponível para esta data.'
    };

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
