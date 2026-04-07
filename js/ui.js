/**
 * ui.js — DOM rendering helpers for ФРСУ AREA Mini App
 *
 * Each render* function receives data and returns an HTML string
 * or a DOM element that gets mounted by app.js.
 */

/* ── Helpers ────────────────────────────────────────────── */

function placeClass(n) {
  if (n === 1) return 'place-1';
  if (n === 2) return 'place-2';
  if (n === 3) return 'place-3';
  return 'place-n';
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ── Results ─────────────────────────────────────────────── */

/**
 * Renders a single result card (one competition).
 * @param {Object} r - result object from data.js
 * @returns {string} HTML string
 */
function renderResultCard(r) {
  const rows = r.teams.map(t => `
    <tr>
      <td><span class="place ${placeClass(t.place)}">${t.place}</span></td>
      <td>
        <div class="athlete-name">${escHtml(t.name)}</div>
        <div class="athlete-region">${escHtml(t.region)}</div>
      </td>
      <td><span class="score">${escHtml(t.score)}</span></td>
    </tr>
  `).join('');

  return `
    <div class="result-card" data-type="${r.type}">
      <div class="result-card-header">
        <div class="result-card-header-info">
          <h3>${escHtml(r.title)}</h3>
          <p>📅 ${escHtml(r.dateDisplay)} &nbsp;·&nbsp; 📍 ${escHtml(r.location)}</p>
        </div>
        <span class="badge badge-done">Завершено</span>
      </div>
      <table class="result-table" aria-label="Результати ${escHtml(r.title)}">
        <thead>
          <tr>
            <th>#</th>
            <th>Команда</th>
            <th>Результат</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/**
 * Renders the full results list.
 * Applies filter if provided.
 */
function renderResults(results, activeFilter = 'all') {
  const container = document.getElementById('results-list');
  if (!container) return;

  const filtered = activeFilter === 'all'
    ? results
    : results.filter(r => r.type === activeFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎣</div>
        <p>Результатів за цим фільтром ще немає</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(renderResultCard).join('');
}

/* ── Calendar ─────────────────────────────────────────────── */

/**
 * Renders a single event card.
 * @param {Object} ev - event object from data.js
 * @returns {string} HTML string
 */
function renderEventCard(ev) {
  const badgeHtml = ev.registration === 'open'
    ? `<span class="badge badge-open">🟢 Реєстрація відкрита</span>`
    : `<span class="badge badge-upcoming">🔜 Скоро</span>`;

  const btnHtml = ev.registration === 'open' && ev.registerUrl
    ? `<a href="${escHtml(ev.registerUrl)}" target="_blank" rel="noopener" class="btn-register btn-register-active">
         ✍️ Зареєструватись
       </a>`
    : `<button class="btn-register btn-register-soon" disabled>
         🔒 Реєстрація ще не відкрита
       </button>`;

  const posterHtml = `
    <div class="event-poster-placeholder" aria-hidden="true">🐟&nbsp;🎣&nbsp;🏔️</div>
  `;

  return `
    <div class="event-card">
      ${posterHtml}
      <div class="event-body">
        <div class="event-top">
          <h3 class="event-title">${escHtml(ev.title)}</h3>
          ${badgeHtml}
        </div>
        <div class="event-meta">
          <div class="event-meta-row">
            <span class="event-meta-icon">📅</span>
            <span>${escHtml(ev.dateDisplay)}</span>
          </div>
          <div class="event-meta-row">
            <span class="event-meta-icon">📍</span>
            <span>${escHtml(ev.location)}</span>
          </div>
          <div class="event-meta-row">
            <span class="event-meta-icon">🎣</span>
            <span>${escHtml(ev.discipline)}</span>
          </div>
          <div class="event-meta-row">
            <span class="event-meta-icon">🏷️</span>
            <span>${escHtml(ev.type)}</span>
          </div>
        </div>
        ${btnHtml}
      </div>
    </div>
  `;
}

/**
 * Renders the full calendar list.
 */
function renderCalendar(events) {
  const container = document.getElementById('calendar-list');
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <p>Заплановані події з'являться тут</p>
      </div>`;
    return;
  }

  // Sort by date ascending
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  container.innerHTML = sorted.map(renderEventCard).join('');
}

/* ── About ───────────────────────────────────────────────── */

/**
 * Renders a region accordion item.
 */
function renderRegionItem(region) {
  const members = region.teams.map(t =>
    `<span class="member-tag">${escHtml(t)}</span>`
  ).join('');

  return `
    <div class="region-item">
      <div class="region-header" role="button" tabindex="0">
        <span class="region-name">🗺️ ${escHtml(region.name)}</span>
        <span class="region-arrow">▼</span>
      </div>
      <div class="region-members">${members}</div>
    </div>
  `;
}

/**
 * Renders the full About section.
 */
function renderAbout(about) {
  const container = document.getElementById('about-content');
  if (!container) return;

  // Contact rows
  const contactRows = about.contacts.map(c => {
    const val = c.url
      ? `<a href="${escHtml(c.url)}" style="color:var(--c-blue-main)">${escHtml(c.value)}</a>`
      : escHtml(c.value);
    return `
      <div class="info-row">
        <span class="info-icon">${c.icon}</span>
        <div class="info-text">
          <h4>${escHtml(c.label)}</h4>
          <p>${val}</p>
        </div>
      </div>`;
  }).join('');

  // Region accordion
  const regionItems = about.regions.map(renderRegionItem).join('');

  container.innerHTML = `
    <div class="about-cols">
      <div class="about-col-left">
        <div class="section-label">Контакти</div>
        <div class="info-card">${contactRows}</div>
      </div>
      <div class="about-col-right">
        <div class="section-label">Обласні федерації</div>
        <div class="region-list">${regionItems}</div>
      </div>
    </div>
  `;

  // Attach accordion toggle
  container.querySelectorAll('.region-header').forEach(header => {
    const toggle = () => header.closest('.region-item').classList.toggle('open');
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

/* ── Loading skeleton placeholder ────────────────────────── */

function showSkeleton(containerId, count = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Each skeleton card is a direct grid child — so the grid handles columns
  el.innerHTML = Array.from({ length: count }, () => `
    <div style="
      background: var(--c-card);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    ">
      <div class="skeleton" style="height: 80px; border-radius: 0;"></div>
      <div style="padding: 14px;">
        <div class="skeleton" style="height: 14px; width: 70%; margin-bottom: 10px;"></div>
        <div class="skeleton" style="height: 11px; width: 45%; margin-bottom: 18px;"></div>
        <div class="skeleton" style="height: 10px; width: 55%; margin-bottom: 6px;"></div>
        <div class="skeleton" style="height: 10px; width: 40%; margin-bottom: 6px;"></div>
        <div class="skeleton" style="height: 10px; width: 50%;"></div>
      </div>
    </div>
  `).join('');
}
