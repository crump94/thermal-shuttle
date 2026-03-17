// ============================================================
// User Data Store — localStorage persistence
// ============================================================

const NS = 'moviesdb_';

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(NS + key)) || {}; }
  catch { return {}; }
};
const save = (key, val) => localStorage.setItem(NS + key, JSON.stringify(val));

// ---- Watched ------------------------------------------------
export const getWatched = () => load('watched');
export const isWatched  = (id) => !!(load('watched')[id]);

export const addWatched = (movie, rating = 0) => {
  const w = load('watched');
  w[movie.id] = { ...movie, rating, watchedAt: Date.now() };
  save('watched', w);
};

export const removeWatched = (id) => {
  const w = load('watched');
  delete w[id];
  save('watched', w);
};

export const setRating = (id, rating) => {
  const w = load('watched');
  if (w[id]) { w[id].rating = rating; save('watched', w); }
};

// ---- Watchlist ----------------------------------------------
export const getWatchlist   = () => load('watchlist');
export const isWatchlisted  = (id) => !!(load('watchlist')[id]);

export const addWatchlist = (movie) => {
  const wl = load('watchlist');
  wl[movie.id] = { ...movie, addedAt: Date.now() };
  save('watchlist', wl);
};

export const removeWatchlist = (id) => {
  const wl = load('watchlist');
  delete wl[id];
  save('watchlist', wl);
};

// ---- Stats --------------------------------------------------
export const getGenreAffinity = () => {
  const watched = Object.values(load('watched'));
  const affinity = {};
  watched.forEach(m => {
    const rating = m.rating || 3;
    (m.genre_ids || []).forEach(gid => {
      affinity[gid] = (affinity[gid] || 0) + rating;
    });
  });
  return affinity; // { genreId: totalScore }
};
