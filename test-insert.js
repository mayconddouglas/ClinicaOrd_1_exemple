import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://wxrxbvjgpwikegxkmfnq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cnhidmpncHdpa2VneGttZm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDA0MTgsImV4cCI6MjA5MDExNjQxOH0.W7OpQnw08Vmrxr_AbWuPM3HDtIdsWnX-IyUhIYd2nFA');

async function run() {
  const { data: patient, error: patientError } = await supabase.from('pacientes').select('id').limit(1).single();
  if (!patient) return console.log('No patient:', patientError);
  
  const { data, error } = await supabase.from('agendamentos').insert([{
    paciente_id: patient.id,
    data_hora: '2026-05-20T14:00:00',
    motivo: 'Test',
    especialidade: 'clinico',
    status: 'pendente'
  }]).select().single();
  
  if (error) {
    console.error('Error inserting:', error.message);
  } else {
    console.log('Success:', data);
  }
}
run();
