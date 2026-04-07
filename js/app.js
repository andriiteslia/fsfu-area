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
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  tg.ready();
  tg.expand();

  // Match app header to Telegram's colour scheme
  tg.setHeaderColor('#002D6E');
  tg.setBackgroundColor('#F0F4FA');

  // Show back button on Telegram's native header if needed
  // tg.BackButton.show();
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
