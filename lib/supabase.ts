import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wxrxbvjgpwikegxkmfnq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cnhidmpncHdpa2VneGttZm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDA0MTgsImV4cCI6MjA5MDExNjQxOH0.W7OpQnw08Vmrxr_AbWuPM3HDtIdsWnX-IyUhIYd2nFA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
