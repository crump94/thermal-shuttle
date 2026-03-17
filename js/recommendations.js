// ============================================================
// Recommendation Engine
// ============================================================

import { getGenreAffinity, getWatched } from './store.js';
import { discoverMovies } from './api.js';

export const getRecommendations = async () => {
  const affinity = getGenreAffinity();
  const watched  = Object.keys(getWatched()).map(Number);

  if (Object.keys(affinity).length === 0) {
    // No history — return popular movies
    const res = await discoverMovies({ sort_by: 'popularity.desc' });
    return res.results.filter(m => !watched.includes(m.id)).slice(0, 20);
  }

  // Sort genres by affinity score, take top 3
  const topGenres = Object.entries(affinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const res = await discoverMovies({
    with_genres: topGenres.join(','),
    sort_by: 'vote_average.desc',
    'vote_count.gte': 100,
  });

  return res.results.filter(m => !watched.includes(m.id)).slice(0, 20);
};
