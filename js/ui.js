// ============================================================
// UI Helpers
// ============================================================

import { IMG_BASE } from './api.js';
import { isWatched, isWatchlisted } from './store.js';

// ---- Movie Card --------------------------------------------
export const renderMovieCard = (movie, { onClick } = {}) => {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = movie.id;

  const poster = movie.poster_path
    ? `${IMG_BASE}${movie.poster_path}`
    : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect fill="%231a1a2e" width="300" height="450"/><text fill="%234a4a6a" font-size="48" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle">🎬</text></svg>';

  const year   = movie.release_date ? movie.release_date.slice(0, 4) : '—';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '—';
  const watched = isWatched(movie.id);
  const wl      = isWatchlisted(movie.id);

  card.innerHTML = `
    <div class="card-poster-wrap">
      <img class="card-poster" src="${poster}" alt="${escHtml(movie.title)}" loading="lazy" />
      <div class="card-overlay">
        <button class="icon-btn btn-watchlist ${wl ? 'active' : ''}" data-id="${movie.id}" title="${wl ? 'Remove from Watchlist' : 'Add to Watchlist'}">
          ${wl ? icons.bookmarkFilled : icons.bookmarkEmpty}
        </button>
        <button class="icon-btn btn-watched ${watched ? 'active' : ''}" data-id="${movie.id}" title="${watched ? 'Watched' : 'Mark as Watched'}">
          ${watched ? icons.eyeFilled : icons.eyeEmpty}
        </button>
      </div>
      <div class="card-rating">⭐ ${rating}</div>
    </div>
    <div class="card-info">
      <p class="card-title">${escHtml(movie.title)}</p>
      <p class="card-year">${year}</p>
    </div>
  `;

  card.querySelector('.card-poster-wrap').addEventListener('click', (e) => {
    if (e.target.closest('.icon-btn')) return;
    if (onClick) onClick(movie);
  });

  return card;
};

// ---- Skeleton Cards ----------------------------------------
export const renderSkeletons = (n, container) => {
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const sk = document.createElement('div');
    sk.className = 'movie-card skeleton';
    sk.innerHTML = `<div class="sk-poster"></div><div class="sk-title"></div><div class="sk-year"></div>`;
    container.appendChild(sk);
  }
};

// ---- Star Rating Widget ------------------------------------
export const renderStars = (container, currentRating = 0, onChange = null) => {
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('button');
    s.className = `star${i <= currentRating ? ' filled' : ''}`;
    s.dataset.value = i;
    s.innerHTML = i <= currentRating ? '★' : '☆';
    s.setAttribute('aria-label', `Rate ${i} stars`);
    if (onChange) {
      s.addEventListener('click', () => onChange(i));
      s.addEventListener('mouseenter', () => highlightStars(container, i));
      container.addEventListener('mouseleave', () => highlightStars(container, currentRating));
    }
    container.appendChild(s);
  }
};

const highlightStars = (container, n) => {
  container.querySelectorAll('.star').forEach((s, idx) => {
    s.innerHTML  = idx < n ? '★' : '☆';
    s.classList.toggle('filled', idx < n);
  });
};

// ---- Toast -------------------------------------------------
let toastTimer;
export const showToast = (msg, type = 'info') => {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ---- Misc --------------------------------------------------
export const escHtml = (str = '') => str.replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const icons = {
  bookmarkEmpty:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  bookmarkFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  eyeEmpty:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeFilled:      `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`,
  search:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  user:           `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  home:           `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  close:          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  play:           `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  trash:          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  star:           `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  chevronRight:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
};
