/* ================================================================
   mobile.js — Music Vault mobilvisning
   Kjøres etter alle andre scripts. Detekterer mobil og tar over UI.
   Leser fra window.state, window.bottomPlayer, window.saveState.
================================================================ */
(function(){
  'use strict';

  // ── Mobildeteksjon ──────────────────────────────────────────
  function isMobile(){
    return (
      window.innerWidth <= 768 ||
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }
  if(!isMobile()) return; // Desktop → ingenting skjer

  // ── Globale refs ────────────────────────────────────────────
  let _currentBeatId = null;
  let _activeSreen   = 'songs'; // 'songs' | 'player' | 'record'
  let _searchQuery   = '';

  // ── Helpers ─────────────────────────────────────────────────
  function getState(){ return typeof state !== 'undefined' ? state : window.state; }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtTime(sec){
    sec = Number(sec||0);
    if(!isFinite(sec)) return '0:00';
    const m = Math.floor(sec/60);
    const s = Math.floor(sec%60);
    return `${m}:${String(s).padStart(2,'0')}`;
  }
  function fmtTimestamp(ms){
    const d = new Date(ms);
    return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'}) + ' ' +
           d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
  }
  function fmtDuration(secs){
    if(!secs) return '';
    return fmtTime(secs);
  }
  function getBeats(){
    const st = getState();
    if(!st) return [];
    return (st.beats||[]).filter(b => !b.archived);
  }
  function getBeat(id){
    return getBeats().find(b => b.id === id) || null;
  }
  function getCurrentBeat(){ return _currentBeatId ? getBeat(_currentBeatId) : null; }

  // Safe save: debounced with maxWait
  let _lyricSaveTimer = null;
  let _lyricMaxTimer  = null;
  function scheduleLyricSave(beat){
    clearTimeout(_lyricSaveTimer);
    _lyricSaveTimer = setTimeout(()=>{
      clearTimeout(_lyricMaxTimer); _lyricMaxTimer = null;
      commitLyricSave(beat);
    }, 800);
    if(!_lyricMaxTimer){
      _lyricMaxTimer = setTimeout(()=>{
        _lyricMaxTimer = null;
        clearTimeout(_lyricSaveTimer); _lyricSaveTimer = null;
        commitLyricSave(beat);
      }, 5000);
    }
  }
  function commitLyricSave(beat){
    if(!beat) return;
    const editor = document.getElementById('mvLyricsEditor');
    if(!editor) return;
    beat.lyrics = editor.innerText;
    // Also update first lyricSection if present
    if(beat.lyricSections && beat.lyricSections.length){
      beat.lyricSections[0].text = editor.innerText;
    }
    if(typeof saveState === 'function') saveState();
    const status = document.getElementById('mvLyricsSaveStatus');
    if(status){
      status.textContent = 'Lagret';
      setTimeout(()=>{ status.textContent = ''; }, 2000);
    }
  }

  // ── iOS audio unlock ────────────────────────────────────────
  // (bottomPlayer unlock already in db.js, this is belt-and-suspenders)
  function ensureAudioUnlocked(){
    if(window._audioUnlocked) return;
    // No-op: db.js handles this
  }

  // ── Build overlay ───────────────────────────────────────────
  function buildOverlay(){
    // Hide desktop UI
    const app = document.getElementById('app') ||
                document.querySelector('.app') ||
                document.querySelector('main');
    if(app) app.style.display = 'none';
    // Also hide any fixed elements like bottom-player, role-badge
    document.querySelectorAll('.bottom-player,.role-badge,.producer-login-btn,.global-search-wrap')
      .forEach(el => el.style.display = 'none');

    const wrap = document.createElement('div');
    wrap.id = 'mvMobileApp';
    wrap.innerHTML = `
      <!-- Top bar -->
      <div class="mv-top-bar">
        <div class="mv-top-logo">Music Vault</div>
        <div class="mv-top-user" id="mvTopUser"></div>
      </div>

      <!-- Screen: Sanger -->
      <div class="mv-screen" id="mvScreenSongs">
        <div class="mv-songs-header">Sanger</div>
        <div class="mv-search-wrap">
          <input class="mv-search" id="mvSearch" type="search"
            placeholder="Søk…" autocomplete="off" autocorrect="off" spellcheck="false">
        </div>
        <div id="mvSongList"></div>
      </div>

      <!-- Screen: Spiller + tekst -->
      <div class="mv-screen hidden mv-player-screen" id="mvScreenPlayer">
        <!-- Player top -->
        <div class="mv-player-top">
          <div class="mv-big-cover" id="mvBigCover">🎵</div>
          <div class="mv-player-title">
            <div class="mv-player-name" id="mvPlayerName">Ingen sang valgt</div>
            <div class="mv-player-sub" id="mvPlayerSub">Velg en sang fra liste</div>
          </div>
          <div class="mv-progress-wrap">
            <div class="mv-progress-times">
              <span id="mvCurrent">0:00</span>
              <span id="mvDuration">0:00</span>
            </div>
            <input class="mv-seek" id="mvSeek" type="range" min="0" max="1000" value="0">
          </div>
          <div class="mv-controls">
            <button class="mv-ctrl-btn" id="mvPrevBtn" title="Forrige">⏮</button>
            <button class="mv-play-btn" id="mvPlayBtn">▶</button>
            <button class="mv-ctrl-btn" id="mvNextBtn" title="Neste">⏭</button>
          </div>
        </div>
        <!-- Lyrics editor -->
        <div class="mv-lyrics-section">
          <div class="mv-lyrics-header">
            <span class="mv-lyrics-title">Tekst</span>
            <span class="mv-lyrics-save-status" id="mvLyricsSaveStatus"></span>
          </div>
          <div class="mv-lyrics-editor" id="mvLyricsEditor"
               contenteditable="true"
               data-placeholder="Skriv tekst her…"
               spellcheck="false"
               autocorrect="off"></div>
        </div>
      </div>

      <!-- Screen: Demo -->
      <div class="mv-screen hidden" id="mvScreenRecord">
        <div class="mv-record-screen">
          <div>
            <div class="mv-record-header">Ta opp demo</div>
            <div class="mv-record-context" id="mvRecordContext">Ingen sang valgt</div>
          </div>

          <div class="mv-record-btn-wrap">
            <div class="mv-waveform" id="mvWaveform">
              ${Array.from({length:20},()=>'<div class="mv-wave-bar" style="height:4px"></div>').join('')}
            </div>
            <div class="mv-record-timer" id="mvRecordTimer">0:00</div>
            <button class="mv-record-btn" id="mvRecordBtn">🎤</button>
            <div class="mv-record-label" id="mvRecordLabel">Hold inne for å ta opp</div>
          </div>

          <div id="mvRecordingsList"></div>
        </div>
      </div>

      <!-- Bottom nav -->
      <nav class="mv-nav">
        <button class="mv-nav-btn active" id="mvNavSongs" data-screen="songs">
          <span class="mv-nav-icon">🎵</span>
          Sanger
        </button>
        <button class="mv-nav-btn" id="mvNavPlayer" data-screen="player">
          <span class="mv-nav-icon">▶</span>
          Spiller
        </button>
        <button class="mv-nav-btn" id="mvNavRecord" data-screen="record">
          <span class="mv-nav-icon">🎤</span>
          Demo
        </button>
      </nav>
    `;
    document.body.appendChild(wrap);
  }

  // ── Navigation ───────────────────────────────────────────────
  function showScreen(name){
    _activeSreen = name;
    const screens = { songs:'mvScreenSongs', player:'mvScreenPlayer', record:'mvScreenRecord' };
    const navBtns = { songs:'mvNavSongs', player:'mvNavPlayer', record:'mvNavRecord' };

    Object.entries(screens).forEach(([k,id])=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle('hidden', k !== name);
    });
    Object.entries(navBtns).forEach(([k,id])=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle('active', k === name);
    });

    if(name === 'player') updatePlayerUI();
    if(name === 'record') updateRecordScreen();
  }

  // ── Song list ────────────────────────────────────────────────
  function renderSongList(){
    const container = document.getElementById('mvSongList');
    if(!container) return;
    const beats = getBeats().filter(b => {
      if(!_searchQuery) return true;
      return b.name.toLowerCase().includes(_searchQuery.toLowerCase());
    });

    if(!beats.length){
      container.innerHTML = `<div class="mv-empty">
        <div class="mv-empty-icon">🎵</div>
        ${_searchQuery ? 'Ingen treff' : 'Ingen sanger ennå'}
      </div>`;
      return;
    }

    container.innerHTML = beats.map(b => {
      const isPlaying = _currentBeatId === b.id && window.bottomPlayer && !window.bottomPlayer.audio.paused;
      const coverHtml = b.cover
        ? `<img src="${esc(b.cover)}" alt="">`
        : '🎵';
      const tags = [];
      if(b.bpm) tags.push(`${b.bpm} BPM`);
      if(b.key) tags.push(b.key);
      const metaStr = tags.join(' · ') || (b.duration ? fmtDuration(b.duration) : '');
      return `
        <div class="mv-song-row${_currentBeatId===b.id?' active-song':''}"
             data-beat-id="${esc(b.id)}"
             onclick="window.mvMobile.selectBeat('${esc(b.id)}')">
          <div class="mv-song-cover">${coverHtml}</div>
          <div class="mv-song-info">
            <div class="mv-song-name">${esc(b.name)}</div>
            ${metaStr ? `<div class="mv-song-meta">${esc(metaStr)}</div>` : ''}
          </div>
          <button class="mv-song-play-btn${isPlaying?' playing':''}"
                  onclick="event.stopPropagation();window.mvMobile.togglePlayBeat('${esc(b.id)}')"
                  title="${isPlaying?'Pause':'Spill'}">
            ${isPlaying ? '⏸' : '▶'}
          </button>
        </div>`;
    }).join('');
  }

  // ── Select beat ──────────────────────────────────────────────
  function selectBeat(id){
    _currentBeatId = id;
    renderSongList();
    updatePlayerUI();
    updateRecordScreen();
    showScreen('player');
  }

  // ── Player UI ────────────────────────────────────────────────
  function updatePlayerUI(){
    const beat = getCurrentBeat();
    const coverEl   = document.getElementById('mvBigCover');
    const nameEl    = document.getElementById('mvPlayerName');
    const subEl     = document.getElementById('mvPlayerSub');
    const editorEl  = document.getElementById('mvLyricsEditor');
    const playBtn   = document.getElementById('mvPlayBtn');

    if(!beat){
      if(nameEl) nameEl.textContent = 'Ingen sang valgt';
      if(subEl) subEl.textContent = 'Velg en sang fra liste';
      if(coverEl) coverEl.innerHTML = '🎵';
      if(editorEl) editorEl.innerHTML = '';
      return;
    }

    if(coverEl) coverEl.innerHTML = beat.cover ? `<img src="${esc(beat.cover)}" alt="">` : '🎵';
    if(nameEl) nameEl.textContent = beat.name;

    // Sub: tags
    const tags = [beat.bpm&&`${beat.bpm} BPM`, beat.key, beat.mood].filter(Boolean);
    if(subEl) subEl.textContent = tags.join(' · ') || '';

    // Lyrics: use first lyricSection text, fall back to beat.lyrics
    const lyricText = (beat.lyricSections&&beat.lyricSections.length&&beat.lyricSections[0].text)
      ? beat.lyricSections[0].text
      : (beat.lyrics || '');
    if(editorEl && document.activeElement !== editorEl){
      editorEl.innerText = lyricText;
    }

    // Play button state
    const bp = window.bottomPlayer;
    const isThisBeat = bp && bp.queue.length &&
      bp.queue[bp.index]?.id === beat.id;
    const isPlaying = isThisBeat && !bp.audio.paused;
    if(playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶';
  }

  function syncProgress(){
    const bp = window.bottomPlayer;
    if(!bp) return;
    const a = bp.audio;
    const dur = isFinite(a.duration) ? a.duration : 0;
    const current = document.getElementById('mvCurrent');
    const duration = document.getElementById('mvDuration');
    const seek = document.getElementById('mvSeek');
    if(current) current.textContent = fmtTime(a.currentTime);
    if(duration) duration.textContent = fmtTime(dur);
    if(seek && !seek.matches(':active')){
      seek.value = dur ? Math.round((a.currentTime/dur)*1000) : 0;
    }
  }

  // ── Audio controls ───────────────────────────────────────────
  function togglePlayBeat(id){
    ensureAudioUnlocked();
    const bp = window.bottomPlayer;
    if(!bp) return;
    const isThisBeat = bp.queue.length && bp.queue[bp.index]?.id === id;
    if(isThisBeat && !bp.audio.paused){
      bp.audio.pause();
    } else if(isThisBeat && bp.audio.paused){
      bp.audio.play().catch(()=>{});
    } else {
      if(typeof window.playSingleBeat === 'function') window.playSingleBeat(id);
    }
    setTimeout(()=>{ renderSongList(); updatePlayerUI(); }, 100);
  }

  function playerTogglePlay(){
    if(!_currentBeatId) return;
    togglePlayBeat(_currentBeatId);
  }

  function playerPrev(){
    const bp = window.bottomPlayer;
    if(bp) { if(typeof bottomPrev === 'function') bottomPrev(); }
    setTimeout(updatePlayerUI, 100);
  }
  function playerNext(){
    if(typeof bottomNext === 'function') bottomNext(false);
    setTimeout(updatePlayerUI, 100);
  }

  // ── Recording ────────────────────────────────────────────────
  let _mediaRecorder = null;
  let _recordChunks  = [];
  let _recordStart   = null;
  let _recordTimer   = null;
  let _waveAnim      = null;
  let _analyser      = null;
  let _audioCtx      = null;

  // Stored recordings: [{id, beatId, name, blob, url, created, duration}]
  const _recordings = JSON.parse(localStorage.getItem('mvMobileRecordings')||'[]');
  // Re-create blob URLs (they're revoked on reload, so URLs are gone — store base64 for persistence)

  function updateRecordScreen(){
    const beat = getCurrentBeat();
    const ctx = document.getElementById('mvRecordContext');
    if(ctx) ctx.textContent = beat ? `Sang: ${beat.name}` : 'Ingen sang valgt';
    renderRecordingsList();
  }

  function renderRecordingsList(){
    const container = document.getElementById('mvRecordingsList');
    if(!container) return;
    const beatRecs = _recordings.filter(r => r.beatId === _currentBeatId);
    if(!beatRecs.length){
      container.innerHTML = `<div class="mv-recordings-title">Opptak</div>
        <div class="mv-empty"><div class="mv-empty-icon">🎙️</div>Ingen opptak ennå</div>`;
      return;
    }
    container.innerHTML = `<div class="mv-recordings-title">Opptak (${beatRecs.length})</div>` +
      beatRecs.map(r => `
        <div class="mv-recording-row" id="mvrec-${r.id}">
          <div class="mv-recording-info">
            <div class="mv-recording-name">${esc(r.name)}</div>
            <div class="mv-recording-meta">${fmtTimestamp(r.created)} · ${fmtTime(r.duration||0)}</div>
          </div>
          <div class="mv-recording-actions">
            <button class="mv-rec-btn" onclick="window.mvMobile.playRecording('${r.id}')" title="Spill">▶</button>
            <button class="mv-rec-btn" onclick="window.mvMobile.downloadRecording('${r.id}')" title="Last ned">⬇</button>
            <button class="mv-rec-btn danger" onclick="window.mvMobile.deleteRecording('${r.id}')" title="Slett">🗑</button>
          </div>
        </div>`).join('');
  }

  async function startRecording(){
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      _recordChunks = [];
      _recordStart  = Date.now();

      // Waveform visualizer
      _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 64;
      const src = _audioCtx.createMediaStreamSource(stream);
      src.connect(_analyser);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      _mediaRecorder = new MediaRecorder(stream, mimeType ? {mimeType} : {});
      _mediaRecorder.ondataavailable = e => { if(e.data.size>0) _recordChunks.push(e.data); };
      _mediaRecorder.onstop = finalizeRecording;
      _mediaRecorder.start(100);

      // UI
      const btn   = document.getElementById('mvRecordBtn');
      const label = document.getElementById('mvRecordLabel');
      const timer = document.getElementById('mvRecordTimer');
      const wave  = document.getElementById('mvWaveform');
      if(btn)   btn.classList.add('recording');
      if(label) { label.textContent = 'Tar opp… Trykk for å stoppe'; label.classList.add('recording'); }
      if(timer) { timer.classList.add('visible'); }
      if(wave)  wave.classList.add('active');

      // Timer
      _recordTimer = setInterval(()=>{
        const elapsed = Math.floor((Date.now()-_recordStart)/1000);
        if(timer) timer.textContent = fmtTime(elapsed);
      }, 500);

      // Waveform animation
      const bars = document.querySelectorAll('#mvWaveform .mv-wave-bar');
      const dataArr = new Uint8Array(_analyser.frequencyBinCount);
      _waveAnim = setInterval(()=>{
        _analyser.getByteFrequencyData(dataArr);
        bars.forEach((bar,i)=>{
          const val = dataArr[i] || 0;
          bar.style.height = Math.max(3, (val/255)*40) + 'px';
        });
      }, 80);

    } catch(err) {
      if(err.name === 'NotAllowedError'){
        alert('Music Vault trenger tilgang til mikrofonen for å ta opp demo.');
      } else {
        alert('Kunne ikke starte innspilling: ' + err.message);
      }
    }
  }

  function stopRecording(){
    if(!_mediaRecorder || _mediaRecorder.state === 'inactive') return;
    _mediaRecorder.stop();
    _mediaRecorder.stream.getTracks().forEach(t => t.stop());
    clearInterval(_recordTimer);
    clearInterval(_waveAnim);
    if(_audioCtx) { _audioCtx.close(); _audioCtx = null; }

    const btn   = document.getElementById('mvRecordBtn');
    const label = document.getElementById('mvRecordLabel');
    const timer = document.getElementById('mvRecordTimer');
    const wave  = document.getElementById('mvWaveform');
    if(btn)   btn.classList.remove('recording');
    if(label) { label.textContent = 'Hold inne for å ta opp'; label.classList.remove('recording'); }
    if(timer) { timer.classList.remove('visible'); timer.textContent = '0:00'; }
    if(wave)  { wave.classList.remove('active'); wave.querySelectorAll('.mv-wave-bar').forEach(b=>b.style.height='4px'); }
  }

  function finalizeRecording(){
    const duration = Math.round((Date.now()-_recordStart)/1000);
    const beat = getCurrentBeat();
    const mimeType = _recordChunks[0]?.type || 'audio/webm';
    const blob = new Blob(_recordChunks, { type: mimeType });
    const ext  = mimeType.includes('mp4') ? 'm4a' : 'webm';
    const beatName = beat ? beat.name.replace(/[^a-zA-Z0-9æøåÆØÅ\s]/g,'').trim() : 'demo';
    const name = `${beatName}_demo_${new Date().toISOString().slice(0,10)}`;

    // Convert blob to base64 for localStorage persistence
    const reader = new FileReader();
    reader.onload = () => {
      const rec = {
        id:       Date.now().toString(36),
        beatId:   _currentBeatId,
        name:     name,
        base64:   reader.result,
        mimeType: mimeType,
        ext:      ext,
        created:  Date.now(),
        duration: duration
      };
      _recordings.unshift(rec);
      try { localStorage.setItem('mvMobileRecordings', JSON.stringify(_recordings)); } catch(e){}
      renderRecordingsList();
    };
    reader.readAsDataURL(blob);
    _recordChunks = [];
  }

  function playRecording(id){
    const rec = _recordings.find(r => r.id === id);
    if(!rec || !rec.base64) return;
    const a = new Audio(rec.base64);
    a.play().catch(()=>{});
  }

  function downloadRecording(id){
    const rec = _recordings.find(r => r.id === id);
    if(!rec || !rec.base64) return;
    const a = document.createElement('a');
    a.href = rec.base64;
    a.download = `${rec.name}.${rec.ext}`;
    a.click();
  }

  function deleteRecording(id){
    const idx = _recordings.findIndex(r => r.id === id);
    if(idx === -1) return;
    _recordings.splice(idx, 1);
    try { localStorage.setItem('mvMobileRecordings', JSON.stringify(_recordings)); } catch(e){}
    renderRecordingsList();
  }

  // ── Event bindings ───────────────────────────────────────────
  function bindEvents(){
    // Nav buttons
    document.querySelectorAll('.mv-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => showScreen(btn.dataset.screen));
    });

    // Search
    const search = document.getElementById('mvSearch');
    if(search){
      search.addEventListener('input', e => {
        _searchQuery = e.target.value;
        renderSongList();
      });
    }

    // Player controls
    document.getElementById('mvPlayBtn')?.addEventListener('click', playerTogglePlay);
    document.getElementById('mvPrevBtn')?.addEventListener('click', playerPrev);
    document.getElementById('mvNextBtn')?.addEventListener('click', playerNext);

    // Seek
    const seek = document.getElementById('mvSeek');
    if(seek){
      seek.addEventListener('change', e => {
        const bp = window.bottomPlayer;
        if(!bp) return;
        const a = bp.audio;
        if(isFinite(a.duration) && a.duration > 0){
          a.currentTime = (Number(e.target.value)/1000) * a.duration;
        }
      });
    }

    // Lyrics editor — autosave
    const editor = document.getElementById('mvLyricsEditor');
    if(editor){
      editor.addEventListener('input', () => {
        const beat = getCurrentBeat();
        if(beat) scheduleLyricSave(beat);
        const status = document.getElementById('mvLyricsSaveStatus');
        if(status) status.textContent = 'Skriver…';
      });
    }

    // Record button — tap to start/stop
    const recBtn = document.getElementById('mvRecordBtn');
    if(recBtn){
      recBtn.addEventListener('click', () => {
        if(_mediaRecorder && _mediaRecorder.state === 'recording'){
          stopRecording();
        } else {
          startRecording();
        }
      });
    }

    // Sync progress from bottomPlayer
    setInterval(()=>{
      if(_activeSreen === 'player') syncProgress();
      if(_activeSreen === 'songs')  renderSongList(); // keep play icons in sync
    }, 500);

    // Listen for bottomPlayer events to update play button
    const bp = window.bottomPlayer;
    if(bp && bp.audio){
      bp.audio.addEventListener('play',  ()=>updatePlayerUI());
      bp.audio.addEventListener('pause', ()=>updatePlayerUI());
      bp.audio.addEventListener('ended', ()=>updatePlayerUI());
    }
  }

  // ── Username display ─────────────────────────────────────────
  function showUsername(){
    const userEl = document.getElementById('mvTopUser');
    if(!userEl) return;
    const session = sessionStorage.getItem('mv_user') || sessionStorage.getItem('mv_username');
    if(session) userEl.textContent = session;
  }

  // ── Init ─────────────────────────────────────────────────────
  function init(){
    buildOverlay();
    bindEvents();
    showUsername();
    renderSongList();
    showScreen('songs');

    // Wait for state to be ready if not yet available
    if(!getState()){
      const waitForState = setInterval(()=>{
        if(getState()){
          clearInterval(waitForState);
          renderSongList();
        }
      }, 200);
    }
  }

  // Run after all other scripts have loaded
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>setTimeout(init, 300));
  } else {
    setTimeout(init, 300);
  }

  // ── Public API ───────────────────────────────────────────────
  window.mvMobile = {
    selectBeat,
    togglePlayBeat,
    playRecording,
    downloadRecording,
    deleteRecording
  };

})();
