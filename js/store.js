// ============================================================
// User Data Store — Supabase Database Integration
// ============================================================
import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

// ---- Local State Cache --------------------------------------
// Since Supabase calls are async, we cache the lists locally
// so the UI can check isWatched() synchronously during renders.
let watchedCache = {};
let watchlistCache = {};

export const initStore = async () => {
  const user = getCurrentUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('movie_list')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching movies:', error);
    return;
  }

  watchedCache = {};
  watchlistCache = {};

  data.forEach(row => {
    const m = row.movie_data;
    m.rating = row.rating;
    if (row.status === 'watched') {
      watchedCache[row.movie_id] = m;
    } else if (row.status === 'watchlist') {
      watchlistCache[row.movie_id] = m;
    }
  });
};

export const clearCache = () => {
  watchedCache = {};
  watchlistCache = {};
};

// ---- Watched ------------------------------------------------
export const getWatched = () => watchedCache;
export const isWatched  = (id) => !!watchedCache[id];

export const addWatched = async (movie, rating = 0) => {
  const user = getCurrentUser();
  if (!user) return;
  
  // Optimistic UI update
  watchedCache[movie.id] = { ...movie, rating };
  
  await supabase.from('movie_list').upsert({
    user_id: user.id,
    movie_id: movie.id,
    status: 'watched',
    rating: rating,
    movie_data: movie
  }, { onConflict: 'user_id, movie_id' });
};

export const removeWatched = async (id) => {
  const user = getCurrentUser();
  if (!user) return;

  delete watchedCache[id];
  
  await supabase.from('movie_list').delete().match({ user_id: user.id, movie_id: id });
};

export const setRating = async (id, rating) => {
  const user = getCurrentUser();
  if (!user) return;

  if (watchedCache[id]) watchedCache[id].rating = rating;

  await supabase.from('movie_list')
    .update({ rating: rating })
    .match({ user_id: user.id, movie_id: id });
};

// ---- Watchlist ----------------------------------------------
export const getWatchlist   = () => watchlistCache;
export const isWatchlisted  = (id) => !!watchlistCache[id];

export const addWatchlist = async (movie) => {
  const user = getCurrentUser();
  if (!user) return;

  watchlistCache[movie.id] = { ...movie };
  
  await supabase.from('movie_list').upsert({
    user_id: user.id,
    movie_id: movie.id,
    status: 'watchlist',
    rating: 0,
    movie_data: movie
  }, { onConflict: 'user_id, movie_id' });
};

export const removeWatchlist = async (id) => {
  const user = getCurrentUser();
  if (!user) return;

  delete watchlistCache[id];
  
  await supabase.from('movie_list').delete().match({ user_id: user.id, movie_id: id });
};

// ---- Stats --------------------------------------------------
export const getGenreAffinity = () => {
  const watched = Object.values(watchedCache);
  const affinity = {};
  watched.forEach(m => {
    const rating = m.rating || 3;
    (m.genre_ids || []).forEach(gid => {
      affinity[gid] = (affinity[gid] || 0) + rating;
    });
  });
  return affinity;
};
