import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';

let cachedClient = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  cachedClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

export function isSupabaseAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
