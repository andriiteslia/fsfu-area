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
    title: 'Чемпіонат України · AREA',
    subtitle: 'Ловля форелі в озерах · 2025',
    date: '2025-04-04',
    dateDisplay: '4–5 квітня 2025',
    location: 'Вінниця',
    teams: [
      { place: 1, name: 'Команда 1',  region: 'Область 1', score: '—' },
      { place: 2, name: 'Команда 2',  region: 'Область 2', score: '—' },
      { place: 3, name: 'Команда 3',  region: 'Область 3', score: '—' },
      { place: 4, name: 'Команда 4',  region: 'Область 4', score: '—' },
      { place: 5, name: 'Команда 5',  region: 'Область 5', score: '—' },
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
    id: 'event-2025-area-2',
    title: 'Чемпіонат України · AREA · 2 етап',
    date: '2025-09-13',
    dateDisplay: '13–14 вересня 2025',
    location: 'Яблунів, Косівський р-н',
    discipline: 'AREA · Ловля форелі в озерах',
    type: 'Всеукраїнські змагання',
    registration: 'open',
    registerUrl: 'https://fsfu.com.ua/competition',   // замінити на реальне посилання
    hasPoster: false,
  },
  {
    id: 'event-2025-cup-2',
    title: 'Кубок України · AREA · Осінній',
    date: '2025-10-18',
    dateDisplay: '18–19 жовтня 2025',
    location: 'Поляниця, Буковель',
    discipline: 'AREA · Ловля форелі в озерах',
    type: 'Всеукраїнські змагання',
    registration: 'soon',
    registerUrl: null,
    hasPoster: false,
  },
  {
    id: 'event-2025-area-final',
    title: 'Чемпіонат України · AREA · Фінал 2025',
    date: '2025-11-08',
    dateDisplay: '8–9 листопада 2025',
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
    { icon: '📞', label: 'Телефон', value: '(095) 481-64-64' },
    { icon: '📧', label: 'Email',   value: 'fsfu2020@gmail.com' },
    { icon: '🌐', label: 'Вебсайт', value: 'fsfu.com.ua', url: 'https://fsfu.com.ua' },
  ],
  regions: [
    { name: 'Івано-Франківська обл.',   teams: ['Карпатська форель', 'Буковельська форель', 'Яремче AREA'] },
    { name: 'Львівська обл.',           teams: ['Галичина Спорт', 'Львів AREA Club'] },
    { name: 'Чернівецька обл.',         teams: ['Буковинські риболови', 'Буковина Спорт'] },
    { name: 'Тернопільська обл.',       teams: ['Тернопіль AREA'] },
    { name: 'Закарпатська обл.',        teams: ['Закарпаття Форель'] },
    { name: 'Волинська обл.',           teams: ['Поліська сімка', 'Луцьк Риболов'] },
    { name: 'м. Київ',                  teams: ['Київ AREA Club'] },
    { name: 'Харківська обл.',          teams: ['Харків Спінер', 'Харків AREA'] },
    { name: 'Дніпропетровська обл.',    teams: ['Дніпро-Риболов'] },
    { name: 'Черкаська обл.',           teams: ['Черкаси AREA'] },
    { name: 'Полтавська обл.',          teams: ['Полтава Рибак'] },
  ],
};

/* ── Async getters (swap body for real fetch later) ───── */

async function fetchResults() {
  // TODO: replace with → fetch('/api/results?discipline=area')
  return Promise.resolve(MOCK_RESULTS);
}

async function fetchEvents() {
  // TODO: replace with → fetch('/api/events?discipline=area')
  return Promise.resolve(MOCK_EVENTS);
}

async function fetchAbout() {
  // TODO: replace with → fetch('/api/about')
  return Promise.resolve(ABOUT_INFO);
}
