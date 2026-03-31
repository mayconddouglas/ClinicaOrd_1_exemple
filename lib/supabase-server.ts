import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wxrxbvjgpwikegxkmfnq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cnhidmpncHdpa2VneGttZm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDA0MTgsImV4cCI6MjA5MDExNjQxOH0.W7OpQnw08Vmrxr_AbWuPM3HDtIdsWnX-IyUhIYd2nFA';

// Cliente Supabase com privilégios administrativos (Service Role)
// ATENÇÃO: NUNCA use este cliente em componentes do lado do cliente (Client Components).
// Use APENAS em rotas de API (app/api/...) ou Server Actions.
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);
