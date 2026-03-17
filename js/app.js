// ============================================================
// Main App Controller
// ============================================================

import * as API  from './api.js';
import * as Store from './store.js';
import * as Auth from './auth.js';
import { renderMovieCard, renderSkeletons, renderStars, showToast, icons, escHtml } from './ui.js';
import { getRecommendations } from './recommendations.js';

// ---- State -------------------------------------------------
let currentView  = 'home';
let searchDebounce;
let modalMovie   = null;
const movieCache = new Map(); // id → movie object

// ---- DOM refs ----------------------------------------------
const views       = () => document.querySelectorAll('.view');
const $            = (sel, ctx = document) => ctx.querySelector(sel);
const $$           = (sel, ctx = document) => ctx.querySelectorAll(sel);

// ============================================================
// Boot
// ============================================================
export const init = async () => {
  setupNav();
  setupSearch();
  setupModal();
  setupGlobalCardHandlers();
  setupAuth();
  
  await Auth.initAuth();
  await Store.initStore();

  if (Auth.getCurrentUser()) {
    navigateTo('home');
  } else {
    navigateTo('auth');
  }
};

const setupAuth = () => {
  const form = document.getElementById('auth-form');
  const switchLink = document.getElementById('auth-switch-link');
  const switchText = document.getElementById('auth-switch-text');
  const nameGroup = document.getElementById('auth-name-group');
  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  let isLogin = true;

  if (switchLink) {
    switchLink.addEventListener('click', (e) => {
      e.preventDefault();
      isLogin = !isLogin;
      title.textContent = isLogin ? 'Sign In' : 'Create Account';
      switchText.textContent = isLogin ? "Don't have an account?" : "Already have an account?";
      switchLink.textContent = isLogin ? 'Sign Up' : 'Sign In';
      submitBtn.textContent = isLogin ? 'Sign In' : 'Create Account';
      nameGroup.style.display = isLogin ? 'none' : 'block';
      if (!isLogin) document.getElementById('auth-name').setAttribute('required', 'true');
      else document.getElementById('auth-name').removeAttribute('required');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const pass = document.getElementById('auth-password').value;
      
      const oldBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Loading...';
      submitBtn.disabled = true;

      try {
        if (isLogin) {
          await Auth.login(email, pass);
          await Store.initStore();
          showToast('Welcome back!', 'success');
        } else {
          const name = document.getElementById('auth-name').value.trim();
          await Auth.register(name, email, pass);
          await Store.initStore();
          showToast('Account created successfully!', 'success');
        }
        form.reset();
        navigateTo('home');
      } catch (err) {
        showToast(err.message || 'Authentication failed.', 'error');
      } finally {
        submitBtn.textContent = oldBtnText;
        submitBtn.disabled = false;
      }
    });
  }
};

// ============================================================
// Navigation
// ============================================================
const navigateTo = (view, params = {}) => {
  if (view !== 'auth' && !Auth.getCurrentUser()) {
    view = 'auth';
  }

  currentView = view;
  views().forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add('active');

  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.style.display = view === 'auth' ? 'none' : 'flex';

  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));

  if (view === 'home')    renderHome();
  if (view === 'search')  renderSearch(params.q || '');
  if (view === 'profile') renderProfile();
};

const setupNav = () => {
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.view);
    });
  });
};

// ============================================================
// Home View
// ============================================================
const renderHome = async () => {
  const trendingGrid  = $('#trending-grid');
  const nowGrid       = $('#now-playing-grid');
  const heroSection   = $('#hero-section');

  renderSkeletons(8, trendingGrid);
  renderSkeletons(8, nowGrid);

  try {
    const [trending, nowPlaying, upcoming] = await Promise.all([
      API.getTrending('week'),
      API.getNowPlaying(),
      API.getUpcoming(),
    ]);

    // Hero banner — top trending movie
    const hero = trending.results[0];
    if (hero && heroSection) renderHero(hero, heroSection);

    trending.results.forEach(m => movieCache.set(m.id, m));
    nowPlaying.results.forEach(m => movieCache.set(m.id, m));
    upcoming.results.forEach(m => movieCache.set(m.id, m));

    fillGrid(trendingGrid, trending.results.slice(1, 13));
    fillGrid(nowGrid, nowPlaying.results.slice(0, 12));

    // Upcoming section
    const upcomingGrid = $('#upcoming-grid');
    if (upcomingGrid) fillGrid(upcomingGrid, upcoming.results.slice(0, 8));

  } catch (err) {
    console.error(err);
    showToast('Could not load movies — check your connection.', 'error');
  }
};

