/**
 * app.js — Main application logic for ФРСУ AREA Mini App
 *
 * Responsibilities:
 *  - Telegram WebApp initialisation
 *  - Tab navigation
 *  - Data loading + render orchestration
 *  - Filter chip interaction (results tab)
 */

/* ── App version ───────────────────────────────────────── */
const APP_VERSION = '1.0.2';

/* ── State ─────────────────────────────────────────────── */
const state = {
  activeTab:     'results',
  resultFilter:  'all',
  otherFilter:   'all',
  allConfig:     null,
  resultsData:   null,
  otherData:     null,
  aboutData:     null,
  detailPage:    null,
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
      if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#0057B8');
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

      // Tap on already-active tab → scroll to top
      if (tabId === state.activeTab) {
        const main = document.getElementById('main');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

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

      // official section only
      const resultsItems = config.filter(c =>
        (c.pageId || 'results') === 'results' && (c.section || 'official') === 'official'
      );
      const withRows = await Promise.all(
        resultsItems.map(async item => ({ ...item, result: await fetchResults(item) }))
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
        '<div class="empty-state"><img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160"><p>Не вдалося завантажити результати</p></div>';
    }
  }

  if (tabId === 'other' && !state.otherData) {
    showSkeleton('other-list', 2);
    try {
      const config = state.allConfig || await fetchConfig();
      state.allConfig = config;

      // other section only
      const otherItems = config.filter(c =>
        (c.pageId || 'results') === 'results' && (c.section || 'official') === 'other'
      );
      const withRows = await Promise.all(
        otherItems.map(async item => ({ ...item, result: await fetchResults(item) }))
      );
      state.otherData = withRows;

      renderFilterChips(withRows, state.otherFilter, (newFilter) => {
        state.otherFilter = newFilter;
        renderResultsTo('other-list', withRows, newFilter);
        initDetailButtons(withRows, openDetailPageById);
      }, 'other-chips');

      renderResultsTo('other-list', withRows, state.otherFilter);
      initDetailButtons(withRows, openDetailPageById);
    } catch (err) {
      console.error('[App] Failed to load other:', err);
      document.getElementById('other-list').innerHTML =
        '<div class="empty-state"><img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160"><p>Не вдалося завантажити дані</p></div>';
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

  // Open overlay IMMEDIATELY — no waiting
  const overlay = openDetailOverlay(parentItem, []);

  try {
    // Fetch config and results in parallel
    const allConfig = await fetchConfig();
    state.allConfig = allConfig;

    const detailConfigs = allConfig.filter(c =>
      (c.pageId === 'details') && c.parentId === parentId
    );

    // Inject chips now that we have config
    if (detailConfigs.length > 0) {
      const chipsContainer = overlay.querySelector('#detail-chips');
      if (chipsContainer) {
        chipsContainer.innerHTML = detailConfigs.map((c, i) => `
          <button class="chip${i === 0 ? ' active' : ''}" data-detail-id="${c.id}">
            ${c.tag_title || c.title}
          </button>`).join('');
      } else {
        // chips container wasn't rendered (empty detailConfigs passed) — insert it
        const body = overlay.querySelector('#detail-body');
        if (body) {
          const chips = document.createElement('div');
          chips.className = 'detail-filter-chips';
          chips.id = 'detail-chips';
          chips.innerHTML = detailConfigs.map((c, i) => `
            <button class="chip${i === 0 ? ' active' : ''}" data-detail-id="${c.id}">
              ${c.tag_title || c.title}
            </button>`).join('');
          body.before(chips);
        }
      }

      // Re-attach chip click handler
      overlay.querySelector('#detail-chips')?.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        overlay.querySelectorAll('#detail-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const id = chip.dataset.detailId;
        overlay.querySelectorAll('.detail-table-section').forEach(s => {
          s.style.display = s.dataset.detailId === id ? '' : 'none';
        });
      });
    }

    const withRows = await Promise.all(
      detailConfigs.map(async item => {
        try {
          const result = await fetchResults(item);
          return { ...item, result };
        } catch (e) {
          console.warn('[App] fetchResults failed for', item.id, e.message);
          return { ...item, result: { type: 'rich', rows: [] } };
        }
      })
    );

    renderDetailContent(overlay, parentItem, withRows);
  } catch (err) {
    console.error('[App] Failed to load detail results:', err);
    const body = overlay.querySelector('#detail-body');
    if (body) body.innerHTML = `<div class="empty-state"><img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160"><p>Не вдалося завантажити дані</p></div>`;
  }
}

/* ── Last updated indicator ─────────────────────────────── */
let lastUpdatedTime = null;
let lastUpdatedTimer = null;

function setLastUpdated() {
  lastUpdatedTime = Date.now();
  updateLastUpdatedLabel();
  if (lastUpdatedTimer) clearInterval(lastUpdatedTimer);
  lastUpdatedTimer = setInterval(updateLastUpdatedLabel, 30000);
}

function updateLastUpdatedLabel() {
  const el = document.getElementById('lastUpdated');
  if (!el || !lastUpdatedTime) return;
  const sec = Math.floor((Date.now() - lastUpdatedTime) / 1000);
  let label;
  if (sec < 30)          label = 'щойно';
  else if (sec < 60)     label = '30 сек тому';
  else if (sec < 120)    label = '1 хв тому';
  else if (sec < 3600)   label = Math.floor(sec / 60) + ' хв тому';
  else if (sec < 7200)   label = '1 год тому';
  else                   label = Math.floor(sec / 3600) + ' год тому';
  el.textContent = label;
}


function initRefreshButton() {
  const btn = document.getElementById('refreshBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    const textEl = btn.querySelector('.refresh-btn-text');
    if (textEl) textEl.innerHTML = '<span class="btn-spinner"></span>';

    // Show skeleton only in the currently active tab
    const activeList = state.activeTab === 'other' ? 'other-list' : 'results-list';
    showSkeleton(activeList, 2);

    try {
      state.resultsData = null;
      state.otherData   = null;
      state.aboutData   = null;
      state.allConfig   = null;
      await loadTabContent(state.activeTab);
      setLastUpdated();
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        if (textEl) textEl.textContent = 'Оновити';
      }, 600);
    }
  });
}


/* ── Row highlight (click to select) ───────────────────── */
function initRowHighlight() {
  // Use event delegation on the whole main content area
  document.getElementById('main')?.addEventListener('click', handleRowClick);
}

function handleRowClick(e) {
  const row = e.target.closest('tbody tr');
  if (!row) return;
  const tbody = row.closest('tbody');
  if (!tbody) return;

  const wasActive = row.classList.contains('active');

  // Deactivate all rows — restore saved bg colors
  tbody.querySelectorAll('tr.active').forEach(r => {
    r.classList.remove('active');
    r.querySelectorAll('td[data-bg]').forEach(td => {
      td.style.backgroundColor = td.dataset.bg;
    });
  });

  if (!wasActive) {
    // Save and clear inline bg on each cell, then mark active
    row.querySelectorAll('td').forEach(td => {
      const inlineBg = td.style.backgroundColor;
      if (inlineBg) {
        td.dataset.bg = inlineBg;
        td.style.backgroundColor = '';
      }
    });
    row.classList.add('active');
  }
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  initTabs();
  initRefreshButton();
  initRowHighlight();

  const verEl = document.getElementById('appVersion');
  if (verEl) verEl.textContent = 'v' + APP_VERSION;

  loadTabContent(state.activeTab).then(() => setLastUpdated());
});
