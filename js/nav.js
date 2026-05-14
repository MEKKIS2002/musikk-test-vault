// === nav.js ===
// Central navigation system for Music Vault.
// Single source of truth for page switching.
//
// USAGE: navigateTo('mixtapes') — switches to a page by ID
//
// PAGE IDs map to:
//   'overview'     → #overviewTab     (renderOverview)
//   'mixtapes'     → #mixtapesTab     (renderMixtapes)
//   'albums'       → #albumsTab       (renderAlbums)
//   'beats'        → #beatsTab        (renderBeatsTab)
//   'pipeline'     → #pipelineTab     (renderPipeline)
//   'archive'      → #archiveTab      (renderArchiveView — dynamic)
//   'integrations' → #integrationsTab (renderIntegrations)
//   'lyriclab'     → #lyriclabTab     (placeholder)
//   'ideabank'     → #ideabankTab     (placeholder)
//   'settings'     → #settingsTab     (placeholder)
//
// PAGE RENDER FUNCTIONS:
//   Registered via registerPage(id, renderFn).
//   db.js registers mixtapes/albums/pipeline/integrations on load.
//   archive.js registers 'archive' via window.renderArchiveView.
//   beats-tab.js registers 'beats' via window.renderBeatsTab.

(function () {
  'use strict';

  const STORAGE_KEY = 'mv_current_page';
  const DEFAULT_PAGE = 'mixtapes';
  let _currentPage = null;
  const _renderers = {};

  // ── Public: register a render function for a page ────────────────────────
  function registerPage(id, renderFn) {
    _renderers[id] = renderFn;
  }

  // ── Show/hide tab sections ────────────────────────────────────────────────
  function showSection(pageId) {
    // Hide all .tab-view sections
    document.querySelectorAll('.tab-view').forEach(s => {
      s.classList.remove('tab-visible');
      if (s.id !== `${pageId}Tab`) s.classList.add('hidden');
    });

    // Archive is special — created dynamically
    if (pageId === 'archive') {
      if (typeof window.renderArchiveView === 'function') {
        window.renderArchiveView();
      }
      requestAnimationFrame(() => {
        const el = document.getElementById('archiveTab');
        if (el) {
          el.classList.remove('hidden');
          requestAnimationFrame(() => el.classList.add('tab-visible'));
        }
      });
      return;
    }

    const el = document.getElementById(`${pageId}Tab`);
    if (!el) {
      // Fallback: show a 404-style message
      _showFallback(pageId);
      return;
    }
    el.classList.remove('hidden');
    el.classList.remove('tab-visible');
    requestAnimationFrame(() => el.classList.add('tab-visible'));
  }

  // ── Fallback for missing pages ────────────────────────────────────────────
  function _showFallback(pageId) {
    let el = document.getElementById('mvFallbackPage');
    if (!el) {
      el = document.createElement('section');
      el.id = 'mvFallbackPage';
      el.className = 'tab-view';
      el.innerHTML = `<div class="mv-placeholder">
        <div class="mv-placeholder-icon">🚧</div>
        <h2 id="mvFallbackTitle">Side ikke funnet</h2>
        <p>Denne siden er ikke bygget ennå.</p>
        <button class="primary-btn" onclick="navigateTo('${DEFAULT_PAGE}')">Gå til Mixtapes</button>
      </div>`;
      const main = document.getElementById('mvMain');
      if (main) main.appendChild(el);
    }
    el.querySelector('#mvFallbackTitle').textContent = `Siden "${pageId}" finnes ikke ennå`;
    document.querySelectorAll('.tab-view').forEach(s => s.classList.add('hidden'));
    el.classList.remove('hidden');
    el.classList.add('tab-visible');
  }

  // ── Update sidebar active state ───────────────────────────────────────────
  function syncSidebar(pageId) {
    document.querySelectorAll('.mv-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
  }

  // ── Render the page content ───────────────────────────────────────────────
  function renderPage(pageId) {
    const fn = _renderers[pageId];
    if (typeof fn === 'function') {
      fn();
    } else if (pageId === 'archive' && typeof window.renderArchiveView === 'function') {
      // archive.js registers itself on window
    } else if (pageId === 'beats' && typeof window.renderBeatsTab === 'function') {
      window.renderBeatsTab();
    } else if (pageId === 'overview') {
      renderOverview();
    }
    // Placeholders and missing pages: no render needed
  }

  // ── Main navigation function ──────────────────────────────────────────────
  function navigateTo(pageId, options = {}) {
    if (!pageId) pageId = DEFAULT_PAGE;

    // Role check (viewer mode: only mixtapes and beats)
    const role = sessionStorage.getItem('mv_role') || '';
    if (role === 'viewer' && !['mixtapes', 'beats'].includes(pageId)) {
      pageId = 'mixtapes';
    }
    if (role === 'producer' && !['mixtapes', 'pipeline'].includes(pageId)) {
      pageId = 'mixtapes';
    }

    _currentPage = pageId;
    try { sessionStorage.setItem(STORAGE_KEY, pageId); } catch (e) {}

    showSection(pageId);
    syncSidebar(pageId);
    if (!options.skipRender) renderPage(pageId);

    if (!options.skipScroll) window.scrollTo(0, 0);
  }

  // ── Overview page render ──────────────────────────────────────────────────
  function renderOverview() {
    const el = document.getElementById('overviewContent');
    if (!el) return;
    const st = typeof state !== 'undefined' ? state : window.state;
    if (!st) return;

    const beats       = (st.beats   || []).filter(b => !b.archived);
    const mixtapes    = (st.mixtapes|| []).filter(m => !m.archived);
    const albums      = (st.albums  || []).filter(a => !a.archived);
    const favs        = beats.filter(b => b.favorite);
    const avgDone     = beats.length
      ? Math.round(beats.reduce((s, b) => s + (Number(b.done)||0), 0) / beats.length)
      : 0;

    el.innerHTML = `
      <div class="overview-header">
        <h1>Oversikt</h1>
        <p class="hint">Hei, Marcus. Her er statusen på prosjektene dine.</p>
      </div>
      <div class="overview-stats">
        <div class="ov-stat" onclick="navigateTo('beats')">
          <span class="ov-stat-num">${beats.length}</span>
          <span class="ov-stat-label">Beats</span>
        </div>
        <div class="ov-stat" onclick="navigateTo('mixtapes')">
          <span class="ov-stat-num">${mixtapes.length}</span>
          <span class="ov-stat-label">Mixtapes</span>
        </div>
        <div class="ov-stat" onclick="navigateTo('albums')">
          <span class="ov-stat-num">${albums.length}</span>
          <span class="ov-stat-label">Albumer</span>
        </div>
        <div class="ov-stat">
          <span class="ov-stat-num">${avgDone}%</span>
          <span class="ov-stat-label">Snitt ferdig</span>
        </div>
      </div>
      <div class="overview-sections">
        ${favs.length ? `
          <div class="ov-section">
            <div class="ov-section-title">⭐ Favoritter</div>
            <div class="ov-list">
              ${favs.slice(0,5).map(b => `
                <div class="ov-list-row" onclick="navigateTo('beats')">
                  <span class="ov-list-name">${esc ? esc(b.name) : b.name}</span>
                  <span class="ov-list-meta">${b.done||0}% ferdig</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
        <div class="ov-section">
          <div class="ov-section-title">📼 Siste mixtapes</div>
          <div class="ov-list">
            ${mixtapes.slice(0,4).map(m => {
              const n = (m.beatIds||[]).filter(id => beats.find(b=>b.id===id)).length;
              return `<div class="ov-list-row" onclick="navigateTo('mixtapes')">
                <span class="ov-list-name">${esc ? esc(m.name) : m.name}</span>
                <span class="ov-list-meta">${n} beat${n===1?'':'s'}</span>
              </div>`;
            }).join('') || '<p class="hint" style="padding:8px 0">Ingen mixtapes ennå.</p>'}
          </div>
        </div>
        <div class="ov-section">
          <div class="ov-section-title">📁 Albumer i arbeid</div>
          <div class="ov-list">
            ${albums.filter(a=>(a.done||0)<100).slice(0,4).map(a => {
              const n = (a.beatIds||[]).filter(id => beats.find(b=>b.id===id)).length;
              return `<div class="ov-list-row" onclick="navigateTo('albums')">
                <span class="ov-list-name">${esc ? esc(a.name) : a.name}</span>
                <span class="ov-list-meta">${n} beat${n===1?'':'s'}</span>
              </div>`;
            }).join('') || '<p class="hint" style="padding:8px 0">Ingen albumer ennå.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  // ── CSS for overview ──────────────────────────────────────────────────────
  function injectOverviewCSS() {
    if (document.getElementById('nav-overview-style')) return;
    const s = document.createElement('style');
    s.id = 'nav-overview-style';
    s.textContent = `
      .overview-header { margin-bottom: 28px; }
      .overview-header h1 { font-size: 28px; font-weight: 900; letter-spacing: -.04em; margin: 0 0 6px; }
      .overview-stats {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
        margin-bottom: 32px;
      }
      .ov-stat {
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 14px;
        padding: 18px 16px;
        cursor: pointer;
        transition: background .15s;
        text-align: center;
      }
      .ov-stat:hover { background: rgba(255,255,255,.1); }
      .ov-stat-num { display: block; font-size: 28px; font-weight: 900; letter-spacing: -.04em; color: var(--mv-amber, #f4a443); }
      .ov-stat-label { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
      .overview-sections { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
      .ov-section { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 16px 18px; }
      .ov-section-title { font-size: 12px; font-weight: 800; letter-spacing: .06em; color: var(--muted); text-transform: uppercase; margin-bottom: 10px; }
      .ov-list { display: flex; flex-direction: column; gap: 2px; }
      .ov-list-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 8px; border-radius: 8px; cursor: pointer; transition: background .12s; }
      .ov-list-row:hover { background: rgba(255,255,255,.06); }
      .ov-list-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ov-list-meta { font-size: 11px; color: var(--muted); flex-shrink: 0; margin-left: 8px; }
    `;
    document.head.appendChild(s);
  }

  // ── Sidebar click handler ─────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('.mv-nav-btn[data-page]');
    if (btn) navigateTo(btn.dataset.page);
  });

  // ── Init on load ──────────────────────────────────────────────────────────
  function init() {
    injectOverviewCSS();

    // Register render functions for existing pages
    if (typeof renderMixtapes  === 'function') registerPage('mixtapes',     renderMixtapes);
    if (typeof renderAlbums    === 'function') registerPage('albums',       renderAlbums);
    if (typeof renderPipeline  === 'function') registerPage('pipeline',     renderPipeline);
    if (typeof renderIntegrations==='function') registerPage('integrations', renderIntegrations);
    registerPage('overview', renderOverview);

    // Restore last visited page (default: mixtapes)
    const saved = sessionStorage.getItem(STORAGE_KEY) || DEFAULT_PAGE;
    navigateTo(saved, { skipScroll: true });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.navigateTo   = navigateTo;
  window.registerPage = registerPage;

  if (document.readyState !== 'loading') setTimeout(init, 0);
  else document.addEventListener('DOMContentLoaded', init);
})();
