// ============================================================
// Supabase Client Initialization
// ============================================================

// Replace these with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize the Supabase client using the globally available window.supabase
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
