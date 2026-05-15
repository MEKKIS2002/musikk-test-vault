// === lyriclab.js ===
// Lyric Lab — fullskjerm teksteditor med beat-info og skriveanalyse.
//
// DATAMODELL per beat:
//   beat.lyricSections: Array<{id, type, title, text, collapsed, order}>
//   beat.lyricLabStatus: 'utkast' | 'skriver' | 'demo' | 'revisjon' | 'ferdig'
//   beat.lyrics: eksisterende felt — brukes som fallback, aldri slettet
//
// INNGANGER:
//   openInLyricLab(beatId) — sett currentLyricLabBeatId og bytt tab
//
// GLOBALT:
//   window.currentLyricLabBeatId
//   window.renderLyricLab

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  const DEFAULT_SECTIONS = [
    { id: 'hook',   type: 'hook',   title: 'Hook',   text: '', collapsed: false, done: false, order: 0 },
    { id: 'verse1', type: 'verse',  title: 'Vers 1', text: '', collapsed: false, done: false, order: 1 },
    { id: 'bridge', type: 'bridge', title: 'Bro',    text: '', collapsed: false, done: false, order: 2 },
    { id: 'verse2', type: 'verse',  title: 'Vers 2', text: '', collapsed: false, done: false, order: 3 },
    { id: 'outro',  type: 'outro',  title: 'Outro',  text: '', collapsed: true,  done: false, order: 4 },
  ];
  const STATUS_OPTIONS = ['utkast','skriver','demo','revisjon','ferdig'];
  const TYPE_LABELS    = { hook:'Hook', verse:'Vers', bridge:'Bro', outro:'Outro', custom:'Custom' };

  let _lastSaved = null;
  let _saveTimer = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function getState(){ return typeof state !== 'undefined' ? state : window.state; }
  function getBeat(id){ return (getState()?.beats||[]).find(b=>b.id===id); }
  function uid(){ return Math.random().toString(36).slice(2,10); }
  function fmtDur(sec){ sec=Number(sec||0); if(!isFinite(sec)||sec<=0) return '--:--'; return Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0'); }

  // ── Data helpers ──────────────────────────────────────────────────────────
  // Strip HTML tags from rich-text lyrics (old editor used contenteditable with spans)
  function stripHtml(html) {
    if (!html || !html.includes('<')) return html || '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function getSections(beat) {
    if (beat.lyricSections && beat.lyricSections.length) {
      // Also strip any HTML that crept into existing sections
      beat.lyricSections.forEach(s => { s.text = stripHtml(s.text); });
      return beat.lyricSections;
    }
    // Migrate existing lyrics string into Hook section (strip HTML first)
    const sections = DEFAULT_SECTIONS.map(s => ({...s}));
    if (beat.lyrics && beat.lyrics.trim()) sections[0].text = stripHtml(beat.lyrics);
    beat.lyricSections = sections;
    return sections;
  }

  function saveSections(beat) {
    if (typeof saveState === 'function') saveState();
    _lastSaved = new Date();
    updateStatusBar();
  }

  // ── Text analysis ─────────────────────────────────────────────────────────
  function allText(beat) {
    return (getSections(beat)||[]).map(s=>s.text).join('\n');
  }
  function countWords(text) {
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }
  function countLines(text) {
    return text.trim() ? text.split('\n').filter(l=>l.trim()).length : 0;
  }
  function estimateDuration(words) {
    // ~120 words/min rapping = 0.5s/word
    const mins = words / 120;
    const s = Math.round(mins * 60);
    return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  }
  function repeatedWords(text) {
    const words = text.toLowerCase().replace(/[^a-zæøå\s]/g,'').split(/\s+/).filter(w=>w.length>3);
    const freq = {};
    words.forEach(w => freq[w] = (freq[w]||0)+1);
    return Object.entries(freq).filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).slice(0,8);
  }
  function missingSections(beat) {
    const have = new Set((getSections(beat)||[]).filter(s=>s.done || s.text.trim()).map(s=>s.type));
    return ['hook','verse','bridge'].filter(t=>!have.has(t));
  }

  // ── Status bar ────────────────────────────────────────────────────────────
  function updateStatusBar() {
    const beat = getBeat(window.currentLyricLabBeatId);
    const el = document.getElementById('llStatusBar');
    if (!el || !beat) return;
    const txt = allText(beat);
    const w = countWords(txt), l = countLines(txt);
    document.getElementById('llStatWords').textContent = w;
    document.getElementById('llStatLines').textContent = l;
    document.getElementById('llStatDur').textContent   = estimateDuration(w);
    if (_lastSaved) document.getElementById('llLastSaved').textContent = 'Lagret ' + _lastSaved.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
  }

  // ── Waveform bars HTML ────────────────────────────────────────────────────
  function waveformHTML() {
    const heights = [20,35,55,70,50,80,65,45,90,70,55,40,75,60,45,30,65,50,35,55,70,45,60,80,55];
    return heights.map(h => `<div class="ll-waveform-bar" style="height:${h}%"></div>`).join('');
  }

  // ── Section HTML ──────────────────────────────────────────────────────────
  function sectionHTML(sec, beat) {
    const typeClass = `ll-type-${sec.type}`;
    const lineNums  = sec.text.split('\n').map((_,i)=>i+1).join('\n');
    const lineCount = countLines(sec.text);
    return `
    <div class="ll-section${sec.collapsed?' collapsed':''}" data-section-id="${esc(sec.id)}" id="llsec-${esc(sec.id)}">
      <div class="ll-section-header" onclick="llToggleSection('${esc(sec.id)}')">
        <span class="ll-section-type ${typeClass}">${esc(TYPE_LABELS[sec.type]||sec.type)}</span>
        <input class="ll-section-title-input" value="${esc(sec.title)}" onclick="event.stopPropagation()"
          onchange="llRenameSection('${esc(sec.id)}',this.value)">
        <span class="ll-section-line-count">${lineCount} ${lineCount===1?'linje':'linjer'}</span>
        <button class="ll-section-menu-btn" onclick="event.stopPropagation();llToggleSectionMenu('${esc(sec.id)}')">⋯</button>
        <button class="ll-section-done-btn${sec.done?' done':''}" onclick="event.stopPropagation();llToggleSectionDone('${esc(sec.id)}')" title="${sec.done?'Ferdig':'Merk som ferdig'}">
          ${sec.done?'✓':'○'}
        </button>
        <button class="ll-section-toggle">${sec.collapsed?'▸':'▾'}</button>
      </div>
      <div class="ll-section-body">
        <div class="ll-line-numbers" id="llnums-${esc(sec.id)}">${sec.text.split('\n').map((_,i)=>i+1).join('\n')}</div>
        <textarea class="ll-textarea" id="lltxt-${esc(sec.id)}"
          placeholder="Skriv ${sec.title.toLowerCase()} her..."
          oninput="llSectionInput(this,'${esc(sec.id)}')"
          rows="${Math.max(5, sec.text.split('\n').length + 2)}"
        >${esc(sec.text)}</textarea>
      </div>
      <div class="ll-section-menu" id="llmenu-${esc(sec.id)}">
        <button onclick="llDuplicateSection('${esc(sec.id)}')">⧉ Dupliser</button>
        <button onclick="llMoveSectionUp('${esc(sec.id)}')">↑ Flytt opp</button>
        <button onclick="llMoveSectionDown('${esc(sec.id)}')">↓ Flytt ned</button>
        <button class="danger" onclick="llDeleteSection('${esc(sec.id)}')">🗑 Slett seksjon</button>
      </div>
    </div>`;
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function renderLyricLab() {
    const container = document.getElementById('lyricLabContent');
    if (!container) return;

    const beatId = window.currentLyricLabBeatId;
    const beat   = beatId ? getBeat(beatId) : null;

    if (!beat) {
      renderEmptyState(container);
      return;
    }

    const sections = getSections(beat);
    const txt      = allText(beat);
    const words    = countWords(txt);
    const lines    = countLines(txt);
    const repeated = repeatedWords(txt);
    const missing  = missingSections(beat);
    const status   = beat.lyricLabStatus || 'utkast';
    const dur      = fmtDur(beat.duration);
    const coverEl  = beat.cover
      ? `<img class="ll-cover-img" src="${esc(beat.cover)}" alt="${esc(beat.name)}">`
      : `<div class="ll-cover-ph">🎵</div>`;

    container.innerHTML = `
<div class="ll-wrap">
<div class="ll-header">\n  <button class="ll-back-btn" onclick="llGoBack()">← Tilbake</button>\n  <span class="ll-header-sep">|</span>\n  <span class="ll-header-beat">✍️ Lyric Lab · ${esc(beat.name)}</span>\n  <button class="ll-change-beat-btn" onclick="llShowBeatPicker()" title="Velg annen låt">⇄ Bytt låt</button>\n</div>
<div class="ll-layout">

  <!-- LEFT: Beat info -->
  <div class="ll-left">
    <div class="ll-cover-wrap">
      ${coverEl}
      <div class="ll-play-overlay" onclick="llPlayBeat()">
        <button class="ll-play-overlay-btn" id="llPlayBtn">▶</button>
      </div>
    </div>

    <div class="ll-card ll-info-card">
      <div class="ll-beat-title">${esc(beat.name)}</div>
      ${beat.source ? `<div class="ll-beat-source">prod. ${esc(beat.source)}</div>` : ''}

      <div class="ll-wavesurfer-wrap">
      <div id="llWaveSurfer" style="width:100%;height:64px;cursor:crosshair"></div>
      <div class="ll-wave-controls">
        <button class="ll-wave-btn" id="llWavePlayBtn" onclick="llWavePlay()" title="Spill/pause">▶</button>
        <button class="ll-wave-btn" id="llWaveLoopBtn" onclick="llToggleLoop()" title="Loop region">↺ Loop</button>
        <button class="ll-wave-btn" onclick="llClearLoop()" title="Fjern loop">✕ Fjern</button>
      </div>
      <div class="ll-wave-zoom-row">
        <span class="ll-wave-zoom-label">🔍 Zoom</span>
        <input type="range" id="llWaveZoom" min="1" max="20" value="1"
          style="flex:1;accent-color:#f4a443;cursor:pointer"
          oninput="llZoomWave(this.value)">
        <span id="llWaveZoomVal" class="ll-wave-zoom-val">1×</span>
      </div>
      <div class="ll-wave-hint">Klikk og dra på bølgeformen for å markere loopområde</div>
    </div>

      <div class="ll-meta-row"><span class="ll-meta-key">Varighet</span><span class="ll-meta-val">${dur}</span></div>
      ${beat.bpm ? `<div class="ll-meta-row"><span class="ll-meta-key">BPM</span><span class="ll-meta-val">${esc(String(beat.bpm))}</span></div>` : ''}
      ${beat.key  ? `<div class="ll-meta-row"><span class="ll-meta-key">Toneart</span><span class="ll-meta-val">${esc(beat.key)}</span></div>` : ''}
      ${beat.mood ? `<div class="ll-meta-row"><span class="ll-meta-key">Mood</span><span class="ll-meta-val">${esc(beat.mood)}</span></div>` : ''}

      <div>
        <div class="ll-meta-key" style="margin-bottom:4px">Status</div>
        <select class="ll-status-select" onchange="llSetStatus(this.value)">
          ${STATUS_OPTIONS.map(s=>`<option value="${s}"${s===status?' selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="ll-action-btns">
      <button class="ll-btn primary" onclick="llPlayBeat()">▶ Spill beat</button>
      <button class="ll-btn" id="llTakeBtn" onclick="llRecordTake()" style="background:rgba(251,113,133,.08);border-color:rgba(251,113,133,.3);color:#fb7185">🎙️ Spill inn over beat</button>
      <button class="ll-btn muted" id="llMemoBtn" onclick="llRecordMemo()">⬤ Hurtigmemo</button>
    </div>
    <div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.25);text-transform:uppercase">Takes</div>
      <div id="llTakeList"></div>
    </div>
    <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.06);padding-top:8px;display:flex;flex-direction:column;gap:5px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.25);text-transform:uppercase">Memoer</div>
      <div id="llMemoList"></div>
    </div>
  </div>

  <!-- CENTER: Editor -->
  <div class="ll-center">
    <div class="ll-editor-header">
      <div class="ll-editor-title">✍️ ${esc(beat.name)}</div>
      <button class="ll-add-section-btn" onclick="llAddSection()">+ Legg til seksjon</button>
    </div>

    <div id="llSections">
      ${sections.sort((a,b)=>a.order-b.order).map(s=>sectionHTML(s,beat)).join('')}
    </div>

    <div class="ll-statusbar" id="llStatusBar">
      <div class="ll-statusbar-dot"></div>
      <span>Autosave aktiv</span>
      <span id="llLastSaved" style="color:var(--muted)">Ikke lagret ennå</span>
      <span style="margin-left:auto">Ord: <strong id="llStatWords">${words}</strong></span>
      <span>Linjer: <strong id="llStatLines">${lines}</strong></span>
      <span>Est.: <strong id="llStatDur">${estimateDuration(words)}</strong></span>
    </div>
  </div>

  <!-- RIGHT: Analysis -->
  <div class="ll-right">
    <div class="ll-card ll-stat-card">
      <div class="ll-stat-title">Statistikk</div>
      <div class="ll-stats-grid">
        <div class="ll-stat-item"><span class="ll-stat-num" id="llRightWords">${words}</span><span class="ll-stat-lbl">Ord</span></div>
        <div class="ll-stat-item"><span class="ll-stat-num" id="llRightLines">${lines}</span><span class="ll-stat-lbl">Linjer</span></div>
        <div class="ll-stat-item"><span class="ll-stat-num">${sections.filter(s=>s.text.trim()).length}</span><span class="ll-stat-lbl">Seksjoner</span></div>
        <div class="ll-stat-item"><span class="ll-stat-num" id="llRightDur">${estimateDuration(words)}</span><span class="ll-stat-lbl">Est. tid</span></div>
      </div>
    </div>

    ${missing.length ? `
    <div class="ll-card ll-stat-card">
      <div class="ll-stat-title">Mangler</div>
      <div class="ll-missing-list">
        ${missing.map(t=>`<div class="ll-missing-item">${TYPE_LABELS[t]||t}</div>`).join('')}
      </div>
    </div>` : `
    <div class="ll-card ll-stat-card">
      <div class="ll-stat-title">Seksjoner</div>
      <div style="font-size:12px;color:#34d399;font-weight:800">✓ Alle hoveddeler er med</div>
    </div>`}

    ${repeated.length ? `
    <div class="ll-card ll-stat-card">
      <div class="ll-stat-title">Gjentagende ord</div>
      <div class="ll-repeated-list">
        ${repeated.map(([w,n])=>`<span class="ll-word-chip">${esc(w)} ×${n}</span>`).join('')}
      </div>
    </div>` : ''}

    <div class="ll-card ll-stat-card" id="llRhymeCard">
      <div class="ll-stat-title">Rimbank</div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <input id="llRhymeInput" type="text" placeholder="Skriv et ord..."
          style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px 10px;color:var(--text);font-family:inherit;font-size:12px;outline:none"
          onkeydown="if(event.key==='Enter')llFindRhymes()"
          oninput="clearTimeout(window._rhymeTimer);window._rhymeTimer=setTimeout(llFindRhymes,500)">
        <button onclick="llFindRhymes()" style="background:rgba(244,164,67,.15);border:1px solid rgba(244,164,67,.3);border-radius:8px;padding:6px 10px;color:#f4a443;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap">Finn rim</button>
      </div>
      <div id="llRhymeResults" style="min-height:40px">
        <p style="font-size:11px;color:rgba(255,255,255,.25);margin:0">Skriv et ord for å se rimforslag</p>
      </div>
    </div>
  </div>

