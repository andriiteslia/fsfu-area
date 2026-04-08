/**
 * api.js — Data layer for ФРСУ AREA Mini App
 *
 * Flow:
 *   Google Sheets → Apps Script Web App → this file → ui.js
 *
 * During development: MOCK mode (reads from data.js mock objects).
 * Production: set APPS_SCRIPT_URL to your deployed Apps Script Web App URL.
 *
 * Apps Script Web App expects:
 *   ?action=getConfig            → returns parsed config_fsfu_area sheet
 *   ?action=getResults&id=xxx    → returns results for a specific competition
 *   ?action=getEvents            → returns upcoming events list
 */

/* ── Config ─────────────────────────────────────────────── */

const API_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxtxfTGKmZ6_55_bVRaWvmwY8gty5arS58M1lpKgZPoUtqHN-Gigls-weAkZJlr_TBR/exec',

  CONFIG_SHEET_ID:   '10ZIbNLCBTmmC9BClB-Cj7IUjzCyus4rEV7KzQKsMNQs',
  CONFIG_SHEET_NAME: 'config_fsfu_area',
  DATA_SHEET_ID:     '1qdiwSvxIznLjUyI6LMZmxTrYl8MPZ-zB0y9tEYosulw',

  // false = real data from Apps Script, true = mock data from data.js
  USE_MOCK: false,
};

/* ── Generic fetch helper ────────────────────────────────── */

async function apiFetch(action, params = {}) {
  if (!API_CONFIG.APPS_SCRIPT_URL) {
    throw new Error('[API] APPS_SCRIPT_URL not set');
  }

  const url = new URL(API_CONFIG.APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`[API] HTTP ${res.status} for action=${action}`);

  const json = await res.json();
  if (json.error) throw new Error(`[API] Server error: ${json.error}`);

  return json;
}

/* ── Public API methods ──────────────────────────────────── */

/**
 * Returns list of competition configs (drives Results tab cards).
 * Each item maps to one result card rendered by ui.js.
 *
 * Shape returned:
 * [
 *   {
 *     id:              string,
 *     title:           string,
 *     tag_title:       string,   // e.g. 'Чемпіонат України' — drives filter chips
 *     tag_order:       number,   // sort order of tag in the chips bar
 *     type:            'championship' | 'cup',
 *     dateDisplay:     string,
 *     dateSort:        string,   // YYYY-MM-DD for sorting
 *     location:        string,
 *     status:          string,   // 'Завершено' | 'Відбувається' | 'Очікується' | ...
 *     dataSheetId:     string,
 *     dataSheetName:   string,
 *     dataRange:       string,   // e.g. 'A:E'
 *     visible:         boolean,
 *   }
 * ]
 */
async function fetchConfig() {
  if (API_CONFIG.USE_MOCK) {
    // Transform MOCK_RESULTS from data.js into config-shaped objects
    return MOCK_RESULTS.map(r => ({
      id:            r.id,
      title:         r.title,
      tag_title:     r.tag_title  || '',
      tag_order:     r.tag_order  || 0,
      type:          r.type,
      dateDisplay:   r.dateDisplay,
      dateSort:      r.date,
      location:      r.location,
      status:        r.status || 'Завершено',
      dataSheetId:   API_CONFIG.DATA_SHEET_ID,
      dataSheetName: '',
      dataRange:     'A:E',
      headerRows:    1,
      dividers:      '',
      visible:       true,
    }));
  }

  return apiFetch('getConfig');
}

/**
 * Returns rows for a single competition result card.
 *
 * Shape returned:
 * {
 *   headers: ['#', 'Команда', 'Регіон', 'Результат'],
 *   rows: [
 *     { place: 1, cells: ['Назва команди', 'Область', '14 риб · 4 280 г'] },
 *     ...
 *   ]
 * }
 */
async function fetchResults(configItem) {
  if (API_CONFIG.USE_MOCK) {
    const found = MOCK_RESULTS.find(r => r.id === configItem.id);
    if (!found) return { headers: [], rows: [] };

    return {
      headers: ['#', 'Команда', 'Регіон', 'Результат'],
      rows: found.teams.map(t => ({
        place: t.place,
        cells: [t.name, t.region, t.score],
      })),
    };
  }

  return apiFetch('getResults', {
    sheetId:    configItem.dataSheetId,
    sheetName:  configItem.dataSheetName,
    range:      configItem.dataRange,
    headerRows: configItem.headerRows || 1,
  });
}

/**
 * Returns upcoming events for the Calendar tab.
 *
 * Shape returned:
 * [
 *   {
 *     id:           string,
 *     title:        string,
 *     date:         string,   // YYYY-MM-DD
 *     dateDisplay:  string,
 *     location:     string,
 *     discipline:   string,
 *     type:         string,
 *     registration: 'open' | 'soon' | 'closed',
 *     registerUrl:  string | null,
 *   }
 * ]
 */
async function fetchEvents() {
  if (API_CONFIG.USE_MOCK) {
    return MOCK_EVENTS;
  }

  return apiFetch('getEvents');
}

/**
 * Returns federation about info.
 */
async function fetchAbout() {
  if (API_CONFIG.USE_MOCK) {
    return ABOUT_INFO;
  }
  // Merge hardcoded contacts with API federations
  const apiData = await apiFetch('getAbout');
  return {
    contacts:     ABOUT_INFO.contacts,
    federations:  apiData.federations || [],
  };
}

/* ── Switch to live mode ─────────────────────────────────── */

/**
 * Call this once your Apps Script Web App is deployed.
 *
 * Usage in app.js or inline:
 *   setApiUrl('https://script.google.com/macros/s/YOUR_ID/exec');
 */
function setApiUrl(url) {
  API_CONFIG.APPS_SCRIPT_URL = url;
  API_CONFIG.USE_MOCK = false;
  console.log('[API] Live mode enabled:', url);
}
