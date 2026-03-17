// ============================================================
// Supabase Client Initialization
// ============================================================

// Replace these with your actual Supabase Project URL and Publishable Key
const SUPABASE_URL = 'https://baptmdmjdgvkkufffxfz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_AqIteTYOyiuWHGTdlxg9yA_VetG0BmX';

// Initialize the Supabase client using the globally available window.supabase
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