const renderHero = (movie, container) => {
  const backdrop = movie.backdrop_path
    ? `${API.IMG_ORIG}${movie.backdrop_path}`
    : '';
  const year = movie.release_date?.slice(0, 4) || '';
  const rating = movie.vote_average?.toFixed(1) || '';

  container.innerHTML = `
    <div class="hero-backdrop" style="background-image:url('${backdrop}')"></div>
    <div class="hero-content">
      <div class="hero-badges">
        <span class="badge badge-trending">🔥 Trending</span>
        <span class="badge badge-rating">⭐ ${rating}</span>
        <span class="badge badge-year">${year}</span>
      </div>
      <h1 class="hero-title">${escHtml(movie.title)}</h1>
      <p class="hero-overview">${escHtml((movie.overview || '').slice(0, 200))}${movie.overview?.length > 200 ? '…' : ''}</p>
      <div class="hero-actions">
        <button class="btn btn-primary hero-details-btn" data-id="${movie.id}">
          ${icons.play} View Details
        </button>
        <button class="btn btn-ghost hero-wl-btn ${Store.isWatchlisted(movie.id) ? 'active' : ''}" data-id="${movie.id}">
          ${Store.isWatchlisted(movie.id) ? icons.bookmarkFilled : icons.bookmarkEmpty}
          ${Store.isWatchlisted(movie.id) ? 'In Watchlist' : 'Add to Watchlist'}
        </button>
      </div>
    </div>
  `;

  container.querySelector('.hero-details-btn').addEventListener('click', () => openModal(movie.id));
  container.querySelector('.hero-wl-btn').addEventListener('click', () => toggleWatchlist(movie, container.querySelector('.hero-wl-btn')));
};

// ============================================================
// Search View
// ============================================================
const setupSearch = () => {
  const input = $('#search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      const q = input.value.trim();
      if (currentView !== 'search') navigateTo('search', { q });
      else doSearch(q);
    }, 350);
  });

  // Top-bar search icon
  const topInput = $('#topbar-search');
  if (topInput) {
    topInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(async () => {
        const q = topInput.value.trim();
        navigateTo('search', { q });
      }, 350);
    });
    topInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') navigateTo('search', { q: topInput.value.trim() });
    });
  }
};

const renderSearch = (q = '') => {
  const input = $('#search-input');
  if (input && q) input.value = q;
  const topInput = $('#topbar-search');
  if (topInput && q) topInput.value = q;

  if (q) doSearch(q);
  else loadPopularSearch();
};

const doSearch = async (q) => {
  const grid = $('#search-grid');
  const heading = $('#search-heading');
  if (!grid) return;
  if (!q) { loadPopularSearch(); return; }
  if (heading) heading.textContent = `Results for "${q}"`;

  renderSkeletons(12, grid);
  try {
    const res = await API.searchMovies(q);
    grid.innerHTML = '';
    if (!res.results.length) {
      grid.innerHTML = '<p class="empty-msg">No movies found. Try a different search.</p>';
      return;
    }
    res.results.forEach(m => { movieCache.set(m.id, m); grid.appendChild(renderMovieCard(m, { onClick: () => openModal(m.id) })); });
  } catch { showToast('Search failed.', 'error'); }
};

const loadPopularSearch = async () => {
  const grid = $('#search-grid');
  const heading = $('#search-heading');
  if (!grid) return;
  if (heading) heading.textContent = 'Popular Right Now';
  renderSkeletons(12, grid);
  try {
    const res = await API.getPopular();
    grid.innerHTML = '';
    res.results.forEach(m => { movieCache.set(m.id, m); grid.appendChild(renderMovieCard(m, { onClick: () => openModal(m.id) })); });
  } catch { showToast('Could not load movies.', 'error'); }
};

