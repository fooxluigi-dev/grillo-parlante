import { createClient } from '@supabase/supabase-js';

// Use EXPO_PUBLIC_ env vars (Expo SDK 57 exposes these to client)
// NOTE: NO hardcoded fallback key — if the env var is missing the app fails
// loudly at startup instead of silently shipping an invalid key
// (which produced "Invalid API key" on every login).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yfjlcdvntjtukuakhtzs.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error(
    '[Grillo] EXPO_PUBLIC_SUPABASE_ANON_KEY non configurata: imposta la variabile ' +
    'nel file .env o nelle env del progetto Vercel prima di compilare.'
  );
}

// Capture the very first URL BEFORE the client is constructed: supabase-js
// strips #access_token/type=recovery tokens from the URL during client
// initialization, so any later read (useEffect) misses the recovery flag.
export const INITIAL_URL =
  typeof window !== 'undefined' && window.location ? window.location.href : '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
