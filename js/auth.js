// ============================================================
// Auth System — Supabase Integration
// ============================================================
import { supabase } from './supabase.js';

let currentUser = null;

// Initialize session state on load
export const initAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || 'My CineVault'
    };
  }
  
  // Listen for changes (login, logout)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || 'My CineVault'
      };
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
    }
  });

  return currentUser;
};

export const getCurrentUser = () => currentUser;

export const register = async (name, email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name }
    }
  });
  if (error) throw error;
  return data;
};

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUser = null;
};

export const deleteAccount = async () => {
  // Note: Supabase restricts client-side account deletion for security reasons by default.
  // In a real app, you would call an Edge Function or your backend to delete the user.
  // For this static app, we'll log them out and inform them.
  await logout();
  alert("For security reasons, Supabase requires you to contact support or use a secure backend endpoint to fully delete your account. You have been logged out.");
};