// ============================================================
// Profile View
// ============================================================
const renderProfile = async () => {
  const watchedGrid = $('#watched-grid');
  const watchlistGrid = $('#watchlist-grid');
  const recsGrid = $('#recs-grid');

  const user = Auth.getCurrentUser();
  if (user) {
    const nameDisplay = $('#profile-name-display');
    const emailDisplay = $('#profile-email-display');
    if (nameDisplay) nameDisplay.textContent = user.name || 'My CineVault';
    if (emailDisplay) {
      const parts = user.email.split('@');
      const hiddenEmail = parts[0].charAt(0) + '*'.repeat(parts[0].length - 1) + '@' + parts[1];
      emailDisplay.textContent = hiddenEmail;
    }
  }

  // Bind Actions
  $('#btn-logout').onclick = async () => {
    Store.clearCache();
    await Auth.logout();
    navigateTo('auth');
    showToast('Logged out successfully.');
  };
  $('#btn-delete-account').onclick = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      Store.clearCache();
      await Auth.deleteAccount();
      navigateTo('auth');
      showToast('Account deleted.');
    }
  };

  // Counts
  const watched   = Object.values(Store.getWatched());
  const watchlist = Object.values(Store.getWatchlist());

  $('#profile-watched-count')?.textContent != null && ($('#profile-watched-count').textContent = watched.length);
  $('#profile-wl-count')?.textContent != null && ($('#profile-wl-count').textContent = watchlist.length);
  $('#profile-rating-avg')?.textContent != null && (() => {
    const rated = watched.filter(m => m.rating > 0);
    const avg   = rated.length ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1) : '—';
    $('#profile-rating-avg').textContent = avg;
  })();

  // Watched tab
  if (watchedGrid) {
    watchedGrid.innerHTML = '';
    if (!watched.length) {
      watchedGrid.innerHTML = '<p class="empty-msg">You haven\'t marked any movies as watched yet.</p>';
    } else {
      watched.sort((a, b) => b.watchedAt - a.watchedAt).forEach(m => {
        const card = renderMovieCard(m, { onClick: () => openModal(m.id) });
        card.classList.add('with-user-rating');
        // Attach star display under card
        const starWrap = document.createElement('div');
        starWrap.className = 'user-rating-stars';
        renderStars(starWrap, m.rating, (newRating) => {
          Store.setRating(m.id, newRating);
          renderProfile();
          showToast(`Rated "${m.title}" ${newRating} star${newRating !== 1 ? 's' : ''}!`);
        });
        card.appendChild(starWrap);
        watchedGrid.appendChild(card);
      });
    }
  }

  // Watchlist tab
  if (watchlistGrid) {
    watchlistGrid.innerHTML = '';
    if (!watchlist.length) {
      watchlistGrid.innerHTML = '<p class="empty-msg">Your watchlist is empty. Browse movies and save them!</p>';
    } else {
      watchlist.sort((a, b) => b.addedAt - a.addedAt).forEach(m =>
        watchlistGrid.appendChild(renderMovieCard(m, { onClick: () => openModal(m.id) }))
      );
    }
  }

  // Recommendations tab
  if (recsGrid) {
    renderSkeletons(8, recsGrid);
    try {
      const recs = await getRecommendations();
      recsGrid.innerHTML = '';
      if (!recs.length) {
        recsGrid.innerHTML = '<p class="empty-msg">Rate some movies to get personalised recommendations!</p>';
      } else {
        recs.forEach(m => recsGrid.appendChild(renderMovieCard(m, { onClick: () => openModal(m.id) })));
      }
    } catch { recsGrid.innerHTML = '<p class="empty-msg">Could not load recommendations.</p>'; }
  }

  // Tab switching
  $$('.profile-tab').forEach(tab => {
    tab.onclick = () => {
      $$('.profile-tab').forEach(t => t.classList.remove('active'));
      $$('.profile-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(`panel-${tab.dataset.tab}`);
      if (panel) panel.classList.add('active');
    };
  });
};

// ============================================================
// Movie Detail Modal
// ============================================================
const setupModal = () => {
  const modal   = $('#movie-modal');
  const overlay = $('#modal-overlay');
  if (!modal) return;

  overlay?.addEventListener('click', closeModal);
  $('#modal-close')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
};

export const openModal = async (id) => {
  const modal = $('#movie-modal');
  const body  = $('#modal-body');
  if (!modal || !body) return;

  body.innerHTML = `<div class="modal-loading">${renderSpinner()}</div>`;
  modal.classList.add('open');
  document.getElementById('modal-overlay')?.classList.add('open');
  document.body.classList.add('modal-open');

  try {
    const [details, credits] = await Promise.all([
      API.getMovieDetails(id),
      API.getMovieCredits(id),
    ]);
    modalMovie = details;
    renderModalContent(details, credits, body);
  } catch (err) {
    body.innerHTML = '<p class="empty-msg">Could not load movie details.</p>';
    console.error(err);
  }
};

const closeModal = () => {
  document.getElementById('movie-modal')?.classList.remove('open');
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.body.classList.remove('modal-open');
  modalMovie = null;
};

