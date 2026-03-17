// ============================================================
// TMDB API Wrapper
// ============================================================

const API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const BASE    = 'https://api.themoviedb.org/3';
export const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';
export const IMG_ORIG  = 'https://image.tmdb.org/t/p/original';
export const IMG_SMALL = 'https://image.tmdb.org/t/p/w200';

const get = async (path, params = {}) => {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
};

export const getNowPlaying  = (page = 1) => get('/movie/now_playing', { page });
export const getTrending    = (window = 'week') => get(`/trending/movie/${window}`);
export const getPopular     = (page = 1) => get('/movie/popular', { page });
export const getTopRated    = (page = 1) => get('/movie/top_rated', { page });
export const getUpcoming    = (page = 1) => get('/movie/upcoming', { page });
export const searchMovies   = (query, page = 1) => get('/search/movie', { query, page, include_adult: false });
export const getMovieDetails = (id) => get(`/movie/${id}`, { append_to_response: 'videos,images' });
export const getMovieCredits = (id) => get(`/movie/${id}/credits`);
export const getSimilar     = (id, page = 1) => get(`/movie/${id}/similar`, { page });
export const getGenres      = () => get('/genre/movie/list');
export const discoverMovies = (params = {}) => get('/discover/movie', { sort_by: 'popularity.desc', ...params });