</div>
</div><!-- /.ll-wrap -->
`;
    _lastSaved = null;
    setTimeout(()=>{ renderMemoList(); renderTakeList(); initWaveSurfer(beat); }, 100);
    // Focus first empty textarea
    setTimeout(() => {
      const first = container.querySelector('.ll-textarea:not([data-has-content])');
      const emptyTa = Array.from(container.querySelectorAll('.ll-textarea')).find(ta=>!ta.value.trim());
      if (emptyTa) emptyTa.focus();
    }, 100);
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  function renderEmptyState(container) {
    const beats = (getState()?.beats||[]).filter(b=>!b.archived);
    const last  = beats.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
    container.innerHTML = `
<div class="ll-empty">
  <div class="ll-empty-icon">✍️</div>
  <h2>Velg en låt å skrive på</h2>
  <p>Lyric Lab samler beat, tekst og skrivehjelp på én skjerm. Velg et beat for å komme i gang.</p>
  <div class="ll-empty-btns">
    <button class="primary-btn" onclick="llPickBeat()">🎵 Velg fra beats</button>
    ${last ? `<button class="ghost-btn" onclick="openInLyricLab('${esc(last.id)}')">↩ Åpne siste: ${esc(last.name)}</button>` : ''}
    <button class="ghost-btn" onclick="llCreateNewBeat()">+ Opprett ny låt</button>
  </div>
