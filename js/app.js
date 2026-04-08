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
  allConfig:     null,   // all items from config (results + details)
  resultsData:   null,   // items with page_id=results + loaded result
  eventsData:    null,
  aboutData:     null,
  detailPage:    null,   // currently open detail overlay
};

/* ── Telegram WebApp ────────────────────────────────────── */
function initTelegram() {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const FULLSCREEN_PAD = 92; // px — safe zone for TG fullscreen on mobile

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
      // Web/desktop — no padding needed, nav bar handles spacing
      if (!isMobileClient()) {
        setPad(0);
        return;
      }
      if (typeof tg.isFullscreen === 'boolean') {
        setPad(tg.isFullscreen ? FULLSCREEN_PAD : 0);
        return;
      }
      setPad(isFullsizeNow() ? 0 : FULLSCREEN_PAD);
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
    // Touch press micro-interaction for mobile
    btn.addEventListener('touchstart', () => {
      btn.classList.add('pressing');
    }, { passive: true });

    btn.addEventListener('touchend', () => {
      setTimeout(() => btn.classList.remove('pressing'), 150);
    }, { passive: true });

    btn.addEventListener('touchcancel', () => {
      btn.classList.remove('pressing');
    }, { passive: true });

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

/* ── Data loading ────────────────────────────────────────── */
async function loadTabContent(tabId) {

  if (tabId === 'results' && !state.resultsData) {
    showSkeleton('results-list', 2);
    try {
      const config = await fetchConfig();
      state.allConfig = config;

      // Load results-page cards
      const resultsItems = config.filter(c => (c.pageId || 'results') === 'results');
      const withRows = await Promise.all(
        resultsItems.map(async item => {
          const result = await fetchResults(item);
          return { ...item, result };
        })
      );
      state.resultsData = withRows;

      renderFilterChips(state.resultsData, state.resultFilter, (newFilter) => {
        state.resultFilter = newFilter;
        renderResults(state.resultsData, state.resultFilter);
        initDetailButtons(state.resultsData, openDetailPageById);
      });

      renderResults(state.resultsData, state.resultFilter);
      initDetailButtons(state.resultsData, openDetailPageById);
    } catch (err) {
      console.error('[App] Failed to load results:', err);
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
      console.error('[App] Failed to load events:', err);
      document.getElementById('calendar-list').innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Не вдалося завантажити календар</p></div>';
    }
  }

  if (tabId === 'about' && !state.aboutData) {
    try {
      state.aboutData = await fetchAbout();
      renderAbout(state.aboutData);
    } catch (err) {
      console.error('[App] Failed to load about:', err);
    }
  }
}

/* ── Detail page ─────────────────────────────────────────── */
async function openDetailPageById(parentItem) {
  const parentId = parentItem.id;

  // Find detail items for this parent from config
  const allConfig = state.allConfig || await fetchConfig();
  const detailConfigs = allConfig.filter(c =>
    (c.pageId === 'details') && c.parentId === parentId
  );

  // Open the overlay immediately with loading state
  const overlay = openDetailOverlay(parentItem, detailConfigs, null);

  // Load all detail tables
  try {
    const withRows = await Promise.all(
      detailConfigs.map(async item => {
        const result = await fetchResults(item);
        return { ...item, result };
      })
    );
    // Render content into the already-open overlay
    renderDetailContent(overlay, parentItem, withRows);
  } catch (err) {
    console.error('[App] Failed to load detail results:', err);
  }
}

/* ── Refresh button ─────────────────────────────────────── */
function initRefreshButton() {
  const btn = document.getElementById('refreshBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      state.resultsData = null;
      state.eventsData  = null;
      state.aboutData   = null;
      state.allConfig   = null;
      await loadTabContent(state.activeTab);
    } finally {
      setTimeout(() => { btn.disabled = false; }, 600);
    }
  });
}


/* ── Row highlight (click to select) ───────────────────── */
function initRowHighlight() {
  document.getElementById('results-list')?.addEventListener('click', e => {
    const row = e.target.closest('tbody tr');
    if (!row) return;

    const tbody = row.closest('tbody');
    const wasActive = row.classList.contains('active');

    // Deselect all rows in this table
    tbody.querySelectorAll('tr.active').forEach(r => r.classList.remove('active'));

    // Toggle: tap same row again → deselect
    if (!wasActive) row.classList.add('active');
  });
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  initTabs();
  initRefreshButton();
  initRowHighlight();
  loadTabContent(state.activeTab);
});
