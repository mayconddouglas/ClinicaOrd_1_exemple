import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wxrxbvjgpwikegxkmfnq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';

// Cliente Supabase com privilégios administrativos (Service Role)
// ATENÇÃO: NUNCA use este cliente em componentes do lado do cliente (Client Components).
// Use APENAS em rotas de API (app/api/...) ou Server Actions.
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);