</div>`;
  }

  // ── Section actions ───────────────────────────────────────────────────────
  window.llToggleSectionDone = function(id) {
    const beat = getBeat(window.currentLyricLabBeatId); if(!beat) return;
    const sec = getSections(beat).find(s=>s.id===id); if(!sec) return;
    sec.done = !sec.done;
    // Update button
    const btn = document.querySelector(`#llsec-${id} .ll-section-done-btn, #llins-sec-${id} .ll-section-done-btn`);
    if(btn){ btn.classList.toggle('done', sec.done); btn.textContent = sec.done ? '✓' : '○'; btn.title = sec.done ? 'Ferdig' : 'Merk som ferdig'; }
    saveSections(beat);
    // Update right panel missing sections
    updateRightPanel(beat);
  };
  window.llToggleSection = function(id) {
    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) return;
    const sec = getSections(beat).find(s=>s.id===id);
    if (!sec) return;
    sec.collapsed = !sec.collapsed;
    const el = document.getElementById(`llsec-${id}`);
    if (el) {
      el.classList.toggle('collapsed', sec.collapsed);
      const toggle = el.querySelector('.ll-section-toggle');
      if (toggle) toggle.textContent = sec.collapsed ? '▸' : '▾';
    }
    saveSections(beat);
  };

  window.llRenameSection = function(id, title) {
    const beat = getBeat(window.currentLyricLabBeatId);
    const sec  = getSections(beat||{}).find(s=>s.id===id);
    if (sec) { sec.title = title; saveSections(beat); }
  };

  window.llToggleSectionMenu = function(id) {
    document.querySelectorAll('.ll-section-menu.open').forEach(m=>{ if(m.id!==`llmenu-${id}`) m.classList.remove('open'); });
    document.getElementById(`llmenu-${id}`)?.classList.toggle('open');
  };
  // Only add the close-listener once
  if (!window._llMenuListenerAttached) {
    window._llMenuListenerAttached = true;
    document.addEventListener('click', e => {
      if (!e.target.closest('.ll-section-menu-btn') && !e.target.closest('.ll-section-menu'))
        document.querySelectorAll('.ll-section-menu.open').forEach(m=>m.classList.remove('open'));
    });
  }

  window.llSectionInput = function(ta, id) {
    const beat = getBeat(window.currentLyricLabBeatId);
    const sec  = getSections(beat||{}).find(s=>s.id===id);
    if (!sec) return;
    sec.text = ta.value;
    // Update line numbers
    const nums = document.getElementById(`llnums-${id}`);
    if (nums) nums.textContent = ta.value.split('\n').map((_,i)=>i+1).join('\n');
    // Update line count in header
    const cnt = document.getElementById(`llsec-${id}`)?.querySelector('.ll-section-line-count');
    const l = countLines(ta.value);
    if (cnt) cnt.textContent = `${l} ${l===1?'linje':'linjer'}`;
    // Debounced save
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { saveSections(beat); updateRightPanel(beat); }, 600);
  };

  window.llAddSection = function() {
    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) return;
    const secs  = getSections(beat);
    const newSec = { id: uid(), type: 'custom', title: 'Ny seksjon', text: '', collapsed: false, order: secs.length };
    secs.push(newSec);
    saveSections(beat);
    const container = document.getElementById('llSections');
    if (container) {
      container.insertAdjacentHTML('beforeend', sectionHTML(newSec, beat));
      const ta = document.getElementById(`lltxt-${newSec.id}`);
      if (ta) ta.focus();
    }
  };

  window.llDeleteSection = function(id) {
    if (!confirm('Slette seksjonen og teksten?')) return;
    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) return;
    beat.lyricSections = getSections(beat).filter(s=>s.id!==id);
    saveSections(beat);
    document.getElementById(`llsec-${id}`)?.remove();
  };

  window.llDuplicateSection = function(id) {
    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) return;
    const secs = getSections(beat);
    const src  = secs.find(s=>s.id===id);
    if (!src) return;
    const copy = {...src, id: uid(), title: src.title + ' (kopi)', order: secs.length};
    secs.push(copy);
    saveSections(beat);
    const container = document.getElementById('llSections');
    if (container) container.insertAdjacentHTML('beforeend', sectionHTML(copy, beat));
    document.getElementById(`llmenu-${id}`)?.classList.remove('open');
  };

  window.llMoveSectionUp = function(id) {
    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) return;
    const secs = getSections(beat).sort((a,b)=>a.order-b.order);
    const idx  = secs.findIndex(s=>s.id===id);
    if (idx <= 0) return;
    [secs[idx].order, secs[idx-1].order] = [secs[idx-1].order, secs[idx].order];
    saveSections(beat);
    renderLyricLab();
    document.getElementById(`llmenu-${id}`)?.classList.remove('open');
  };

  window.llMoveSectionDown = function(id) {
    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) return;
    const secs = getSections(beat).sort((a,b)=>a.order-b.order);
    const idx  = secs.findIndex(s=>s.id===id);
    if (idx >= secs.length-1) return;
    [secs[idx].order, secs[idx+1].order] = [secs[idx+1].order, secs[idx].order];
    saveSections(beat);
    renderLyricLab();
  };

  // ── Beat actions ──────────────────────────────────────────────────────────
  window.llGoBack = function() {
    const btn = document.querySelector('.tab-btn[data-tab="mixtapes"]');
    if (btn) btn.click();
  };
  window.llPlayBeat = function() {
    const id = window.currentLyricLabBeatId;
    if (!id) return;
    const wv = document.getElementById('llWaveform');
    if (typeof playSingleBeat === 'function') {
      playSingleBeat(id);
      if (wv) { wv.classList.remove('paused'); setTimeout(()=>wv.classList.add('paused'), 30000); }
    } else if (typeof showToast === 'function') {
      showToast('Lydavspilling ikke tilgjengelig ennå');
    }
  };

  window.llLoopHook = function() {
    if (typeof showToast === 'function') showToast('Loop hook kommer snart');
    else console.log('[LyricLab] Loop hook — not implemented yet');
  };

  // ── Voice memo + take recorder ───────────────────────────────────────────
  let _memoRecorder = null;
  let _memoChunks   = [];
  let _memoInterval = null;
  let _takeRecorder = null;
  let _takeChunks   = [];
  let _takeSecs     = 0;
  let _takeInterval = null;

  window.llRecordMemo = function() {
    if (_memoRecorder && _memoRecorder.state === 'recording') {
      _memoRecorder.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      if(typeof showToast==='function') showToast('Mikrofon ikke tilgjengelig i denne nettleseren');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        _memoChunks = [];
        const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        _memoRecorder = new MediaRecorder(stream, { mimeType: mime });
        _memoRecorder.ondataavailable = e => { if(e.data.size>0) _memoChunks.push(e.data); };
        _memoRecorder.onstart = () => {
          const btn = document.getElementById('llMemoBtn');
          if(btn){ btn.textContent='⏹ Stopp memo'; btn.style.background='rgba(251,113,133,.2)'; btn.style.borderColor='rgba(251,113,133,.4)'; }
          let secs = 0;
          _memoInterval = setInterval(()=>{ secs++; const b=document.getElementById('llMemoBtn'); if(b) b.textContent=`⏹ Stopp (${secs}s)`; if(secs>=60) _memoRecorder?.stop(); }, 1000);
          if(typeof showToast==='function') showToast('⬤ Tar opp memo... (maks 60s)');
        };
        _memoRecorder.onstop = () => {
          clearInterval(_memoInterval);
          stream.getTracks().forEach(t=>t.stop());
          const btn = document.getElementById('llMemoBtn');
          if(btn){ btn.textContent='⬤ Ta opp memo'; btn.style.background=''; btn.style.borderColor=''; }
          const blob = new Blob(_memoChunks, { type: mime });
          const reader = new FileReader();
          reader.onload = e => {
            const beat = getBeat(window.currentLyricLabBeatId);
            if(!beat) return;
            if(!beat.memos) beat.memos = [];
            beat.memos.push({ id: uid(), url: e.target.result, ts: Date.now(), mime });
            if(typeof saveState==='function') saveState();
            renderMemoList();
            if(typeof showToast==='function') showToast('✓ Memo lagret');
          };
          reader.readAsDataURL(blob);
        };
        _memoRecorder.start(500);
      })
      .catch(err => {
        console.error('[LyricLab] Mic error:', err);
        if(typeof showToast==='function') showToast('Klarte ikke åpne mikrofon: ' + err.message);
      });
  };

  function renderMemoList() {
    const beat = getBeat(window.currentLyricLabBeatId);
    const el   = document.getElementById('llMemoList');
    if(!el || !beat) return;
    const memos = beat.memos || [];
    el.innerHTML = memos.length
      ? memos.map((m,i) => `
          <div class="ll-memo-row">
            <audio controls src="${m.url}" style="height:28px;flex:1;min-width:0"></audio>
            <span class="ll-memo-ts">${new Date(m.ts).toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'})}</span>
            <button class="ll-memo-del" onclick="llDeleteMemo('${esc(beat.id)}',${i})" title="Slett">✕</button>
          </div>`).join('')
      : '<p style="font-size:11px;color:var(--muted);margin:0">Ingen memoer ennå</p>';
  }

  window.llDeleteMemo = function(beatId, idx) {
    const beat = getBeat(beatId); if(!beat||!beat.memos) return;
    beat.memos.splice(idx, 1);
    if(typeof saveState==='function') saveState();
    renderMemoList();
  };

  window.llSetStatus = function(val) {
    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) return;
    beat.lyricLabStatus = val;
    if (typeof saveState === 'function') saveState();
  };

  // ── Empty state actions ────────────────────────────────────────────────────
  window.llPickBeat = function() {
    llShowBeatPicker();
  };

  window.llShowBeatPicker = function() {
    // Remove existing picker
    document.getElementById('llBeatPicker')?.remove();

    const st = getState();
    if (!st) return;

    const allBeats = (st.beats || []).filter(b => !b.archived);
    const mixtapes = (st.mixtapes || []).filter(m => !m.archived);
    const albums   = (st.albums   || []).filter(a => !a.archived);

    function beatsByCollection(colId, colType) {
      const col = colType === 'mixtape'
        ? mixtapes.find(m => m.id === colId)
        : albums.find(a => a.id === colId);
      return (col?.beatIds || [])
        .map(id => allBeats.find(b => b.id === id))
        .filter(Boolean);
    }

    function renderList(beats, emptyMsg) {
      if (!beats.length) return `<div class="ll-picker-empty">${emptyMsg}</div>`;
      return beats.map(b => `
        <div class="ll-picker-row" onclick="openInLyricLab('${esc(b.id)}');document.getElementById('llBeatPicker').remove()">
          ${b.cover ? `<img class="ll-picker-thumb" src="${esc(b.cover)}" alt="">` : '<div class="ll-picker-thumb ll-picker-ph">🎵</div>'}
          <div class="ll-picker-info">
            <div class="ll-picker-name">${esc(b.name)}</div>
            <div class="ll-picker-meta">${b.lyricLabStatus || 'utkast'}${b.bpm ? ' · ' + b.bpm + ' bpm' : ''}</div>
          </div>
          ${b.favorite ? '<span style="color:#f4a443;font-size:14px">★</span>' : ''}
        </div>`).join('');
    }

    const overlay = document.createElement('div');
    overlay.id = 'llBeatPicker';
    overlay.className = 'll-picker-overlay';
    overlay.innerHTML = `
      <div class="ll-picker-modal">
        <div class="ll-picker-header">
          <span style="font-size:16px;font-weight:900;letter-spacing:-.03em">Velg låt for Lyric Lab</span>
          <button onclick="document.getElementById('llBeatPicker').remove()" class="ll-picker-close">✕</button>
        </div>
        <input id="llPickerSearch" type="text" placeholder="Søk etter låt..." class="ll-picker-search"
          oninput="llFilterPicker(this.value)">
        <div class="ll-picker-tabs">
          <button class="ll-picker-tab active" onclick="llPickerTab(this,'all')">Alle beats</button>
          ${mixtapes.map(m => `<button class="ll-picker-tab" onclick="llPickerTab(this,'mt-${esc(m.id)}')">${esc(m.name)}</button>`).join('')}
          ${albums.map(a => `<button class="ll-picker-tab" onclick="llPickerTab(this,'al-${esc(a.id)}')">${esc(a.name)}</button>`).join('')}
        </div>
        <div class="ll-picker-list" id="llPickerList">
          ${renderList(allBeats, 'Ingen beats ennå')}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });

    // Store data for filtering
    overlay._allBeats = allBeats;
    overlay._mixtapes = mixtapes;
    overlay._albums   = albums;
    overlay._currentTab = 'all';

    document.getElementById('llPickerSearch')?.focus();
  };

  window.llPickerTab = function(btn, tabId) {
    document.querySelectorAll('.ll-picker-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const overlay = document.getElementById('llBeatPicker');
    if (!overlay) return;
    overlay._currentTab = tabId;
    llFilterPicker(document.getElementById('llPickerSearch')?.value || '');
  };

  window.llFilterPicker = function(query) {
    const overlay = document.getElementById('llBeatPicker');
    if (!overlay) return;
    const { _allBeats: all, _mixtapes: mts, _albums: albs, _currentTab: tab } = overlay;
    const q = query.toLowerCase().trim();

    let beats = all;
    if (tab.startsWith('mt-')) {
      const mt = mts.find(m => m.id === tab.slice(3));
      beats = (mt?.beatIds || []).map(id => all.find(b => b.id === id)).filter(Boolean);
    } else if (tab.startsWith('al-')) {
      const al = albs.find(a => a.id === tab.slice(3));
      beats = (al?.beatIds || []).map(id => all.find(b => b.id === id)).filter(Boolean);
    }

    if (q) beats = beats.filter(b => b.name.toLowerCase().includes(q));

    const list = document.getElementById('llPickerList');
    if (!list) return;
    list.innerHTML = beats.length
      ? beats.map(b => `
          <div class="ll-picker-row" onclick="openInLyricLab('${esc(b.id)}');document.getElementById('llBeatPicker')?.remove()">
            ${b.cover ? `<img class="ll-picker-thumb" src="${esc(b.cover)}" alt="">` : '<div class="ll-picker-thumb ll-picker-ph">🎵</div>'}
            <div class="ll-picker-info">
              <div class="ll-picker-name">${esc(b.name)}</div>
              <div class="ll-picker-meta">${b.lyricLabStatus || 'utkast'}${b.bpm ? ' · ' + b.bpm + ' bpm' : ''}</div>
            </div>
            ${b.favorite ? '<span style="color:#f4a443;font-size:14px">★</span>' : ''}
          </div>`).join('')
      : `<div class="ll-picker-empty">Ingen treff for "${esc(query)}"</div>`;
  };

  window.llCreateNewBeat = function() {
    if (typeof showToast === 'function') showToast('Opprett en sang i Mixtapes eller Albumer først');
  };

  // ── Update right panel without full re-render ─────────────────────────────
  function updateRightPanel(beat) {
    const txt      = allText(beat);
    const w        = countWords(txt);
    const l        = countLines(txt);
    const setTxt   = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    setTxt('llRightWords', w);
    setTxt('llRightLines', l);
    setTxt('llRightDur',   estimateDuration(w));
    setTxt('llStatWords',  w);
    setTxt('llStatLines',  l);
    setTxt('llStatDur',    estimateDuration(w));
  }


  // ── Inline section editor (used inside album/mixtape beat cards) ──────────
  function renderInlineSections(beatId) {
    const beat = getBeat(beatId);
    if (!beat) return '<p style="color:var(--muted);font-size:12px">Beat ikke funnet</p>';
    const sections = getSections(beat);
    return `<div class="ll-inline-editor" data-beat-id="${esc(beatId)}">
      <div class="ll-inline-sections" id="llins-${esc(beatId)}">
        ${sections.sort((a,b)=>a.order-b.order).map(s => inlineSectionHTML(s, beatId)).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
        <button class="ghost-btn" style="font-size:11px;padding:5px 10px" onclick="llInlineAddSection('${esc(beatId)}')">+ Seksjon</button>
        <button class="ghost-btn" style="font-size:11px;padding:5px 10px" onclick="openInLyricLab('${esc(beatId)}')">✍️ Åpne i Lyric Lab</button>
      </div>
    </div>`;
  }

  function inlineSectionHTML(sec, beatId) {
    const typeClass = `ll-type-${sec.type}`;
    const lineCount = countLines(sec.text);
    return `<div class="ll-section${sec.collapsed?' collapsed':''}" id="llins-sec-${esc(beatId)}-${esc(sec.id)}" style="margin-bottom:8px">
      <div class="ll-section-header" onclick="llInlineToggle('${esc(beatId)}','${esc(sec.id)}')">
        <span class="ll-section-type ${typeClass}">${esc(TYPE_LABELS[sec.type]||sec.type)}</span>
        <input class="ll-section-title-input" value="${esc(sec.title)}" onclick="event.stopPropagation()"
          onchange="llInlineRename('${esc(beatId)}','${esc(sec.id)}',this.value)">
        <span class="ll-section-line-count">${lineCount} ${lineCount===1?'linje':'linjer'}</span>
        <button class="ll-section-toggle">${sec.collapsed?'▸':'▾'}</button>
      </div>
      <div class="ll-section-body">
        <div class="ll-line-numbers" id="llins-nums-${esc(beatId)}-${esc(sec.id)}">${sec.text.split('\n').map((_,i)=>i+1).join('\n')}</div>
        <textarea class="ll-textarea" id="llins-txt-${esc(beatId)}-${esc(sec.id)}"
          placeholder="Skriv ${esc(sec.title.toLowerCase())} her..."
          oninput="llInlineInput(this,'${esc(beatId)}','${esc(sec.id)}')"
          rows="${Math.max(4, sec.text.split('\n').length + 2)}"
        >${esc(sec.text)}</textarea>
      </div>
    </div>`;
  }

  // Inline section actions
  window.llInlineToggle = function(beatId, secId) {
    const beat = getBeat(beatId); if(!beat) return;
    const sec = getSections(beat).find(s=>s.id===secId); if(!sec) return;
    sec.collapsed = !sec.collapsed;
    const el = document.getElementById(`llins-sec-${beatId}-${secId}`);
    if(el){ el.classList.toggle('collapsed', sec.collapsed); el.querySelector('.ll-section-toggle').textContent = sec.collapsed?'▸':'▾'; }
    saveSections(beat);
  };
  window.llInlineRename = function(beatId, secId, title) {
    const beat = getBeat(beatId); if(!beat) return;
    const sec = getSections(beat).find(s=>s.id===secId); if(!sec) return;
    sec.title = title; saveSections(beat);
  };
  window.llInlineInput = function(ta, beatId, secId) {
    const beat = getBeat(beatId); if(!beat) return;
    const sec = getSections(beat).find(s=>s.id===secId); if(!sec) return;
    sec.text = ta.value;
    const nums = document.getElementById(`llins-nums-${beatId}-${secId}`);
    if(nums) nums.textContent = ta.value.split('\n').map((_,i)=>i+1).join('\n');
    const cnt = document.getElementById(`llins-sec-${beatId}-${secId}`)?.querySelector('.ll-section-line-count');
    const l = countLines(ta.value);
    if(cnt) cnt.textContent = `${l} ${l===1?'linje':'linjer'}`;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => saveSections(beat), 600);
  };
  window.llInlineAddSection = function(beatId) {
    const beat = getBeat(beatId); if(!beat) return;
    const secs = getSections(beat);
    const newSec = {id: uid(), type:'custom', title:'Ny seksjon', text:'', collapsed:false, order:secs.length};
    secs.push(newSec);
    saveSections(beat);
    const container = document.getElementById(`llins-${beatId}`);
    if(container) container.insertAdjacentHTML('beforeend', inlineSectionHTML(newSec, beatId));
  };
  window.llInlineSave = function(beatId, text) {
    const beat = getBeat(beatId); if(!beat) return;
    const secs = getSections(beat);
    if(secs[0]) secs[0].text = text;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => saveSections(beat), 600);
  };

  // ── Record lyric take over beat ──────────────────────────────────────────
  window.llRecordTake = function() {
    if (_takeRecorder && _takeRecorder.state === 'recording') {
      _takeRecorder.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      if(typeof showToast==='function') showToast('Mikrofon ikke tilgjengelig');
      return;
    }

    const beat = getBeat(window.currentLyricLabBeatId);
    if (!beat) { if(typeof showToast==='function') showToast('Velg en sang først'); return; }

    // Countdown UI
    const btn = document.getElementById('llTakeBtn');
    const overlay = document.getElementById('llTakeOverlay');
    let count = 3;

    function startCountdown() {
      if(overlay) { overlay.style.display='flex'; overlay.querySelector('.ll-take-count').textContent = count; }
      if(btn) btn.textContent = `🎙️ Starter om ${count}s...`;
      const cd = setInterval(() => {
        count--;
        if(overlay) overlay.querySelector('.ll-take-count').textContent = count || 'REC';
        if(btn) btn.textContent = count > 0 ? `🎙️ Starter om ${count}s...` : '⏹ Stopp innspilling';
        if (count <= 0) {
          clearInterval(cd);
          startRecording();
        }
      }, 1000);
    }

    function startRecording() {
      // Don't use playSingleBeat — the blob Audio element handles playback
      const beatUrl = beat.audio_url || beat.url || null;

      function doRecord(blobUrl) {
        const localAudio = blobUrl ? new Audio(blobUrl) : null;

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(micStream => {
            _takeChunks = [];
            _takeSecs   = 0;
            const mime  = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dest     = audioCtx.createMediaStreamDestination();

            // Mic → mixer (with gain boost)
            const micSrc  = audioCtx.createMediaStreamSource(micStream);
            const micGain = audioCtx.createGain();
            micGain.gain.value = 1.5;
            micSrc.connect(micGain);
            micGain.connect(dest);

            // Beat blob → mixer via captureStream + also to speakers
            if (localAudio) {
              localAudio.volume = 1.0; // full volume
              localAudio.play().catch(()=>{});
              try {
                const cs = localAudio.captureStream?.() || localAudio.mozCaptureStream?.();
                if (cs) {
                  const beatSrc  = audioCtx.createMediaStreamSource(cs);
                  const beatGain = audioCtx.createGain();
                  beatGain.gain.value = 1.0;
                  beatSrc.connect(beatGain);
                  beatGain.connect(dest);                  // → recording
                  beatGain.connect(audioCtx.destination); // → speakers
                }
              } catch(e) { console.warn('[LyricLab] beat mix:', e.message); }
            }

            _takeRecorder = new MediaRecorder(dest.stream, { mimeType: mime });
            _takeRecorder.ondataavailable = e => { if(e.data.size>0) _takeChunks.push(e.data); };

            _takeRecorder.onstart = () => {
              if(overlay) {
                overlay.querySelector('.ll-take-count').textContent = '⬤';
                overlay.querySelector('.ll-take-label').textContent = `Spiller inn over ${esc(beat.name)}`;
              }
              _takeInterval = setInterval(() => {
                _takeSecs++;
                const m = Math.floor(_takeSecs/60), s = String(_takeSecs%60).padStart(2,'0');
                const timer = document.getElementById('llTakeTimer');
                if(timer) timer.textContent = `${m}:${s}`;
              }, 1000);
              if(typeof showToast==='function') showToast('🎙️ Innspilling startet');
            };

            _takeRecorder.onstop = () => {
              clearInterval(_takeInterval);
              micStream.getTracks().forEach(t=>t.stop());
              audioCtx.close().catch(()=>{});
              if(localAudio) { localAudio.pause(); }
              if(blobUrl) URL.revokeObjectURL(blobUrl);
              if(overlay) overlay.style.display='none';
              if(btn){ btn.textContent='🎙️ Spill inn over beat'; btn.style.background=''; }
              const blob2 = new Blob(_takeChunks, { type: mime });
              const reader = new FileReader();
              reader.onload = ev => {
                if(!beat.takes) beat.takes = [];
                beat.takes.push({ id: uid(), url: ev.target.result, ts: Date.now(), dur: _takeSecs, mime });
                if(typeof saveState==='function') saveState();
                renderTakeList();
                if(typeof showToast==='function') showToast(`✓ Take lagret (${_takeSecs}s)`);
              };
              reader.readAsDataURL(blob2);
            };

            _takeRecorder.start(500);
          })
          .catch(err => {
            if(overlay) overlay.style.display='none';
            if(btn) btn.textContent='🎙️ Spill inn over beat';
            if(typeof showToast==='function') showToast('Mikrofon feil: ' + err.message);
          });
      } // end doRecord

      if (beatUrl) {
        fetch(beatUrl)
          .then(r => r.blob())
          .then(b => doRecord(URL.createObjectURL(b)))
          .catch(() => doRecord(null));
      } else {
        doRecord(null);
      }
    }

    startCountdown();
  };
  function renderTakeList() {
    const beat = getBeat(window.currentLyricLabBeatId);
    const el   = document.getElementById('llTakeList');
    if(!el || !beat) return;
    const takes = beat.takes || [];
    el.innerHTML = takes.length
      ? takes.map((t,i) => {
          const m = Math.floor((t.dur||0)/60), s = String((t.dur||0)%60).padStart(2,'0');
          return `<div class="ll-memo-row">
            <audio controls src="${t.url}" style="height:28px;flex:1;min-width:0"></audio>
            <span class="ll-memo-ts">${m}:${s}</span>
            <button class="ll-memo-del" onclick="llDeleteTake('${esc(beat.id)}',${i})" title="Slett">✕</button>
          </div>`;
        }).join('')
      : '<p style="font-size:11px;color:var(--muted);margin:0">Ingen takes ennå</p>';
  }
  window.llDeleteTake = function(beatId, idx) {
    const beat = getBeat(beatId); if(!beat||!beat.takes) return;
    beat.takes.splice(idx, 1);
    if(typeof saveState==='function') saveState();
    renderTakeList();
  };

  window.renderInlineSections = renderInlineSections;


  // ── Rimbank via Claude API ────────────────────────────────────────────────
  window.llFindRhymes = async function() {
    const input = document.getElementById('llRhymeInput');
    const results = document.getElementById('llRhymeResults');
    if(!input || !results) return;
    const word = input.value.trim();
    if(!word) return;

    results.innerHTML = '<p style="font-size:11px;color:rgba(255,255,255,.4);margin:0">Søker...</p>';

    try {
      // Route through Cloudflare Worker (has ANTHROPIC_API_KEY as secret)
      const workerUrl = window.R2_WORKER_URL || 'https://beat-vault.marcus-aas-mekiassen.workers.dev';
      const res = await fetch(`${workerUrl}/rhyme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      const data = await res.json();
      const text = data.text || '';
      let parsed;
      try { parsed = JSON.parse(text.replace(/```json|```/g,'')); } catch(e) { throw new Error('Parse feil'); }

      const { perfekte = [], nesten = [] } = parsed;
      results.innerHTML = `
        ${perfekte.length ? `
          <div style="margin-bottom:8px">
            <div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.3);text-transform:uppercase;margin-bottom:5px">Perfekte rim</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${perfekte.map(w => `<button class="ll-rhyme-chip" onclick="llInsertRhyme('${w.replace(/'/g,"\'")}')">
                ${w}
              </button>`).join('')}
            </div>
          </div>` : ''}
        ${nesten.length ? `
          <div>
            <div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.3);text-transform:uppercase;margin-bottom:5px">Nesten-rim</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${nesten.map(w => `<button class="ll-rhyme-chip muted" onclick="llInsertRhyme('${w.replace(/'/g,"\'")}')">
                ${w}
              </button>`).join('')}
            </div>
          </div>` : ''}
      `;
    } catch(e) {
      results.innerHTML = `<p style="font-size:11px;color:#fb7185;margin:0">Feil: ${e.message}</p>`;
    }
  };

  // Click a rhyme chip to copy it
  window.llInsertRhyme = function(word) {
    navigator.clipboard?.writeText(word).then(()=>{
      if(typeof showToast==='function') showToast(`✓ Kopiert: ${word}`);
    }).catch(()=>{
      if(typeof showToast==='function') showToast(word);
    });
  };

  // Click on a word in a textarea to populate rhyme input
  document.addEventListener('mouseup', e => {
    const ta = e.target.closest('.ll-textarea');
    if(!ta) return;
    const sel = window.getSelection?.()?.toString().trim() || ta.value.substring(ta.selectionStart, ta.selectionEnd).trim();
    const word = sel.split(/\s+/)[0].replace(/[^a-zæøåA-ZÆØÅ]/g,'');
    if(word.length > 1) {
      const input = document.getElementById('llRhymeInput');
      if(input) { input.value = word; clearTimeout(window._rhymeTimer); window._rhymeTimer = setTimeout(llFindRhymes, 300); }
    }
  });


  // ── WaveSurfer waveform + loop region ────────────────────────────────────
  let _ws = null;
  let _wsRegion = null;   // { start, end } in seconds
  let _wsLooping = false;
  let _wsTimeHandler = null;

  function initWaveSurfer(beat) {
    const container = document.getElementById('llWaveSurfer');
    if (!container) return;
    if (_ws) { try { _ws.destroy(); } catch(e) {} _ws = null; }
    _wsRegion = null; _wsLooping = false; _wsTimeHandler = null;

    const audioUrl = beat.audio_url || beat.url || null;
    if (!audioUrl) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:64px;color:rgba(255,255,255,.25);font-size:12px">Ingen lydfil lastet opp</div>';
      return;
    }
    if (!window.WaveSurfer) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/wavesurfer.js/7.8.7/wavesurfer.min.js';
      s.onload = () => _buildWS(container, audioUrl);
      document.head.appendChild(s);
    } else {
      _buildWS(container, audioUrl);
    }
  }

  function _buildWS(container, audioUrl) {
    try {
      _ws = WaveSurfer.create({
        container,
        waveColor:     'rgba(244,164,67,.4)',
        progressColor: 'rgba(244,164,67,.85)',
        cursorColor:   '#f4a443',
        height: 64, barWidth: 2, barGap: 1, barRadius: 2,
        normalize: true,
        url: audioUrl,
        minPxPerSec: 1,    // start zoomed out
      });

      _ws.on('play',  () => { const b=document.getElementById('llWavePlayBtn'); if(b) b.textContent='⏸'; });
      _ws.on('pause', () => { const b=document.getElementById('llWavePlayBtn'); if(b) b.textContent='▶'; });
      _ws.on('finish',() => {
        const b=document.getElementById('llWavePlayBtn'); if(b) b.textContent='▶';
        if (_wsLooping && _wsRegion) { setTimeout(()=>{ _ws.setTime(_wsRegion.start); _ws.play(); }, 50); }
      });

      // Single timeupdate handler for looping
      _wsTimeHandler = (t) => {
        if (_wsLooping && _wsRegion && t >= _wsRegion.end) {
          _ws.setTime(_wsRegion.start);
        }
      };
      _ws.on('timeupdate', _wsTimeHandler);

      // Drag overlay — sits above WaveSurfer canvas to intercept drag without blocking clicks
      const dragOverlay = document.createElement('div');
      dragOverlay.style.cssText = 'position:absolute;inset:0;z-index:20;cursor:crosshair';
      container.style.position = 'relative';
      container.appendChild(dragOverlay);

      let _dragStart = null;
      let _dragMoved = false;
      let _dragPreview = null;

      dragOverlay.addEventListener('mousedown', e => {
        const dur = _ws.getDuration?.();
        if (!dur) return;
        const rect = container.getBoundingClientRect();
        _dragStart = ((e.clientX - rect.left) / rect.width) * dur;
        _dragMoved = false;
        e.stopPropagation();
      });

      dragOverlay.addEventListener('mousemove', e => {
        if (_dragStart === null) return;
        const rect = container.getBoundingClientRect();
        const cur  = ((e.clientX - rect.left) / rect.width) * (_ws.getDuration?.() || 1);
        const diff = Math.abs(cur - _dragStart);
        if (diff > 0.2) {
          _dragMoved = true;
          // Show live preview
          const s = Math.min(_dragStart, cur), en = Math.max(_dragStart, cur);
          _drawRegion(s, en);
        }
      });

      dragOverlay.addEventListener('mouseup', e => {
        if (_dragStart === null) return;
        const dur = _ws.getDuration?.();
        if (!dur || !_dragMoved) {
          // It was a click — seek normally
          if (!_dragMoved && dur) {
            const rect = container.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            _ws.seekTo(ratio);
          }
          _dragStart = null; _dragMoved = false;
          return;
        }
        const rect = container.getBoundingClientRect();
        const dragEnd = ((e.clientX - rect.left) / rect.width) * dur;
        const start = Math.min(_dragStart, dragEnd);
        const end   = Math.max(_dragStart, dragEnd);
        _dragStart = null; _dragMoved = false;
        if (end - start < 0.2) { llClearLoop(); return; }
        _wsRegion  = { start, end };
        _wsLooping = true;
        _drawRegion(start, end);
        const lb = document.getElementById('llWaveLoopBtn');
        if (lb) { lb.classList.add('active'); lb.textContent = '↺ Looper'; }
      });

    } catch(e) { console.warn('[WaveSurfer] init error:', e); }
  }

  function _drawRegion(start, end) {
    const el = document.getElementById('llWaveSurfer');
    if (!el || !_ws) return;
    document.getElementById('llWaveRegion')?.remove();
    const dur = _ws.getDuration?.() || 1;
    const div = document.createElement('div');
    div.id = 'llWaveRegion';
    div.style.cssText = `position:absolute;top:0;bottom:0;pointer-events:none;z-index:5;`
      + `left:${(start/dur)*100}%;width:${((end-start)/dur)*100}%;`
      + `background:rgba(244,164,67,.15);border-left:2px solid #f4a443;border-right:2px solid #f4a443;`;
    el.style.position = 'relative';
    el.appendChild(div);
  }

  window.llWavePlay = function() {
    if (!_ws) return;
    if (_ws.isPlaying()) { _ws.pause(); return; }
    if (_wsLooping && _wsRegion) _ws.setTime(_wsRegion.start);
    _ws.play();
  };

  window.llToggleLoop = function() {
    _wsLooping = !_wsLooping;
    const btn = document.getElementById('llWaveLoopBtn');
    if (btn) { btn.classList.toggle('active', _wsLooping); btn.textContent = _wsLooping ? '↺ Looper' : '↺ Loop'; }
  };

  window.llClearLoop = function() {
    _wsRegion = null; _wsLooping = false;
    document.getElementById('llWaveRegion')?.remove();
    const btn = document.getElementById('llWaveLoopBtn');
    if (btn) { btn.classList.remove('active'); btn.textContent = '↺ Loop'; }
  };

  window.llZoomWave = function(val) {
    if (!_ws) return;
    const pxPerSec = Math.max(1, Number(val) * 10);
    _ws.zoom(pxPerSec);
    const lbl = document.getElementById('llWaveZoomVal');
    if (lbl) lbl.textContent = val + '×';
    // Re-draw region after zoom
    if (_wsRegion) _drawRegion(_wsRegion.start, _wsRegion.end);
  };

  // ── Public entry point ────────────────────────────────────────────────────
  window.openInLyricLab = function(beatId) {
    window.currentLyricLabBeatId = beatId;
    const btn = document.querySelector('.tab-btn[data-tab="lyriclab"]');
    if (btn) btn.click();
    else renderLyricLab();
  };

  window.renderLyricLab = renderLyricLab;

  console.log('[LyricLab] Loaded ✓');
  // Fill any beat cards that rendered before lyriclab.js loaded
  if(typeof mountInlineEditors === 'function') mountInlineEditors();
})();
