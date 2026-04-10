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
function renderFilterChips(items, activeFilter, onChange, containerId = 'result-chips') {
  const container = document.getElementById(containerId);
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
 * Parses "2,5,8" → Set{2,5,8}
 */
function parseDividers(divStr) {
  if (!divStr) return new Set();
  return new Set(
    String(divStr).split(',').map(s => Number(s.trim())).filter(n => n > 0)
  );
}

/**
 * Returns extra CSS class string for a cell at 1-indexed colNum.
 * Column 1 = place (#), column 2 = first data cell, etc.
 */
function divClass(dividers, colNum) {
  return dividers.has(colNum) ? ' style="border-right:1px solid #545E71"' : '';
}

/**
 * Renders a full <thead>+<tbody> from rich result format.
 * Preserves Sheets colors, merges, bold, alignment.
 * @param {Object} result  - rich result from API
 * @param {Set}    divSet  - column numbers with right dividers
 * @param {number|null} previewCount - limit data rows (null = all)
 * @returns {{ thead, tbody, totalDataRows }}
 */
function renderRichTable(result, divSet, previewCount) {
  const rows       = result?.rows || [];
  const headerRows = rows.filter(r => r.h);
  const dataRows   = rows.filter(r => !r.h);
  const showRows   = previewCount != null ? dataRows.slice(0, previewCount) : dataRows;

  const renderCell = (cell, isHeader) => {
    const tag        = isHeader ? 'th' : 'td';
    const endCol     = cell.col + cell.cs;
    const hasDivider = divSet.has(endCol);
    // Is this cell immediately after a config divider column?
    const afterDivider = divSet.has(cell.col);

    const style = [];
    if (cell.bg) style.push('background-color:' + cell.bg);
    if (cell.fc) style.push('color:' + cell.fc);
    if (cell.b && !isHeader) style.push('font-weight:700');
    if (cell.a === 'center') style.push('text-align:center');
    if (cell.a === 'right')  style.push('text-align:right');
    if (hasDivider)    style.push('border-right:1px solid #545E71');
    if (afterDivider)  style.push('border-left:none');

    const attrs = [];
    if (cell.cs > 1) attrs.push('colspan="' + cell.cs + '"');
    if (cell.rs > 1) attrs.push('rowspan="' + cell.rs + '"');
    if (style.length) attrs.push('style="' + style.join(';') + '"');

    content = escHtml(cell.v);

    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
    return '<' + tag + attrStr + '>' + content + '</' + tag + '>';
  };

  const thead = headerRows.map(row =>
    '<tr>' + (row.c || []).map(cell => renderCell(cell, true)).join('') + '</tr>'
  ).join('');

  const tbody = showRows.map(row =>
    '<tr>' + (row.c || []).map(cell => renderCell(cell, false)).join('') + '</tr>'
  ).join('');

  return { thead, tbody, totalDataRows: dataRows.length };
}


function buildThead(result, dividers) {
  dividers = dividers || new Set();

  // ── Debug (remove after confirmed working) ───────────────
  console.log('[buildThead] type:', result?.type, 'groups:', result?.groups?.length);

  // ── Multi/grouped header ─────────────────────────────────
  const isMulti = (result?.type === 'multi' || result?.type === 'grouped')
                  && Array.isArray(result.groups)
                  && result.groups.length > 0;

  if (isMulti) {
    const groups     = result.groups;
    const subHeaders = result.subHeaders || [];

    const row1Cells = [
      `<th rowspan="2">#</th>`,
    ];

    let colNum = 2;
    groups.forEach(g => {
      const div = divClass(dividers, colNum + g.colspan - 1);
      if (g.colspan === 1) {
        row1Cells.push(`<th rowspan="2"${div}>${escHtml(g.label)}</th>`);
      } else {
        row1Cells.push(`<th colspan="${g.colspan}"${div}>${escHtml(g.label)}</th>`);
      }
      colNum += g.colspan;
    });

    const row2Cells = [];
    colNum = 2;
    groups.forEach(g => {
      if (g.colspan === 1) { colNum++; return; }
      for (let j = 0; j < g.colspan; j++) {
        const label = subHeaders[g.startCol + j] || '';
        const div   = j === g.colspan - 1 ? divClass(dividers, colNum) : '';
        row2Cells.push(`<th${div}>${escHtml(label)}</th>`);
        colNum++;
      }
    });

    return `<thead><tr>${row1Cells.join('')}</tr><tr>${row2Cells.join('')}</tr></thead>`;
  }

  // Flat header
  const headers = result?.headers || [];
  const thCells = [
    `<th>${escHtml('#')}</th>`,
    ...headers.map((h, i) =>
      `<th${divClass(dividers, i + 2)}>${escHtml(h)}</th>`
    ),
  ].join('');
  return `<thead><tr>${thCells}</tr></thead>`;
}

/* ── Results ─────────────────────────────────────────────── */

/**
 * Renders a single result card (preview: first 4 rows + "Переглянути детальніше →").
 */
function renderResultCard(item) {
  const { id, title, dateDisplay, location, type, result } = item;
  const divSet = parseDividers(item.dividers);

  let tableHtml, hasMore, totalRows;

  if (result?.type === 'rich') {
    const { thead, tbody, totalDataRows } = renderRichTable(result, divSet, PREVIEW_ROWS);
    hasMore    = totalDataRows > PREVIEW_ROWS;
    totalRows  = totalDataRows;
    tableHtml  = `<thead>${thead}</thead><tbody>${tbody}</tbody>`;
  } else {
    // Fallback: flat / multi format
    const allRows = result?.rows || [];
    hasMore   = allRows.length > PREVIEW_ROWS;
    totalRows = allRows.length;
    const renderRow = row => `
      <tr>
        <td><span class="place ${placeClass(row.place)}">${row.place}</span></td>
        ${(row.cells || []).map((cell, i) =>
          `<td${divClass(divSet, i + 2)}>${escHtml(String(cell ?? ''))}</td>`
        ).join('')}
      </tr>`;
    tableHtml = buildThead(result, divSet)
              + `<tbody>${allRows.slice(0, PREVIEW_ROWS).map(renderRow).join('')}</tbody>`;
  }

  const moreBtn = hasMore ? `
    <button class="btn-show-more" data-card-id="${escHtml(id)}">
      Переглянути детальніше →
      <span class="btn-show-more-count">ще ${totalRows - PREVIEW_ROWS}</span>
    </button>` : '';

  return `
    <div class="result-card" data-type="${escHtml(type)}" data-card-id="${escHtml(id)}">
      <div class="result-card-header">
        <div class="result-card-header-info">
          <h3>${escHtml(title)}</h3>
          <p>${escHtml(location)} &nbsp;·&nbsp; ${escHtml(dateDisplay)}</p>
        </div>
      </div>
      <div class="result-table-wrap">
        <table class="result-table">${tableHtml}</table>
      </div>
      ${moreBtn}
    </div>
  `;
}

/**
 * Builds a skeleton loading UI for the detail page table.
 */
function buildDetailSkeleton() {
  const headerRow = `
    <div class="skeleton-row">
      <div class="skeleton-cell sk-place"></div>
      <div class="skeleton-cell sk-header sk-name"></div>
      ${[...Array(6)].map(() => '<div class="skeleton-cell sk-header sk-num"></div>').join('')}
    </div>`;

  const dataRows = [...Array(8)].map((_, i) => `
    <div class="skeleton-row" style="opacity:${1 - i * 0.08}">
      <div class="skeleton-cell sk-place"></div>
      <div class="skeleton-cell sk-name" style="width:${55 + Math.random() * 25}%"></div>
      ${[...Array(6)].map(() => '<div class="skeleton-cell sk-num"></div>').join('')}
    </div>`).join('');

  return `
    <div class="skeleton-table">
      ${headerRow}
      ${dataRows}
    </div>`;
}

/* ── Detail page ─────────────────────────────────────── */

/**
 * Creates and shows the detail overlay as a full standalone page.
 */
function openDetailOverlay(parentItem, detailConfigs) {
  document.querySelector('.detail-overlay')?.remove();

  const { title, dateDisplay, location } = parentItem;
  const hasTabs = detailConfigs.length > 1;
  const hasAnyTabs = detailConfigs.length >= 1;

  const tabsHtml = hasAnyTabs ? `
    <div class="detail-filter-chips" id="detail-chips">
      ${detailConfigs.map((c, i) => `
        <button class="chip${i === 0 ? ' active' : ''}" data-detail-id="${escHtml(c.id)}">
          ${escHtml(c.tag_title || c.title)}
        </button>`).join('')}
    </div>` : '';

  const overlay = document.createElement('div');
  overlay.className = 'detail-overlay';
  overlay.dataset.parentId = parentItem.id;
  overlay.innerHTML = `
    <div class="detail-page-header">
      <div class="detail-page-header-inner">
        <button class="detail-back-btn" aria-label="Назад">← Назад</button>
        <div class="detail-page-header-spacer"></div>
        <button class="detail-refresh-btn" aria-label="Оновити">Оновити</button>
      </div>
    </div>
    <div class="detail-scroll">
      <div class="detail-page">
        <div class="detail-header-card">
          <h2>${escHtml(title)}</h2>
          <p>${escHtml(location)} &nbsp;·&nbsp; ${escHtml(dateDisplay)}</p>
        </div>
        ${tabsHtml}
        <div class="detail-body" id="detail-body">
          ${buildDetailSkeleton()}
        </div>
      </div>
    </div>
    <nav class="detail-bottom-nav" style="display:none">
      <div class="nav-inner">
        <button class="detail-back-nav-btn nav-btn active">
          <span class="nav-icon">←</span>
          <span class="nav-label">Назад</span>
        </button>
      </div>
    </nav>
  `;

  const closeOverlay = () => {
    overlay.classList.add('detail-overlay--closing');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    window.Telegram?.WebApp?.BackButton?.hide();
  };

  // Back buttons
  overlay.querySelector('.detail-back-btn').addEventListener('click', closeOverlay);
  overlay.querySelector('.detail-back-nav-btn').addEventListener('click', closeOverlay);

  // Refresh
  overlay.querySelector('.detail-refresh-btn').addEventListener('click', async () => {
    const btn = overlay.querySelector('.detail-refresh-btn');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>';

    // Remember which tab is active before reload
    const activeChip = overlay.querySelector('#detail-chips .chip.active');
    const activeDetailId = activeChip?.dataset.detailId || null;

    // Show skeleton while loading
    const body = overlay.querySelector('#detail-body');
    if (body) body.innerHTML = buildDetailSkeleton();

    try {
      const allConfig = await fetchConfig();
      const detailItems = allConfig.filter(c => c.pageId === 'details' && c.parentId === parentItem.id);
      const withRows = await Promise.all(
        detailItems.map(async item => ({ ...item, result: await fetchResults(item) }))
      );
      renderDetailContent(overlay, parentItem, withRows);

      // Restore active tab after render
      if (activeDetailId) {
        overlay.querySelectorAll('#detail-chips .chip').forEach(c => {
          c.classList.toggle('active', c.dataset.detailId === activeDetailId);
        });
        overlay.querySelectorAll('.detail-table-section').forEach(s => {
          s.style.display = s.dataset.detailId === activeDetailId ? '' : 'none';
        });
      }
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = 'Оновити';
      }, 600);
    }
  });

  // TG back button
  const tg = window.Telegram?.WebApp;
  if (tg?.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(closeOverlay);
  }

  // Tab chips
  if (hasAnyTabs) {
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

  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Renders loaded tables into an open detail overlay.
 */
function renderDetailContent(overlay, parentItem, detailItems) {
  const body = overlay.querySelector('#detail-body');
  if (!body) return;

  if (!detailItems || detailItems.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160">
        <p>Даних поки немає</p>
      </div>`;
    return;
  }

  const hasTabs = detailItems.length > 1;

  body.innerHTML = detailItems.map((item, i) => {
    const divSet = parseDividers(item.dividers);
    let tableHtml;

    if (item.result?.type === 'rich') {
      const rows = item.result.rows || [];
      if (rows.filter(r => !r.h).length === 0) {
        // Has headers but no data rows
        tableHtml = null;
      } else {
        const { thead, tbody } = renderRichTable(item.result, divSet, null);
        tableHtml = `<thead>${thead}</thead><tbody>${tbody}</tbody>`;
      }
    }

    const visible = !hasTabs || i === 0;

    if (!tableHtml) {
      return `
        <div class="detail-table-section" data-detail-id="${escHtml(item.id)}"
             style="${visible ? '' : 'display:none'}">
          <div class="empty-state">
            <img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160">
            <p>Даних поки немає</p>
          </div>
        </div>`;
    }

    return `
      <div class="detail-table-section" data-detail-id="${escHtml(item.id)}"
           style="${visible ? '' : 'display:none'}">
        <div class="result-card">
          <div class="result-table-wrap">
            <table class="result-table">${tableHtml}</table>
          </div>
        </div>
      </div>`;
  }).join('');

  // Row highlight — reuse global handler
  body.addEventListener('click', handleRowClick);
}

/**
 * Attaches "Переглянути детальніше →" click handlers.
 */
function initDetailButtons(items, onOpen) {
  document.querySelectorAll('.btn-show-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.cardId;
      const item = items.find(i => i.id === id);
      if (item && onOpen) onOpen(item);
    });
  });
}

/**
 * Renders the full results list.
 */
function renderResults(items, activeFilter = 'all') {
  renderResultsTo('results-list', items, activeFilter);
}

function renderResultsTo(containerId, items, activeFilter = 'all') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = activeFilter === 'all'
    ? items
    : items.filter(item => item.tag_title === activeFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160">
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
        <img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160">
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
/**
 * Renders a single federation card.
 */
function renderFederationCard(fed) {
  const avatar = fed.photoUrl
    ? `<img src="${escHtml(fed.photoUrl)}" class="fed-avatar" alt="${escHtml(fed.short || fed.name)}" onerror="this.style.display='none'">`
    : `<div class="fed-avatar fed-avatar-placeholder">${escHtml((fed.short || fed.name).charAt(0))}</div>`;

  const captainHtml = fed.captain
    ? `<div class="fed-captain">👤 Капітан: <strong>${escHtml(fed.captain)}</strong></div>` : '';

  const membersHtml = fed.members?.length
    ? `<div class="fed-members">${fed.members.map(m => `<span class="member-tag">${escHtml(m)}</span>`).join('')}</div>` : '';

  const linksHtml = [
    fed.phone ? `<a href="tel:${escHtml(fed.phone)}"    class="fed-link">📞 ${escHtml(fed.phone)}</a>` : '',
    fed.email ? `<a href="mailto:${escHtml(fed.email)}" class="fed-link">📧 ${escHtml(fed.email)}</a>` : '',
  ].filter(Boolean).join('');

  const hasBody = captainHtml || membersHtml || linksHtml;

  return `
    <div class="fed-card">
      <div class="fed-header" role="button" tabindex="0">
        ${avatar}
        <div class="fed-info">
          <div class="fed-name">${escHtml(fed.name)}</div>
          ${fed.region ? `<div class="fed-region">${escHtml(fed.region)}</div>` : ''}
        </div>
        ${hasBody ? '<span class="fed-arrow">▼</span>' : ''}
      </div>
      ${hasBody ? `<div class="fed-body">${captainHtml}${membersHtml}${linksHtml}</div>` : ''}
    </div>`;
}

/**
 * Renders the full About section.
 */
function renderAbout(about) {
  const container = document.getElementById('about-content');
  if (!container) return;

  // Contact rows (hardcoded)
  const contactRows = (about.contacts || []).map(c => {
    const val = c.url
      ? `<a href="${escHtml(c.url)}"${c.url.startsWith('http') ? ' target="_blank"' : ''} style="color:var(--c-blue-main)">${escHtml(c.value)}</a>`
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

  // Federations from API
  const federations = about.federations || [];
  const fedHtml = federations.length
    ? federations.map(renderFederationCard).join('')
    : `<div class="empty-state"><img src="assets/imgs/rainbow trout.png" class="empty-state-img" alt="" width="160" height="160"><p>Дані федерацій завантажуються...</p></div>`;

  container.innerHTML = `
    <div class="about-section">
      <div class="section-label">Контакти</div>
      <div class="info-card">${contactRows}</div>
    </div>
    <div class="about-section">
      <div class="section-label">Обласні федерації</div>
      <div class="fed-list">${fedHtml}</div>
    </div>
  `;

  // Accordion toggle
  container.querySelectorAll('.fed-header').forEach(header => {
    const card = header.closest('.fed-card');
    if (!card.querySelector('.fed-body')) return;
    const toggle = () => card.classList.toggle('open');
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
