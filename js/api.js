/**
 * api.js — Data layer for ФРСУ AREA Mini App
 *
 * Primary source: Supabase (fast, ~50-150ms)
 * Fallback:       Apps Script (if Supabase unavailable)
 */

/* ── Config ─────────────────────────────────────────────── */

const API_CONFIG = {
  // Supabase — primary fast source
  SUPABASE_URL: 'https://pcpfjhkcsuxwsykzreab.supabase.co',
  SUPABASE_KEY: 'sb_publishable_QudBtWR8nhvBZNvU5fIjUA_KgJ0kb1S',

  // Apps Script — fallback / sync trigger
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxtxfTGKmZ6_55_bVRaWvmwY8gty5arS58M1lpKgZPoUtqHN-Gigls-weAkZJlr_TBR/exec',

  DATA_SHEET_ID: '1qdiwSvxIznLjUyI6LMZmxTrYl8MPZ-zB0y9tEYosulw',

  USE_MOCK: false,
};

/* ── Timeout wrapper ─────────────────────────────────────── */

function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    ),
  ]);
}

/* ── LocalStorage cache ──────────────────────────────────── */

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function cacheSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {}
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch (e) { return null; }
}

/* ── Supabase REST helper ─────────────────────────────────── */

async function supabaseFetch(table, params = '') {
  const url = `${API_CONFIG.SUPABASE_URL}/rest/v1/${table}${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey':        API_CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`[Supabase] ${res.status} on ${table}`);
  return res.json();
}

/* ── Apps Script fallback helper ─────────────────────────── */

async function apiFetch(action, params = {}) {
  const url = new URL(API_CONFIG.APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`[AppsScript] HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`[AppsScript] ${json.error}`);
  return json;
}

/* ── Public API methods ──────────────────────────────────── */

async function fetchConfig() {
  if (API_CONFIG.USE_MOCK) {
    return MOCK_RESULTS.map(r => ({
      id: r.id, title: r.title,
      tag_title: r.tag_title || '', tag_order: r.tag_order || 0,
      type: r.type, dateDisplay: r.dateDisplay, dateSort: r.date,
      location: r.location, dataSheetId: API_CONFIG.DATA_SHEET_ID,
      dataSheetName: '', dataRange: 'A:E', headerRows: 1,
      dividers: '', pageId: 'results', parentId: '', visible: true,
    }));
  }

  const CACHE_KEY = 'fsfu_config';

  try {
    const rows = await withTimeout(
      supabaseFetch('config_cards', '?visible=eq.true&order=card_order.asc')
    );
    const mapped = rows.map(r => ({
      id:            r.id,
      pageId:        r.page_id       || 'results',
      parentId:      r.parent_id     || '',
      section:       r.section       || 'official',
      cardOrder:     r.card_order    || 999,
      tag_title:     r.tag_title     || '',
      tag_order:     r.tag_order     || 0,
      title:         r.title         || '',
      dateDisplay:   r.date_display  || '',
      dateSort:      r.date_sort     || '',
      location:      r.location      || '',
      dataSheetId:   r.data_sheet_id || '',
      dataSheetName: r.data_sheet_name || '',
      dataRange:     r.data_range    || 'A:Z',
      headerRows:    r.header_rows   || 0,
      dividers:      r.dividers      || '',
      visible:       r.visible !== false,
    }));
    cacheSet(CACHE_KEY, mapped);
    return mapped;
  } catch (e) {
    // Timeout or network error — try cache
    const cached = cacheGet(CACHE_KEY);
    if (cached) { console.warn('[API] fetchConfig using cache:', e.message); return cached; }
    throw e;
  }
}

async function fetchResults(configItem) {
  if (API_CONFIG.USE_MOCK) {
    return { type: 'rich', rows: [] };
  }

  const CACHE_KEY = `fsfu_result_${configItem.id}`;

  try {
    const rows = await withTimeout(
      supabaseFetch('results_cache', `?card_id=eq.${encodeURIComponent(configItem.id)}&limit=1`)
    );
    if (rows && rows.length > 0 && rows[0].result_json) {
      cacheSet(CACHE_KEY, rows[0].result_json);
      return rows[0].result_json;
    }
  } catch (e) {
    const cached = cacheGet(CACHE_KEY);
    if (cached) { console.warn('[API] fetchResults using cache for', configItem.id); return cached; }
    console.warn('[API] Supabase results miss for', configItem.id, '— falling back');
  }

  // Fallback to Apps Script
  try {
    return await withTimeout(apiFetch('getResults', {
      sheetId:    configItem.dataSheetId,
      sheetName:  configItem.dataSheetName,
      range:      configItem.dataRange,
      headerRows: configItem.headerRows || 0,
    }));
  } catch (e) {
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;
    throw e;
  }
}

async function fetchEvents() {
  if (API_CONFIG.USE_MOCK) return MOCK_EVENTS;
  return apiFetch('getEvents');
}

async function fetchAbout() {
  if (API_CONFIG.USE_MOCK) return ABOUT_INFO;

  try {
    const rows = await supabaseFetch(
      'about_federations',
      '?visible=eq.true&order=fed_order.asc'
    );
    const federations = rows.map(r => ({
      order:    r.fed_order,
      name:     r.fed_name,
      short:    r.fed_short,
      region:   r.region,
      photoUrl: r.photo_url,
      captain:  r.captain,
      members:  r.members ? r.members.split(',').map(m => m.trim()).filter(Boolean) : [],
      email:    r.email,
      phone:    r.phone,
    }));
    return { contacts: ABOUT_INFO.contacts, federations };
  } catch (e) {
    console.warn('[API] Supabase about miss — falling back');
    const apiData = await apiFetch('getAbout');
    return { contacts: ABOUT_INFO.contacts, federations: apiData.federations || [] };
  }
}
