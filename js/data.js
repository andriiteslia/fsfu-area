/**
 * data.js — Mock data for ФРСУ AREA Mini App
 *
 * Structure mirrors what the real API / DB will return.
 * Replace `fetchResults()`, `fetchEvents()`, `fetchAbout()`
 * with actual fetch() calls when the backend is ready.
 */

/* ── RESULTS ──────────────────────────────────────────── */

const MOCK_RESULTS = [
  {
    id: 'ch-2025-area-vinnytsia',
    type: 'championship',
    tag_title: 'Чемпіонат України',
    tag_order: 1,
    title: 'Чемпіонат України · AREA',
    subtitle: 'Ловля форелі в озерах · 2025',
    date: '2025-04-04',
    dateDisplay: '4–5 квітня 2025',
    location: 'Вінниця',
    status: 'Завершено',
    teams: [
      { place: 1, name: 'Команда 1', region: 'Область 1', score: '—' },
      { place: 2, name: 'Команда 2', region: 'Область 2', score: '—' },
      { place: 3, name: 'Команда 3', region: 'Область 3', score: '—' },
      { place: 4, name: 'Команда 4', region: 'Область 4', score: '—' },
      { place: 5, name: 'Команда 5', region: 'Область 5', score: '—' },
    ],
  },
];

/* ── EVENTS / CALENDAR ────────────────────────────────── */

/**
 * registration:
 *   'open'     — registration link is active now
 *   'soon'     — event upcoming, reg not open yet
 *   'closed'   — registration has ended
 */

const MOCK_EVENTS = [
  {
    id: 'event-2026-area-2',
    title: 'Чемпіонат України · AREA · 2 етап',
    date: '2026-09-12',
    dateDisplay: '12–13 вересня 2026',
    location: 'Яблунів, Косівський р-н',
    discipline: 'AREA · Ловля форелі в озерах',
    type: 'Всеукраїнські змагання',
    registration: 'open',
    registerUrl: 'https://fsfu.com.ua/competition',
    hasPoster: false,
  },
  {
    id: 'event-2026-cup-2',
    title: 'Кубок України · AREA · Осінній',
    date: '2026-10-17',
    dateDisplay: '17–18 жовтня 2026',
    location: 'Поляниця, Буковель',
    discipline: 'AREA · Ловля форелі в озерах',
    type: 'Всеукраїнські змагання',
    registration: 'soon',
    registerUrl: null,
    hasPoster: false,
  },
  {
    id: 'event-2026-area-final',
    title: 'Чемпіонат України · AREA · Фінал 2026',
    date: '2026-11-07',
    dateDisplay: '7–8 листопада 2026',
    location: 'Косів, Івано-Франківська обл.',
    discipline: 'AREA · Ловля форелі в озерах',
    type: 'Всеукраїнські змагання',
    registration: 'soon',
    registerUrl: null,
    hasPoster: false,
  },
];

/* ── ABOUT ────────────────────────────────────────────── */

const ABOUT_INFO = {
  contacts: [
    { icon: '🏛️', label: 'Адреса',  value: 'м. Полтава, вул. Соборності 77, оф. 2' },
    { icon: '📞', label: 'Телефон', value: '(095) 481-64-64', url: 'tel:+380954816464' },
    { icon: '📧', label: 'Email',   value: 'fsfu2020@gmail.com', url: 'mailto:fsfu2020@gmail.com' },
    { icon: '🌐', label: 'Вебсайт', value: 'fsfu.com.ua', url: 'https://fsfu.com.ua' },
    { icon: '<img src="assets/imgs/instagram.svg" width="22" height="22" style="vertical-align:middle">', label: 'Instagram', value: '@fsfu_news', url: 'https://www.instagram.com/fsfu_news/' },
    { icon: '<img src="assets/imgs/telegram.svg" width="22" height="22" style="vertical-align:middle">', label: 'Telegram', value: 'ФРСУ AREA', url: 'https://t.me/fsfu_area' },
  ],
  federations: [],  // loaded from config sheet
};

/* ── Mock data above is consumed by api.js (USE_MOCK mode) ── */
