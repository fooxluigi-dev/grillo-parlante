import { createClient } from '@supabase/supabase-js';

// Use EXPO_PUBLIC_ env vars (Expo SDK 57 exposes these to client)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yfjlcdvntjtukuakhtzs.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbG...jkLE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
