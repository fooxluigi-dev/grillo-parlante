import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yfjlcdvntjtukuakhtzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmamxjZHZudGp0dWt1YWtodHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDQxOTIsImV4cCI6MjEwMDQ4MDE5Mn0.dJrhz9fhMSHIKGlk4vCZOGe0NFzxBU0toDZfEFnjkLE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
