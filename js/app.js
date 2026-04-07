/**
 * app.js — Main application logic for ФРСУ AREA Mini App
 *
 * Responsibilities:
 *  - Telegram WebApp initialisation
 *  - Tab navigation
 *  - Data loading + render orchestration
 *  - Filter chip interaction (results tab)
 */

/* ── State ─────────────────────────────────────────────── */
const state = {
  activeTab:     'results',
  resultFilter:  'all',
  resultsData:   null,
  eventsData:    null,
  aboutData:     null,
};

/* ── Telegram WebApp ────────────────────────────────────── */
function initTelegram() {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const FULLSCREEN_PAD = 108; // px — safe zone when fullscreen on mobile (status bar + TG nav)
    const FULLSIZE_PAD   = 20;  // px — when already expanded / desktop

    function setPad(px) {
      document.documentElement.style.setProperty('--app-top-pad', px + 'px');
      document.body.classList.toggle('fullscreen-active', px >= FULLSCREEN_PAD);
    }

    function isMobileClient() {
      const p = tg && typeof tg.platform === 'string' ? tg.platform.toLowerCase() : '';
      if (p.includes('android') || p.includes('ios')) return true;
      const ua = (navigator.userAgent || '').toLowerCase();
      return /iphone|ipad|ipod|android/.test(ua);
    }

    function isFullsizeNow() {
      if (!isMobileClient()) return true;
      const ih = window.innerHeight || 0;
      const sh = window.screen?.availHeight || window.screen?.height || 0;
      if (!ih || !sh) return false;
      return (sh - ih) >= 80;
    }

    function applyByState() {
      if (!isMobileClient()) {
        setPad(FULLSIZE_PAD);
        return;
      }
      if (typeof tg.isFullscreen === 'boolean') {
        setPad(tg.isFullscreen ? FULLSCREEN_PAD : FULLSIZE_PAD);
        return;
      }
      setPad(isFullsizeNow() ? FULLSIZE_PAD : FULLSCREEN_PAD);
    }

    function tryFullscreen() {
      if (!tg || !isMobileClient()) return;
      if (!isFullsizeNow()) return;
      try {
        if (typeof tg.requestFullscreen === 'function') {
          tg.requestFullscreen();
        } else if (typeof tg.expand === 'function') {
          tg.expand();
        }
      } catch (e) {}
    }

    // Disable vertical swipes — prevents accidental app close
    try {
      if (typeof tg.disableVerticalSwipes === 'function') {
        tg.disableVerticalSwipes();
      }
    } catch (e) {}

    // Header colour
    try {
      if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#002D6E');
      if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#EFF3FB');
    } catch (e) {}

    // Apply padding immediately based on current state
    applyByState();

    // Try fullscreen on mobile
    if (isMobileClient()) tryFullscreen();

    // Also try on first user interaction (TG sometimes needs gesture)
    let triedOnInteraction = false;
    function tryOnce() {
      if (triedOnInteraction) return;
      triedOnInteraction = true;
      tryFullscreen();
    }
    ['touchstart', 'click'].forEach(evt =>
      document.addEventListener(evt, tryOnce, { once: true, passive: true })
    );

    // Keep viewport height in sync
    const updateViewport = () => {
      const vh = tg.viewportStableHeight || window.innerHeight;
      document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
      document.documentElement.style.setProperty('--tg-viewport-stable-height', `${vh}px`);
      applyByState();
    };

    updateViewport();
    tg.onEvent('viewportChanged', updateViewport);

    // Double expand — TG sometimes ignores the first call
    try { tg.expand(); } catch (e) {}
    setTimeout(() => { try { tg.expand(); } catch (e) {} }, 120);

    console.log('[FSFU] Telegram WebApp initialized');
  } catch (e) {
    console.warn('[FSFU] Telegram not available:', e);
  }
}

/* ── Tab navigation ─────────────────────────────────────── */
function initTabs() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabSections = document.querySelectorAll('.tab');
  const main = document.getElementById('main');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      if (tabId === state.activeTab) return;

      // Update nav buttons
      navBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
        b.setAttribute('aria-selected', b.dataset.tab === tabId ? 'true' : 'false');
      });

      // Swap sections
      tabSections.forEach(s => {
        s.classList.toggle('active', s.id === `tab-${tabId}`);
      });

      // Scroll to top
      if (main) main.scrollTop = 0;

      state.activeTab = tabId;

      // Lazy-load tab content if not yet loaded
      loadTabContent(tabId);
    });
  });
}

/* ── Filter chips (results tab) ─────────────────────────── */
function initFilters() {
  const chips = document.querySelectorAll('#result-chips .chip');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      state.resultFilter = chip.dataset.filter;

      if (state.resultsData) {
        renderResults(state.resultsData, state.resultFilter);
      }
    });
  });
}

/* ── Data loading ────────────────────────────────────────── */
async function loadTabContent(tabId) {
  if (tabId === 'results' && !state.resultsData) {
    showSkeleton('results-list', 2);
    try {
      state.resultsData = await fetchResults();
      renderResults(state.resultsData, state.resultFilter);
    } catch (err) {
      console.error('Failed to load results:', err);
      document.getElementById('results-list').innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Не вдалося завантажити результати</p></div>';
    }
  }

  if (tabId === 'calendar' && !state.eventsData) {
    showSkeleton('calendar-list', 3);
    try {
      state.eventsData = await fetchEvents();
      renderCalendar(state.eventsData);
    } catch (err) {
      console.error('Failed to load events:', err);
      document.getElementById('calendar-list').innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Не вдалося завантажити календар</p></div>';
    }
  }

  if (tabId === 'about' && !state.aboutData) {
    try {
      state.aboutData = await fetchAbout();
      renderAbout(state.aboutData);
    } catch (err) {
      console.error('Failed to load about:', err);
    }
  }
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  initTabs();
  initFilters();

  // Load the default (first) tab immediately
  loadTabContent(state.activeTab);
});
