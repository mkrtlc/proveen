
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Automatically refresh the session
    autoRefreshToken: true,
    // Persist the session in localStorage
    persistSession: true,
    // Detect session from URL hash (for email confirmation callbacks)
    detectSessionInUrl: true,
    // Flow type - use PKCE for better security
    flowType: 'pkce',
  },
});
