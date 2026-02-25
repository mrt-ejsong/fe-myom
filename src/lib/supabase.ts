import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] Missing environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[SUPABASE] Client initialized with URL:', supabaseUrl?.substring(0, 30) + '...');
