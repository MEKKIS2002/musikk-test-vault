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
    { id: 'hook',   type: 'hook',   title: 'Hook',   text: '', collapsed: false, order: 0 },
    { id: 'verse1', type: 'verse',  title: 'Vers 1', text: '', collapsed: false, order: 1 },
    { id: 'bridge', type: 'bridge', title: 'Bro',    text: '', collapsed: false, order: 2 },
    { id: 'verse2', type: 'verse',  title: 'Vers 2', text: '', collapsed: false, order: 3 },
    { id: 'outro',  type: 'outro',  title: 'Outro',  text: '', collapsed: true,  order: 4 },
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
    const have = new Set((getSections(beat)||[]).filter(s=>s.text.trim()).map(s=>s.type));
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
        <button class="ll-section-toggle">${sec.collapsed?'▸':'▾'}</button>
      </div>
      <div class="ll-section-body">
        <div class="ll-line-numbers" id="llnums-${esc(sec.id)}">${sec.text.split('\n').map((_,i)=>i+1).join('\n')}</div>
        <textarea class="ll-textarea" id="lltxt-${esc(sec.id)}"
          placeholder="Skriv ${sec.title.toLowerCase()} her..."
          oninput="llSectionInput(this,'${esc(sec.id)}')"
          rows="${Math.max(5, sec.text.split('\n').length + 2)}"
        >${esc(sec.text)}</textarea>
        <div class="ll-section-menu" id="llmenu-${esc(sec.id)}">
          <button onclick="llDuplicateSection('${esc(sec.id)}')">⧉ Dupliser</button>
          <button onclick="llMoveSectionUp('${esc(sec.id)}')">↑ Flytt opp</button>
          <button onclick="llMoveSectionDown('${esc(sec.id)}')">↓ Flytt ned</button>
          <button class="danger" onclick="llDeleteSection('${esc(sec.id)}')">🗑 Slett seksjon</button>
        </div>
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
<div class="ll-header">\n  <button class="ll-back-btn" onclick="llGoBack()">← Mixtapes</button>\n  <span class="ll-header-sep">|</span>\n  <span class="ll-header-beat">✍️ Lyric Lab · ${esc(beat.name)}</span>\n</div>
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

      <div class="ll-waveform paused" id="llWaveform">${waveformHTML()}</div>

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
      <button class="ll-btn muted" onclick="llLoopHook()">↺ Loop hook</button>
      <button class="ll-btn muted" id="llMemoBtn" onclick="llRecordMemo()">⬤ Ta opp memo</button>
      <div id="llMemoList" style="margin-top:6px;display:flex;flex-direction:column;gap:6px"></div>
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

    <div class="ll-card ll-stat-card">
      <div class="ll-stat-title">Rimbank</div>
      <div class="ll-rhyme-placeholder">
        <strong>Velg et ord i teksten</strong>
        for å se rimforslag her
      </div>
    </div>
  </div>

</div>
</div><!-- /.ll-wrap -->
`;
    _lastSaved = null;
    setTimeout(()=>{ renderMemoList(); renderTakeList(); }, 50);
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
  document.addEventListener('click', e => {
    if (!e.target.closest('.ll-section-menu-btn') && !e.target.closest('.ll-section-menu'))
      document.querySelectorAll('.ll-section-menu.open').forEach(m=>m.classList.remove('open'));
  });

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
    // Switch to beats tab
    const btn = document.querySelector('.tab-btn[data-tab="beats"]');
    if (btn) btn.click();
    else if (typeof showToast === 'function') showToast('Gå til Beats-fanen for å velge');
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
      // Play the beat
      if (typeof playSingleBeat === 'function') playSingleBeat(beat.id);

      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          _takeChunks = [];
          _takeSecs = 0;
          const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
          _takeRecorder = new MediaRecorder(stream, { mimeType: mime });
          _takeRecorder.ondataavailable = e => { if(e.data.size>0) _takeChunks.push(e.data); };

          _takeRecorder.onstart = () => {
            if(overlay) {
              overlay.querySelector('.ll-take-count').textContent = '⬤';
              overlay.querySelector('.ll-take-label').textContent = `Spiller inn over ${esc(beat.name)}`;
            }
            _takeInterval = setInterval(() => {
              _takeSecs++;
              const m = Math.floor(_takeSecs/60);
              const s = String(_takeSecs%60).padStart(2,'0');
              const timer = document.getElementById('llTakeTimer');
              if(timer) timer.textContent = `${m}:${s}`;
            }, 1000);
            if(typeof showToast==='function') showToast('🎙️ Innspilling startet');
          };

          _takeRecorder.onstop = () => {
            clearInterval(_takeInterval);
            stream.getTracks().forEach(t=>t.stop());
            if(overlay) overlay.style.display='none';
            if(btn){ btn.textContent='🎙️ Spill inn over beat'; btn.style.background=''; }
            // Stop beat playback
            if(window.bottomPlayer?.audio && !window.bottomPlayer.audio.paused) {
              window.bottomPlayer.audio.pause();
            }
            const blob = new Blob(_takeChunks, { type: mime });
            const reader = new FileReader();
            reader.onload = e => {
              if(!beat.takes) beat.takes = [];
              beat.takes.push({ id: uid(), url: e.target.result, ts: Date.now(), dur: _takeSecs, mime });
              if(typeof saveState==='function') saveState();
              renderTakeList();
              if(typeof showToast==='function') showToast(`✓ Take lagret (${_takeSecs}s)`);
            };
            reader.readAsDataURL(blob);
          };

          _takeRecorder.start(500);
        })
        .catch(err => {
          if(overlay) overlay.style.display='none';
          if(btn) btn.textContent='🎙️ Spill inn over beat';
          if(typeof showToast==='function') showToast('Klarte ikke åpne mikrofon: ' + err.message);
        });
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
