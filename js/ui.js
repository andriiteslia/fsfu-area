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

/* ── Filter chips ─────────────────────────────────────────── */

/**
 * Builds filter chips dynamically from config items.
 * Tags are deduplicated and sorted by tag_order.
 * Returns the active filter value after render.
 *
 * @param {Array}    items        - config items (with tag_title, tag_order)
 * @param {string}   activeFilter - currently active filter ('all' or tag_title)
 * @param {Function} onChange     - callback(newFilter) when chip is clicked
 */
function renderFilterChips(items, activeFilter, onChange) {
  const container = document.getElementById('result-chips');
  if (!container) return;

  // Build unique tags sorted by tag_order
  const tagMap = new Map();
  items.forEach(item => {
    if (item.tag_title && !tagMap.has(item.tag_title)) {
      tagMap.set(item.tag_title, item.tag_order ?? 99);
    }
  });

  const tags = [...tagMap.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([title]) => title);

  // Render: "Усі" + one chip per unique tag
  const allActive = activeFilter === 'all' ? 'active' : '';
  const chipsHtml = [
    `<button class="chip ${allActive}" data-filter="all">Усі</button>`,
    ...tags.map(tag => {
      const isActive = activeFilter === tag ? 'active' : '';
      return `<button class="chip ${isActive}" data-filter="${escHtml(tag)}">${escHtml(tag)}</button>`;
    }),
  ].join('');

  container.innerHTML = chipsHtml;

  // Attach click handlers
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      onChange(chip.dataset.filter);
    });
  });
}

/* ── Status badge class ──────────────────────────────────── */
function statusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('завершено'))              return 'badge-done';
  if (s.includes('відбувається'))           return 'badge-ongoing';
  if (s.includes('триває реєстрація') ||
      s.includes('реєстрація відкрита'))    return 'badge-reg-open';
  if (s.includes('реєстрація закрита'))     return 'badge-reg-closed';
  if (s.includes('очікується'))             return 'badge-expected';
  return 'badge-expected';
}

/* ── Results ─────────────────────────────────────────────── */

const PREVIEW_ROWS = 4;

/**
 * Builds <thead> HTML — handles flat and grouped header formats.
 */
function buildThead(result) {
  if (result?.type === 'grouped' && result.groups) {
    // Row 1: group headers with colspan
    const groupCells = [`<th rowspan="2" class="th-place">#</th>`];
    result.groups.forEach(g => {
      if (g.colspan > 1) {
        groupCells.push(`<th colspan="${g.colspan}" class="th-group">${escHtml(g.label)}</th>`);
      } else {
        groupCells.push(`<th rowspan="2">${escHtml(g.label)}</th>`);
      }
    });

    // Row 2: sub-headers (only under colspan groups)
    const subCells = [];
    let subIdx = 0;
    result.groups.forEach(g => {
      if (g.colspan > 1) {
        for (let i = 0; i < g.colspan; i++) {
          const label = result.subHeaders?.[subIdx] || '';
          subCells.push(`<th>${escHtml(label)}</th>`);
          subIdx++;
        }
      } else {
        subIdx++;
      }
    });

    return `
      <thead>
        <tr>${groupCells.join('')}</tr>
        <tr>${subCells.join('')}</tr>
      </thead>`;
  }

  // Flat headers
  const headers = result?.headers || [];
  const thCells = [`<th>#</th>`, ...headers.map(h => `<th>${escHtml(h)}</th>`)].join('');
  return `<thead><tr>${thCells}</tr></thead>`;
}

/**
 * Renders a single result card (preview: first 4 rows + "Показати детальніше").
 */
function renderResultCard(item) {
  const { id, title, dateDisplay, location, status, type, result } = item;

  const allRows = result?.rows || [];
  const preview = allRows.slice(0, PREVIEW_ROWS);
  const hasMore = allRows.length > PREVIEW_ROWS;

  const renderRow = row => `
    <tr>
      <td><span class="place ${placeClass(row.place)}">${row.place}</span></td>
      ${row.cells.map(cell => `<td>${escHtml(String(cell ?? ''))}</td>`).join('')}
    </tr>`;

  const moreBtn = hasMore ? `
    <button class="btn-show-more" data-card-id="${escHtml(id)}">
      Показати детальніше
      <span class="btn-show-more-count">${allRows.length - PREVIEW_ROWS} ще</span>
    </button>` : '';

  return `
    <div class="result-card" data-type="${escHtml(type)}" data-card-id="${escHtml(id)}">
      <div class="result-card-header">
        <div class="result-card-header-info">
          <span class="badge ${statusBadgeClass(status)}">${escHtml(status)}</span>
          <h3>${escHtml(title)}</h3>
          <p>📅 ${escHtml(dateDisplay)} &nbsp;·&nbsp; 📍 ${escHtml(location)}</p>
        </div>
      </div>
      <div class="result-table-wrap">
        <table class="result-table" aria-label="Результати ${escHtml(title)}">
          ${buildThead(result)}
          <tbody>${preview.map(renderRow).join('')}</tbody>
        </table>
      </div>
      ${moreBtn}
    </div>
  `;
}

/* ── Detail page (full results) ──────────────────────────── */

/**
 * Opens a full-screen detail view for one competition.
 */
function openDetailPage(item) {
  const { title, dateDisplay, location, status, result } = item;

  const allRows = result?.rows || [];
  const rows    = allRows.map(row => `
    <tr>
      <td><span class="place ${placeClass(row.place)}">${row.place}</span></td>
      ${row.cells.map(cell => `<td>${escHtml(String(cell ?? ''))}</td>`).join('')}
    </tr>`).join('');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'detail-overlay';
  overlay.innerHTML = `
    <div class="detail-page">
      <div class="detail-header">
        <button class="detail-back" aria-label="Назад">← Назад</button>
        <div class="detail-header-info">
          <span class="badge ${statusBadgeClass(status)}">${escHtml(status)}</span>
          <h2>${escHtml(title)}</h2>
          <p>📅 ${escHtml(dateDisplay)} &nbsp;·&nbsp; 📍 ${escHtml(location)}</p>
        </div>
      </div>
      <div class="detail-body">
        <div class="result-table-wrap">
          <table class="result-table detail-table">
            ${buildThead(result)}
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Close on back button
  overlay.querySelector('.detail-back').addEventListener('click', () => {
    overlay.classList.add('detail-overlay--closing');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  });

  // Telegram back button support
  const tg = window.Telegram?.WebApp;
  if (tg?.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
      overlay.querySelector('.detail-back').click();
      tg.BackButton.hide();
    });
  }

  document.body.appendChild(overlay);
  // Row highlight inside detail page
  overlay.querySelector('tbody').addEventListener('click', e => {
    const row = e.target.closest('tr');
    if (!row) return;
    const wasActive = row.classList.contains('active');
    overlay.querySelectorAll('tbody tr.active').forEach(r => r.classList.remove('active'));
    if (!wasActive) row.classList.add('active');
  });
}

/**
 * Attaches "Показати детальніше" click handlers.
 * Call after renderResults().
 */
function initDetailButtons(items) {
  document.querySelectorAll('.btn-show-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.cardId;
      const item = items.find(i => i.id === id);
      if (item) openDetailPage(item);
    });
  });
}

/**
 * Renders the full results list.
 */
function renderResults(items, activeFilter = 'all') {
  const container = document.getElementById('results-list');
  if (!container) return;

  const filtered = activeFilter === 'all'
    ? items
    : items.filter(item => item.tag_title === activeFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎣</div>
        <p>Результатів за цим фільтром ще немає</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(renderResultCard).join('');
  initDetailButtons(items);
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
