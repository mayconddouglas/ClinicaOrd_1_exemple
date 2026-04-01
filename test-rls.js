import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://wxrxbvjgpwikegxkmfnq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cnhidmpncHdpa2VneGttZm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDA0MTgsImV4cCI6MjA5MDExNjQxOH0.W7OpQnw08Vmrxr_AbWuPM3HDtIdsWnX-IyUhIYd2nFA');

async function run() {
  const { data, error } = await supabase.from('agendamentos').select('*').limit(1);
  console.log('Error:', error);
}
run();
