/* ================================================================
   mobile.js — Music Vault mobilvisning v2
   - iOS Safari play fix: synkront play-kall
   - Seksjonseditor lik Lyric Lab (lyricSections)
   - Alt større
================================================================ */
(function(){
  'use strict';

  // ── Mobildeteksjon ──────────────────────────────────────────
  function isMobile(){
    return (
      window.innerWidth <= 820 ||
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }
  if(!isMobile()) return;

  // ── Konstanter ──────────────────────────────────────────────
  const TYPE_LABELS   = { hook:'Hook', verse:'Vers', bridge:'Bro', outro:'Outro', custom:'Custom' };
  const TYPE_CLASS    = { hook:'mv-type-hook', verse:'mv-type-verse', bridge:'mv-type-bridge', outro:'mv-type-outro', custom:'mv-type-custom' };
  const DEFAULT_SECTIONS = [
    { id:'hook',   type:'hook',   title:'Hook',   text:'', collapsed:false, done:false, order:0 },
    { id:'verse1', type:'verse',  title:'Vers 1', text:'', collapsed:false, done:false, order:1 },
    { id:'bridge', type:'bridge', title:'Bro',    text:'', collapsed:false, done:false, order:2 },
    { id:'verse2', type:'verse',  title:'Vers 2', text:'', collapsed:false, done:false, order:3 },
    { id:'outro',  type:'outro',  title:'Outro',  text:'', collapsed:true,  done:false, order:4 },
  ];

  // ── State ───────────────────────────────────────────────────
  let _currentBeatId = null;
  let _activeScreen  = 'songs';
  let _searchQuery   = '';

  // ── Helpers ─────────────────────────────────────────────────
  function getState(){ return typeof state !== 'undefined' ? state : window.state; }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function uid(){ return Math.random().toString(36).slice(2,9); }
  function fmtTime(sec){
    sec = Number(sec||0);
    if(!isFinite(sec)) return '0:00';
    return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;
  }
  function fmtTimestamp(ms){
    const d = new Date(ms);
    return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'}) + ' ' +
           d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
  }
  function getBeats(){
    const st = getState();
    return (st?.beats||[]).filter(b => !b.archived);
  }
  function getBeat(id){ return getBeats().find(b => b.id === id) || null; }
  function getCurrentBeat(){ return _currentBeatId ? getBeat(_currentBeatId) : null; }

  function getSections(beat){
    if(!beat) return [];
    if(beat.lyricSections && beat.lyricSections.length) return beat.lyricSections;
    const secs = DEFAULT_SECTIONS.map(s => ({...s, id: s.id + '_' + uid()}));
    if(beat.lyrics && beat.lyrics.trim()) secs[0].text = beat.lyrics;
    beat.lyricSections = secs;
    return secs;
  }

  // ── Autosave ────────────────────────────────────────────────
  let _saveTimer = null, _saveMax = null;
  function scheduleSave(){
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(()=>{ clearTimeout(_saveMax); _saveMax=null; doSave(); }, 800);
    if(!_saveMax) _saveMax = setTimeout(()=>{ _saveMax=null; clearTimeout(_saveTimer); _saveTimer=null; doSave(); }, 5000);
  }
  function doSave(){
    if(typeof saveState === 'function') saveState();
    const el = document.getElementById('mvSaveStatus');
    if(el){ el.textContent = '✓ Lagret'; setTimeout(()=>{ el.textContent=''; }, 2000); }
  }

  // ── iOS audio unlock ────────────────────────────────────────
  // Pre-unlock the Audio element on first user touch so async play works in Safari
  let _unlocked = false;
  function unlockAudio(){
    if(_unlocked) return; _unlocked = true;
    const a = window.bottomPlayer?.audio;
    if(a && !a.src){
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';
      a.volume = 0;
      a.play().then(()=>{ a.pause(); a.removeAttribute('src'); a.volume=1; }).catch(()=>{ a.removeAttribute('src'); a.volume=1; });
    }
  }
  document.addEventListener('touchstart', unlockAudio, {once:true, passive:true});

  // ── Build overlay ───────────────────────────────────────────
  function buildOverlay(){
    // Hide desktop
    const app = document.getElementById('app') || document.querySelector('.app') || document.querySelector('main');
    if(app) app.style.display = 'none';
    document.querySelectorAll('.bottom-player,.role-badge,.producer-login-btn,.global-search-wrap,.toolbar')
      .forEach(el => { el.style.display='none'; });

    const wrap = document.createElement('div');
    wrap.id = 'mvMobileApp';
    wrap.innerHTML = `
      <div class="mv-top-bar">
        <div class="mv-top-logo">Music Vault</div>
        <div class="mv-top-user" id="mvTopUser"></div>
      </div>

      <!-- Sanger -->
      <div class="mv-screen" id="mvScreenSongs">
        <div class="mv-songs-header">Sanger</div>
        <div class="mv-search-wrap">
          <input class="mv-search" id="mvSearch" type="search"
            placeholder="Søk etter sang…" autocomplete="off" autocorrect="off" spellcheck="false">
        </div>
        <div id="mvSongList"></div>
      </div>

      <!-- Spiller + editor -->
      <div class="mv-screen hidden mv-player-screen" id="mvScreenPlayer">
        <div class="mv-player-top">
          <div class="mv-big-cover" id="mvBigCover">🎵</div>
          <div class="mv-player-title">
            <div class="mv-player-name" id="mvPlayerName">Velg en sang</div>
            <div class="mv-player-sub" id="mvPlayerSub"></div>
          </div>
          <div class="mv-progress-wrap">
            <div class="mv-progress-times">
              <span id="mvCurrent">0:00</span>
              <span id="mvDuration">0:00</span>
            </div>
            <input class="mv-seek" id="mvSeek" type="range" min="0" max="1000" value="0">
          </div>
          <div class="mv-controls">
            <button class="mv-ctrl-btn" id="mvPrevBtn">⏮</button>
            <button class="mv-play-btn" id="mvPlayBtn">▶</button>
            <button class="mv-ctrl-btn" id="mvNextBtn">⏭</button>
          </div>
        </div>
        <div class="mv-sections-wrap">
          <div class="mv-sections-bar">
            <span class="mv-sections-label">Tekst</span>
            <div class="mv-sections-actions">
              <span class="mv-save-status" id="mvSaveStatus"></span>
              <button class="mv-add-section-btn" id="mvAddSectionBtn">+ Seksjon</button>
            </div>
          </div>
          <div id="mvSectionsList"></div>
        </div>
      </div>

      <!-- Demo -->
      <div class="mv-screen hidden" id="mvScreenRecord">
        <div class="mv-record-screen">
          <div>
            <div class="mv-record-header">Ta opp demo</div>
            <div class="mv-record-context" id="mvRecordContext">Ingen sang valgt</div>
          </div>
          <div class="mv-record-btn-wrap">
            <div class="mv-waveform" id="mvWaveform">
              ${Array.from({length:24},()=>'<div class="mv-wave-bar" style="height:4px"></div>').join('')}
            </div>
            <div class="mv-record-timer" id="mvRecordTimer">0:00</div>
            <button class="mv-record-btn" id="mvRecordBtn">🎤</button>
            <div class="mv-record-label" id="mvRecordLabel">Trykk for å ta opp</div>
          </div>
          <div id="mvRecordingsList"></div>
        </div>
      </div>

      <nav class="mv-nav">
        <button class="mv-nav-btn active" data-screen="songs">
          <span class="mv-nav-icon">🎵</span>Sanger
        </button>
        <button class="mv-nav-btn" data-screen="player">
          <span class="mv-nav-icon">▶</span>Spiller
        </button>
        <button class="mv-nav-btn" data-screen="record">
          <span class="mv-nav-icon">🎤</span>Demo
        </button>
      </nav>`;
    document.body.appendChild(wrap);
  }

  // ── Navigation ───────────────────────────────────────────────
  function showScreen(name){
    _activeScreen = name;
    const map = { songs:'mvScreenSongs', player:'mvScreenPlayer', record:'mvScreenRecord' };
    Object.entries(map).forEach(([k,id])=>{
      document.getElementById(id)?.classList.toggle('hidden', k!==name);
    });
    document.querySelectorAll('.mv-nav-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.screen===name);
    });
    if(name==='player'){ updatePlayerUI(); renderSections(); }
    if(name==='record') updateRecordScreen();
  }

  // ── Song list ────────────────────────────────────────────────
  function renderSongList(){
    const container = document.getElementById('mvSongList');
    if(!container) return;
    const beats = getBeats().filter(b => !_searchQuery || b.name.toLowerCase().includes(_searchQuery.toLowerCase()));
    if(!beats.length){
      container.innerHTML = `<div class="mv-empty"><div class="mv-empty-icon">🎵</div>${_searchQuery?'Ingen treff':'Ingen sanger ennå'}</div>`;
      return;
    }
    const bp = window.bottomPlayer;
    container.innerHTML = beats.map(b => {
      const activeBeatId = bp?.queue?.[bp.index]?.id;
      const isPlaying = activeBeatId===b.id && bp && !bp.audio.paused;
      const coverHtml = b.cover ? `<img src="${esc(b.cover)}" alt="">` : '🎵';
      const tags = [b.bpm&&`${b.bpm} BPM`, b.key, b.duration&&fmtTime(b.duration)].filter(Boolean);
      return `
        <div class="mv-song-row${_currentBeatId===b.id?' active-song':''}"
             onclick="window.mvMobile.selectBeat('${esc(b.id)}')">
          <div class="mv-song-cover">${coverHtml}</div>
          <div class="mv-song-info">
            <div class="mv-song-name">${esc(b.name)}</div>
            ${tags.length?`<div class="mv-song-meta">${tags.map(esc).join(' · ')}</div>`:''}
          </div>
          <button class="mv-song-play-btn${isPlaying?' playing':''}"
                  onclick="event.stopPropagation();window.mvMobile.tapPlay('${esc(b.id)}')">
            ${isPlaying ? '⏸' : '▶'}
          </button>
        </div>`;
    }).join('');
  }

  // ── Select beat ──────────────────────────────────────────────
  function selectBeat(id){
    _currentBeatId = id;
    renderSongList();
    showScreen('player');
  }

  // ── Audio: iOS-safe play ─────────────────────────────────────
  // Key insight: we must call .play() synchronously in the touch handler chain.
  // playSingleBeat is async (fetches URL), which breaks Safari's gesture requirement.
  // Solution: set src synchronously if we already know the URL, else call playSingleBeat.
  function tapPlay(id){
    unlockAudio();
    const bp = window.bottomPlayer;
    if(!bp) return;

    const activeBeatId = bp.queue?.[bp.index]?.id;
    const isThisBeat = activeBeatId === id;

    if(isThisBeat && !bp.audio.paused){
      // Pause — always synchronous, fine
      bp.audio.pause();
      setTimeout(()=>{ renderSongList(); updatePlayerUI(); }, 60);
      return;
    }
    if(isThisBeat && bp.audio.paused){
      // Resume — synchronous call, iOS-safe
      bp.audio.play().catch(()=>{});
      setTimeout(()=>{ renderSongList(); updatePlayerUI(); }, 60);
      return;
    }

    // New beat: playSingleBeat is async but we've already called unlockAudio above
    // which pre-unlocked the audio element via a sync play on touchstart.
    if(typeof window.playSingleBeat === 'function'){
      window.playSingleBeat(id);
    }
    _currentBeatId = id;
    setTimeout(()=>{ renderSongList(); updatePlayerUI(); }, 200);
  }

  // ── Player UI ────────────────────────────────────────────────
  function updatePlayerUI(){
    const beat = getCurrentBeat();
    const bp   = window.bottomPlayer;

    const coverEl  = document.getElementById('mvBigCover');
    const nameEl   = document.getElementById('mvPlayerName');
    const subEl    = document.getElementById('mvPlayerSub');
    const playBtn  = document.getElementById('mvPlayBtn');

    if(!beat){
      if(nameEl) nameEl.textContent = 'Velg en sang';
      if(subEl)  subEl.textContent  = '';
      if(coverEl) coverEl.innerHTML = '🎵';
      if(playBtn) playBtn.textContent = '▶';
      return;
    }
    if(coverEl) coverEl.innerHTML = beat.cover ? `<img src="${esc(beat.cover)}" alt="">` : '🎵';
    if(nameEl)  nameEl.textContent = beat.name;
    const tags = [beat.bpm&&`${beat.bpm} BPM`, beat.key, beat.mood].filter(Boolean);
    if(subEl)   subEl.textContent  = tags.join(' · ');

    const activeBeatId = bp?.queue?.[bp.index]?.id;
    const isPlaying = activeBeatId===beat.id && bp && !bp.audio.paused;
    if(playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶';
  }

  function syncProgress(){
    const bp = window.bottomPlayer;
    if(!bp) return;
    const a = bp.audio;
    const dur = isFinite(a.duration) ? a.duration : 0;
    const cur  = document.getElementById('mvCurrent');
    const duri = document.getElementById('mvDuration');
    const seek = document.getElementById('mvSeek');
    if(cur)  cur.textContent  = fmtTime(a.currentTime);
    if(duri) duri.textContent = fmtTime(dur);
    if(seek && !seek.matches(':active')) seek.value = dur ? Math.round((a.currentTime/dur)*1000) : 0;
  }

  // ── Sections editor ──────────────────────────────────────────
  function renderSections(){
    const beat = getCurrentBeat();
    const container = document.getElementById('mvSectionsList');
    if(!container) return;

    if(!beat){
      container.innerHTML = `<div class="mv-no-song-msg">Velg en sang fra Sanger-fanen for å skrive tekst.</div>`;
      return;
    }

    const sections = getSections(beat);
    container.innerHTML = sections.map(sec => `
      <div class="mv-section-card${sec.collapsed?' collapsed':''}" data-sec-id="${esc(sec.id)}">
        <div class="mv-section-head" onclick="window.mvMobile.toggleSection('${esc(sec.id)}')">
          <span class="mv-section-type-pill ${TYPE_CLASS[sec.type]||'mv-type-custom'}"
                onclick="event.stopPropagation();window.mvMobile.changeType('${esc(sec.id)}')"
                title="Endre type">
            ${esc(TYPE_LABELS[sec.type]||sec.type)}
          </span>
          <input class="mv-section-title-input" value="${esc(sec.title)}"
                 onclick="event.stopPropagation()"
                 onchange="window.mvMobile.secTitleChange(this,'${esc(sec.id)}')"
                 oninput="window.mvMobile.secTitleChange(this,'${esc(sec.id)}')">
          <button class="mv-section-collapse-btn" onclick="event.stopPropagation();window.mvMobile.toggleSection('${esc(sec.id)}')">▾</button>
        </div>
        <div class="mv-section-body">
          <textarea class="mv-section-textarea"
                    placeholder="${esc(TYPE_LABELS[sec.type]||'Tekst')}…"
                    oninput="window.mvMobile.secTextChange(this,'${esc(sec.id)}')"
                    rows="5">${esc(sec.text||'')}</textarea>
          <div class="mv-section-footer">
            <button class="mv-section-delete-btn"
                    onclick="window.mvMobile.deleteSection('${esc(sec.id)}')">Slett seksjon</button>
          </div>
        </div>
      </div>`).join('');
  }

  window.mvMobile = window.mvMobile || {};

  Object.assign(window.mvMobile, {
    toggleSection(secId){
      const beat = getCurrentBeat(); if(!beat) return;
      const sec = getSections(beat).find(s=>s.id===secId); if(!sec) return;
      sec.collapsed = !sec.collapsed;
      const card = document.querySelector(`[data-sec-id="${CSS.escape(secId)}"]`);
      if(card) card.classList.toggle('collapsed', sec.collapsed);
      scheduleSave();
    },
    secTitleChange(input, secId){
      const beat = getCurrentBeat(); if(!beat) return;
      const sec = getSections(beat).find(s=>s.id===secId); if(!sec) return;
      sec.title = input.value;
      scheduleSave();
    },
    secTextChange(textarea, secId){
      const beat = getCurrentBeat(); if(!beat) return;
      const sec = getSections(beat).find(s=>s.id===secId); if(!sec) return;
      sec.text  = textarea.value;
      beat.lyrics = getSections(beat).map(s=>s.text).join('\n');
      const statusEl = document.getElementById('mvSaveStatus');
      if(statusEl) statusEl.textContent = '…';
      scheduleSave();
    },
    deleteSection(secId){
      const beat = getCurrentBeat(); if(!beat) return;
      const secs = getSections(beat);
      const idx  = secs.findIndex(s=>s.id===secId); if(idx===-1) return;
      if(secs.length<=1){ alert('Du kan ikke slette den siste seksjonen.'); return; }
      secs.splice(idx,1);
      renderSections();
      scheduleSave();
    },
    addSection(){
      const beat = getCurrentBeat(); if(!beat) return;
      const secs = getSections(beat);
      secs.push({ id:uid(), type:'custom', title:'Ny seksjon', text:'', collapsed:false, done:false, order:secs.length });
      renderSections();
      scheduleSave();
      // Scroll to new section
      setTimeout(()=>{
        const last = document.querySelector('.mv-section-card:last-child');
        last?.scrollIntoView({behavior:'smooth',block:'start'});
      }, 80);
    },
    changeType(secId){
      const beat = getCurrentBeat(); if(!beat) return;
      const sec  = getSections(beat).find(s=>s.id===secId); if(!sec) return;
      showTypeSheet(sec, ()=>{ renderSections(); scheduleSave(); });
    },
    selectBeat,
    tapPlay
  });

  // ── Type picker sheet ────────────────────────────────────────
  function showTypeSheet(sec, onSelect){
    const types = Object.keys(TYPE_LABELS);
    const sheet = document.createElement('div');
    sheet.className = 'mv-type-sheet';
    sheet.innerHTML = `
      <div class="mv-type-sheet-inner">
        <div class="mv-type-sheet-title">Velg seksjonstype</div>
        ${types.map(t=>`
          <button class="mv-type-option" data-type="${t}">
            <span class="mv-section-type-pill ${TYPE_CLASS[t]||'mv-type-custom'}">${TYPE_LABELS[t]}</span>
            ${TYPE_LABELS[t]}
          </button>`).join('')}
        <button class="mv-type-cancel">Avbryt</button>
      </div>`;
    document.getElementById('mvMobileApp').appendChild(sheet);

    sheet.querySelectorAll('[data-type]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        sec.type = btn.dataset.type;
        if(sec.title === TYPE_LABELS[Object.keys(TYPE_LABELS).find(k=>TYPE_LABELS[k]===sec.title)] || !sec.title.trim()){
          sec.title = TYPE_LABELS[btn.dataset.type];
        }
        sheet.remove();
        onSelect();
      });
    });
    sheet.querySelector('.mv-type-cancel').addEventListener('click', ()=>sheet.remove());
    sheet.addEventListener('click', e=>{ if(e.target===sheet) sheet.remove(); });
  }

  // ── Record screen ────────────────────────────────────────────
  function updateRecordScreen(){
    const beat = getCurrentBeat();
    const ctx = document.getElementById('mvRecordContext');
    if(ctx) ctx.textContent = beat ? `Sang: ${beat.name}` : 'Ingen sang valgt';
    renderRecordingsList();
  }

  const _recordings = (()=>{ try{ return JSON.parse(localStorage.getItem('mvMobileRecs')||'[]'); }catch{ return []; } })();
  function saveRecs(){ try{ localStorage.setItem('mvMobileRecs', JSON.stringify(_recordings)); }catch{} }

  function renderRecordingsList(){
    const c = document.getElementById('mvRecordingsList');
    if(!c) return;
    const recs = _recordings.filter(r => r.beatId === _currentBeatId);
    if(!recs.length){
      c.innerHTML = `<div class="mv-recordings-title">Opptak</div>
        <div class="mv-empty"><div class="mv-empty-icon">🎙</div>Ingen opptak ennå</div>`;
      return;
    }
    c.innerHTML = `<div class="mv-recordings-title">Opptak (${recs.length})</div>` +
      recs.map(r=>`
        <div class="mv-recording-row">
          <div class="mv-recording-info">
            <div class="mv-recording-name">${esc(r.name)}</div>
            <div class="mv-recording-meta">${fmtTimestamp(r.created)} · ${fmtTime(r.duration)}</div>
          </div>
          <div class="mv-recording-actions">
            <button class="mv-rec-btn" onclick="window.mvMobile.playRec('${r.id}')">▶</button>
            <button class="mv-rec-btn" onclick="window.mvMobile.dlRec('${r.id}')">⬇</button>
            <button class="mv-rec-btn danger" onclick="window.mvMobile.delRec('${r.id}')">🗑</button>
          </div>
        </div>`).join('');
  }

  Object.assign(window.mvMobile, {
    playRec(id){ const r=_recordings.find(x=>x.id===id); if(r?.base64) new Audio(r.base64).play().catch(()=>{}); },
    dlRec(id){
      const r=_recordings.find(x=>x.id===id); if(!r) return;
      const a=document.createElement('a'); a.href=r.base64; a.download=`${r.name}.${r.ext}`; a.click();
    },
    delRec(id){
      const idx=_recordings.findIndex(x=>x.id===id); if(idx===-1) return;
      _recordings.splice(idx,1); saveRecs(); renderRecordingsList();
    }
  });

  // ── Recording engine ─────────────────────────────────────────
  let _mr=null, _chunks=[], _recStart=null, _timerInterval=null, _waveInterval=null, _actx=null;

  async function startRecording(){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      _chunks=[]; _recStart=Date.now();
      _actx = new (window.AudioContext||window.webkitAudioContext)();
      const analyser = _actx.createAnalyser(); analyser.fftSize=64;
      _actx.createMediaStreamSource(stream).connect(analyser);

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
                 : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      _mr = new MediaRecorder(stream, mime?{mimeType:mime}:{});
      _mr.ondataavailable = e=>{ if(e.data.size>0) _chunks.push(e.data); };
      _mr.onstop = ()=>finalizeRecording(mime.includes('mp4')?'m4a':'webm', mime||'audio/webm');
      _mr.start(100);

      // UI
      document.getElementById('mvRecordBtn')?.classList.add('recording');
      const lbl = document.getElementById('mvRecordLabel');
      if(lbl){ lbl.textContent='Tar opp… Trykk for å stoppe'; lbl.classList.add('recording'); }
      document.getElementById('mvRecordTimer')?.classList.add('visible');
      document.getElementById('mvWaveform')?.classList.add('active');

      _timerInterval = setInterval(()=>{
        const t = document.getElementById('mvRecordTimer');
        if(t) t.textContent = fmtTime(Math.floor((Date.now()-_recStart)/1000));
      }, 500);

      const bars = document.querySelectorAll('#mvWaveform .mv-wave-bar');
      const data = new Uint8Array(analyser.frequencyBinCount);
      _waveInterval = setInterval(()=>{
        analyser.getByteFrequencyData(data);
        bars.forEach((b,i)=>{ b.style.height=Math.max(3,(data[i]||0)/255*44)+'px'; });
      }, 80);
    } catch(err){
      if(err.name==='NotAllowedError') alert('Music Vault trenger tilgang til mikrofon for å ta opp demo.');
      else alert('Kunne ikke starte innspilling: '+err.message);
    }
  }

  function stopRecording(){
    if(!_mr || _mr.state==='inactive') return;
    _mr.stop();
    _mr.stream?.getTracks().forEach(t=>t.stop());
    clearInterval(_timerInterval); clearInterval(_waveInterval);
    if(_actx){ _actx.close(); _actx=null; }

    document.getElementById('mvRecordBtn')?.classList.remove('recording');
    const lbl = document.getElementById('mvRecordLabel');
    if(lbl){ lbl.textContent='Trykk for å ta opp'; lbl.classList.remove('recording'); }
    document.getElementById('mvRecordTimer')?.classList.remove('visible');
    const wave = document.getElementById('mvWaveform');
    if(wave){ wave.classList.remove('active'); wave.querySelectorAll('.mv-wave-bar').forEach(b=>b.style.height='4px'); }
  }

  function finalizeRecording(ext, mimeType){
    const duration = Math.round((Date.now()-_recStart)/1000);
    const beat = getCurrentBeat();
    const blob = new Blob(_chunks, {type:mimeType});
    const beatName = (beat?.name||'demo').replace(/[^\w\sæøåÆØÅ]/g,'').trim();
    const name = `${beatName}_demo_${new Date().toISOString().slice(0,10)}`;
    const reader = new FileReader();
    reader.onload = ()=>{
      _recordings.unshift({id:Date.now().toString(36), beatId:_currentBeatId, name, base64:reader.result, mimeType, ext, created:Date.now(), duration});
      saveRecs();
      renderRecordingsList();
    };
    reader.readAsDataURL(blob);
    _chunks=[];
  }

  // ── Event bindings ───────────────────────────────────────────
  function bindEvents(){
    // Nav
    document.querySelectorAll('.mv-nav-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>showScreen(btn.dataset.screen));
    });
    // Search
    document.getElementById('mvSearch')?.addEventListener('input', e=>{
      _searchQuery = e.target.value; renderSongList();
    });
    // Seek
    document.getElementById('mvSeek')?.addEventListener('change', e=>{
      const bp=window.bottomPlayer; if(!bp) return;
      const a=bp.audio; if(isFinite(a.duration)&&a.duration>0) a.currentTime=(e.target.value/1000)*a.duration;
    });
    // Play btn in player
    document.getElementById('mvPlayBtn')?.addEventListener('click', ()=>{
      if(_currentBeatId) tapPlay(_currentBeatId);
    });
    document.getElementById('mvPrevBtn')?.addEventListener('click', ()=>{
      if(typeof bottomPrev==='function') bottomPrev(); setTimeout(updatePlayerUI, 100);
    });
    document.getElementById('mvNextBtn')?.addEventListener('click', ()=>{
      if(typeof bottomNext==='function') bottomNext(false); setTimeout(updatePlayerUI, 100);
    });
    // Add section
    document.getElementById('mvAddSectionBtn')?.addEventListener('click', ()=>window.mvMobile.addSection());
    // Record btn
    document.getElementById('mvRecordBtn')?.addEventListener('click', ()=>{
      if(_mr && _mr.state==='recording') stopRecording(); else startRecording();
    });
    // Sync progress + play state
    setInterval(()=>{
      if(_activeScreen==='player') syncProgress();
      if(_activeScreen==='songs')  renderSongList();
    }, 500);
    // Listen to bottomPlayer audio events
    const bp = window.bottomPlayer;
    if(bp?.audio){
      bp.audio.addEventListener('play',  updatePlayerUI);
      bp.audio.addEventListener('pause', updatePlayerUI);
      bp.audio.addEventListener('ended', updatePlayerUI);
    }
  }

  // ── Username ─────────────────────────────────────────────────
  function showUsername(){
    const u = sessionStorage.getItem('mv_user') || sessionStorage.getItem('mv_username') ||
              sessionStorage.getItem('currentUser');
    const el = document.getElementById('mvTopUser');
    if(el && u) el.textContent = u;
  }

  // ── Init ─────────────────────────────────────────────────────
  function init(){
    buildOverlay();
    bindEvents();
    showUsername();
    const waitAndRender = ()=>{
      if(getState()){ renderSongList(); }
      else { setTimeout(waitAndRender, 250); }
    };
    waitAndRender();
    showScreen('songs');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>setTimeout(init,300));
  else setTimeout(init, 300);

  window.mvMobile = window.mvMobile || {};

})();