const renderModalContent = (movie, credits, container) => {
  const watched   = Store.isWatched(movie.id);
  const wl        = Store.isWatchlisted(movie.id);
  const userRating = watched ? (Store.getWatched()[movie.id]?.rating || 0) : 0;

  const backdrop = movie.backdrop_path
    ? `${API.IMG_ORIG}${movie.backdrop_path}`
    : (movie.poster_path ? `${API.IMG_BASE}${movie.poster_path}` : '');

  const poster = movie.poster_path
    ? `${API.IMG_BASE}${movie.poster_path}`
    : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect fill="%231a1a2e" width="300" height="450"/><text fill="%234a4a6a" font-size="60" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle">🎬</text></svg>';

  const genres = (movie.genres || []).map(g => `<span class="genre-chip">${g.name}</span>`).join('');
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '';
  const year    = movie.release_date?.slice(0, 4) || '';
  const rating  = movie.vote_average?.toFixed(1) || '';
  const cast    = (credits.cast || []).slice(0, 8).map(c => `
    <div class="cast-card">
      <img src="${c.profile_path ? API.IMG_SMALL + c.profile_path : 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 80 80\'><rect fill=\'%231e1e3a\' width=\'80\' height=\'80\' rx=\'40\'/><text fill=\'%236b6baa\' font-size=\'32\' x=\'50%25\' y=\'55%25\' text-anchor=\'middle\' dominant-baseline=\'middle\'>👤</text></svg>'}" alt="${escHtml(c.name)}" loading="lazy"/>
      <p class="cast-name">${escHtml(c.name)}</p>
      <p class="cast-char">${escHtml(c.character || '')}</p>
    </div>`).join('');

  // Find a YouTube trailer
  const trailer = (movie.videos?.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');

  container.innerHTML = `
    <div class="modal-backdrop" style="background-image:url('${backdrop}')"></div>
    <div class="modal-inner">
      <div class="modal-top">
        <div class="modal-poster-wrap">
          <img src="${poster}" alt="${escHtml(movie.title)}" class="modal-poster"/>
        </div>
        <div class="modal-meta">
          <div class="modal-chips">${genres}</div>
          <h2 class="modal-title">${escHtml(movie.title)}</h2>
          ${movie.tagline ? `<p class="modal-tagline">"${escHtml(movie.tagline)}"</p>` : ''}
          <div class="modal-stats">
            ${rating ? `<span class="stat">⭐ ${rating}/10</span>` : ''}
            ${year ? `<span class="stat">📅 ${year}</span>` : ''}
            ${runtime ? `<span class="stat">⏱ ${runtime}</span>` : ''}
            ${movie.vote_count ? `<span class="stat">🗳 ${movie.vote_count.toLocaleString()} votes</span>` : ''}
          </div>
          <p class="modal-overview">${escHtml(movie.overview || '')}</p>
          <div class="modal-actions">
            <button class="btn btn-primary modal-watched-btn ${watched ? 'active' : ''}" id="modal-watched-btn">
              ${watched ? icons.eyeFilled : icons.eyeEmpty}
              ${watched ? 'Watched' : 'Mark as Watched'}
            </button>
            <button class="btn btn-ghost modal-wl-btn ${wl ? 'active' : ''}" id="modal-wl-btn">
              ${wl ? icons.bookmarkFilled : icons.bookmarkEmpty}
              ${wl ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
            ${trailer ? `<a class="btn btn-outline" href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" rel="noopener">${icons.play} Watch Trailer</a>` : ''}
          </div>
          <div class="modal-rating-wrap ${watched ? '' : 'hidden'}">
            <p class="rating-label">Your Rating</p>
            <div class="star-row" id="modal-stars"></div>
          </div>
        </div>
      </div>
      ${cast ? `<div class="modal-cast"><h3>Top Cast</h3><div class="cast-grid">${cast}</div></div>` : ''}
    </div>
  `;

  // Stars
  const starsEl = container.querySelector('#modal-stars');
  if (starsEl) {
    const onStarChange = (r) => {
      Store.setRating(movie.id, r);
      renderStars(starsEl, r, onStarChange);
      showToast(`Rated "${movie.title}" ${r} star${r !== 1 ? 's' : ''}!`);
    };
    renderStars(starsEl, userRating, onStarChange);
  }

  // Watched button
  container.querySelector('#modal-watched-btn')?.addEventListener('click', () => {
    toggleWatchedModal(movie, container);
  });

  // Watchlist button
  container.querySelector('#modal-wl-btn')?.addEventListener('click', () => {
    const btn = container.querySelector('#modal-wl-btn');
    toggleWatchlist(movie, btn);
  });
};

const renderSpinner = () => `<div class="spinner"></div>`;

// ============================================================
// Watched / Watchlist toggles
// ============================================================
const toggleWatchedModal = (movie, container) => {
  const btn       = container.querySelector('#modal-watched-btn');
  const ratingWrap = container.querySelector('.modal-rating-wrap');
  const starsEl   = container.querySelector('#modal-stars');

  if (Store.isWatched(movie.id)) {
    Store.removeWatched(movie.id);
    btn.innerHTML = `${icons.eyeEmpty} Mark as Watched`;
    btn.classList.remove('active');
    ratingWrap?.classList.add('hidden');
    showToast(`Removed "${movie.title}" from watched.`);
  } else {
    Store.addWatched(movie, 0);
    btn.innerHTML = `${icons.eyeFilled} Watched`;
    btn.classList.add('active');
    ratingWrap?.classList.remove('hidden');
    if (starsEl) renderStars(starsEl, 0, (r) => {
      Store.setRating(movie.id, r);
      renderStars(starsEl, r, () => {});
      showToast(`Rated "${movie.title}" ${r} star${r !== 1 ? 's' : ''}!`);
    });
    showToast(`"${movie.title}" added to watched! Rate it below.`);
    // Remove from watchlist if it was there
    if (Store.isWatchlisted(movie.id)) {
      Store.removeWatchlist(movie.id);
      const wlBtn = container.querySelector('#modal-wl-btn');
      if (wlBtn) { wlBtn.innerHTML = `${icons.bookmarkEmpty} Add to Watchlist`; wlBtn.classList.remove('active'); }
    }
  }

  // Refresh cards in background
  refreshVisibleCards(movie.id);
};

export const toggleWatchlist = (movie, btn) => {
  if (Store.isWatchlisted(movie.id)) {
    Store.removeWatchlist(movie.id);
    if (btn) { btn.innerHTML = `${icons.bookmarkEmpty} Add to Watchlist`; btn.classList.remove('active'); btn.title = 'Add to Watchlist'; }
    showToast(`Removed "${movie.title}" from watchlist.`);
  } else {
    Store.addWatchlist(movie);
    if (btn) { btn.innerHTML = `${icons.bookmarkFilled} In Watchlist`; btn.classList.add('active'); btn.title = 'Remove from Watchlist'; }
    showToast(`"${movie.title}" added to watchlist!`);
  }
  refreshVisibleCards(movie.id);
};

const refreshVisibleCards = (movieId) => {
  $$(`[data-id="${movieId}"]`).forEach(card => {
    const wlBtn = card.querySelector('.btn-watchlist');
    const eyeBtn = card.querySelector('.btn-watched');
    if (wlBtn) {
      const wl = Store.isWatchlisted(movieId);
      wlBtn.innerHTML = wl ? icons.bookmarkFilled : icons.bookmarkEmpty;
      wlBtn.classList.toggle('active', wl);
    }
    if (eyeBtn) {
      const w = Store.isWatched(movieId);
      eyeBtn.innerHTML = w ? icons.eyeFilled : icons.eyeEmpty;
      eyeBtn.classList.toggle('active', w);
    }
  });
};

// ============================================================
// Global card button handler (event delegation)
// ============================================================
const setupGlobalCardHandlers = () => {
  document.addEventListener('click', async (e) => {
    const wlBtn = e.target.closest('.btn-watchlist');
    const eyeBtn = e.target.closest('.btn-watched');
    if (!wlBtn && !eyeBtn) return;

    const id = parseInt(wlBtn?.dataset.id || eyeBtn?.dataset.id);
    if (!id) return;
    e.stopPropagation();

    if (wlBtn) {
      // Need movie object — get from cache or search DOM context
      const cached = getMovieFromCache(id);
      if (cached) toggleWatchlist(cached, wlBtn);
    }
    if (eyeBtn) {
      const cached = getMovieFromCache(id);
      if (!cached) return;
      if (Store.isWatched(id)) {
        Store.removeWatched(id);
        showToast(`Removed "${cached.title}" from watched.`);
      } else {
        Store.addWatched(cached, 0);
        showToast(`"${cached.title}" marked as watched!`);
        if (Store.isWatchlisted(id)) Store.removeWatchlist(id);
      }
      refreshVisibleCards(id);
    }
  });
};

// Movie cache lookup
const getMovieFromCache = (id) => {
  if (movieCache.has(id)) return movieCache.get(id);
  const inWatched   = Store.getWatched()[id];
  const inWatchlist = Store.getWatchlist()[id];
  return inWatched || inWatchlist || null;
};

// ============================================================
// Grid fill helper
// ============================================================
const fillGrid = (grid, movies) => {
  grid.innerHTML = '';
  movies.forEach(m => {
    movieCache.set(m.id, m);
    const card = renderMovieCard(m, { onClick: () => openModal(m.id) });
    grid.appendChild(card);
  });
};
