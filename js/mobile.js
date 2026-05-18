/* ================================================================
   mobile.js — Music Vault v3
   Spotify-stil avspiller med store knapper og seksjonseditor
================================================================ */
(function(){
  'use strict';

  function isMobile(){
    return window.innerWidth <= 820 ||
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  if(!isMobile()) return;

  // ── Konstanter ──────────────────────────────────────────────
  const TYPE_LABELS = { hook:'Hook', verse:'Vers', bridge:'Bro', outro:'Outro', custom:'Custom' };
  const TYPE_CLASS  = { hook:'mv-type-hook', verse:'mv-type-verse', bridge:'mv-type-bridge', outro:'mv-type-outro', custom:'mv-type-custom' };
  const DEFAULT_SECTIONS = [
    { id:'hook',   type:'hook',   title:'Hook',   text:'', collapsed:false, done:false, order:0 },
    { id:'verse1', type:'verse',  title:'Vers 1', text:'', collapsed:false, done:false, order:1 },
    { id:'bridge', type:'bridge', title:'Bro',    text:'', collapsed:false, done:false, order:2 },
    { id:'verse2', type:'verse',  title:'Vers 2', text:'', collapsed:false, done:false, order:3 },
    { id:'outro',  type:'outro',  title:'Outro',  text:'', collapsed:true,  done:false, order:4 },
  ];

  // ── State ───────────────────────────────────────────────────
  let _currentBeatId  = null;
  let _activeScreen   = 'songs';
  let _activeTab      = 'tekst'; // 'tekst' | 'info'
  let _searchQuery    = '';

  // ── Helpers ─────────────────────────────────────────────────
  function getState(){ return typeof state !== 'undefined' ? state : window.state; }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function uid(){ return Math.random().toString(36).slice(2,9); }
  function fmtTime(sec){
    sec = Number(sec||0); if(!isFinite(sec)) return '0:00';
    return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;
  }
  function fmtTs(ms){
    const d=new Date(ms);
    return d.toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit'})+' '+
           d.toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
  }
  function getBeats(){ return (getState()?.beats||[]).filter(b=>!b.archived); }
  function getBeat(id){ return getBeats().find(b=>b.id===id)||null; }
  function getCurrentBeat(){ return _currentBeatId ? getBeat(_currentBeatId) : null; }

  function getSections(beat){
    if(!beat) return [];
    if(beat.lyricSections?.length) return beat.lyricSections;
    const secs = DEFAULT_SECTIONS.map(s=>({...s, id:s.id+'_'+uid()}));
    if(beat.lyrics?.trim()) secs[0].text = beat.lyrics;
    beat.lyricSections = secs;
    return secs;
  }

  // ── Autosave ────────────────────────────────────────────────
  let _st=null, _sm=null;
  function scheduleSave(){
    clearTimeout(_st);
    _st = setTimeout(()=>{ clearTimeout(_sm); _sm=null; doSave(); }, 800);
    if(!_sm) _sm = setTimeout(()=>{ _sm=null; clearTimeout(_st); _st=null; doSave(); }, 5000);
  }
  function doSave(){
    if(typeof saveState==='function') saveState();
    const el=document.getElementById('mvSaveStatus');
    if(el){ el.textContent='✓ Lagret'; setTimeout(()=>el.textContent='',2000); }
  }

  // ── iOS audio unlock ────────────────────────────────────────
  let _unlocked=false;
  function unlockAudio(){
    if(_unlocked) return; _unlocked=true;
    const a=window.bottomPlayer?.audio;
    if(a&&!a.src){
      const silent='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';
      a.src=silent; a.volume=0;
      a.play().then(()=>{a.pause();a.removeAttribute('src');a.volume=1;}).catch(()=>{a.removeAttribute('src');a.volume=1;});
    }
  }
  document.addEventListener('touchstart', unlockAudio, {once:true,passive:true});

  // ── Build overlay ───────────────────────────────────────────
  function buildOverlay(){
    const app=document.getElementById('app')||document.querySelector('.app')||document.querySelector('main');
    if(app) app.style.display='none';
    document.querySelectorAll('.bottom-player,.role-badge,.producer-login-btn,.global-search-wrap,.toolbar')
      .forEach(el=>el.style.display='none');

    const wrap=document.createElement('div');
    wrap.id='mvMobileApp';
    wrap.innerHTML=`
      <div class="mv-top-bar">
        <div class="mv-top-logo">Music Vault</div>
        <div class="mv-top-user" id="mvTopUser"></div>
      </div>

      <!-- ① Sanger -->
      <div class="mv-screen" id="mvScreenSongs">
        <div class="mv-songs-header">Sanger</div>
        <div class="mv-search-wrap">
          <input class="mv-search" id="mvSearch" type="search"
            placeholder="Søk etter sang…" autocomplete="off" autocorrect="off" spellcheck="false">
        </div>
        <div id="mvSongList"></div>
      </div>

      <!-- ② Spiller (Spotify-stil) -->
      <div class="mv-screen hidden mv-player-screen" id="mvScreenPlayer">

        <!-- Cover -->
        <div class="mv-cover-area">
          <div class="mv-big-cover" id="mvBigCover">🎵</div>
        </div>

        <!-- Tittel + fav -->
        <div class="mv-player-info-row">
          <div class="mv-player-title">
            <div class="mv-player-name" id="mvPlayerName">Velg en sang</div>
            <div class="mv-player-sub"  id="mvPlayerSub"></div>
          </div>
          <button class="mv-fav-btn" id="mvFavBtn" title="Favoritt">♡</button>
        </div>

        <!-- Progress -->
        <div class="mv-progress-area">
          <input class="mv-seek" id="mvSeek" type="range" min="0" max="1000" value="0">
          <div class="mv-progress-times">
            <span id="mvCurrent">0:00</span>
            <span id="mvDuration">0:00</span>
          </div>
        </div>

        <!-- Controls: shuffle | prev | play | next | repeat -->
        <div class="mv-controls">
          <button class="mv-ctrl-sm" id="mvShuffleBtn" title="Shuffle">⇌</button>
          <button class="mv-ctrl-btn" id="mvPrevBtn">⏮</button>
          <button class="mv-play-btn" id="mvPlayBtn">▶</button>
          <button class="mv-ctrl-btn" id="mvNextBtn">⏭</button>
          <button class="mv-ctrl-sm" id="mvSongsBtn" title="Sanglist">≡</button>
        </div>

        <!-- Sub-tabs -->
        <div class="mv-player-tabs">
          <button class="mv-player-tab active" data-tab="tekst">Tekst</button>
          <button class="mv-player-tab" data-tab="info">Detaljer</button>
        </div>

        <!-- Sections editor (tab: tekst) -->
        <div class="mv-sections-wrap" id="mvSectionsWrap">
          <div class="mv-sections-toolbar">
            <span class="mv-save-status" id="mvSaveStatus"></span>
            <button class="mv-add-section-btn" id="mvAddSectionBtn">+ Seksjon</button>
          </div>
          <div id="mvSectionsList"></div>
        </div>

        <!-- Info tab -->
        <div class="mv-sections-wrap hidden" id="mvInfoWrap">
          <div id="mvInfoContent" style="padding:24px 24px 60px"></div>
        </div>
      </div>

      <!-- ③ Demo -->
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
    _activeScreen=name;
    const map={songs:'mvScreenSongs',player:'mvScreenPlayer',record:'mvScreenRecord'};
    Object.entries(map).forEach(([k,id])=>document.getElementById(id)?.classList.toggle('hidden',k!==name));
    document.querySelectorAll('.mv-nav-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.screen===name));
    if(name==='player'){ updatePlayerUI(); renderSections(); }
    if(name==='record')  updateRecordScreen();
  }

  function showPlayerTab(tab){
    _activeTab=tab;
    document.querySelectorAll('.mv-player-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.getElementById('mvSectionsWrap')?.classList.toggle('hidden', tab!=='tekst');
    document.getElementById('mvInfoWrap')?.classList.toggle('hidden', tab!=='info');
    if(tab==='info') renderInfoTab();
  }

  // ── Song list ────────────────────────────────────────────────
  function renderSongList(){
    const c=document.getElementById('mvSongList'); if(!c) return;
    const beats=getBeats().filter(b=>!_searchQuery||b.name.toLowerCase().includes(_searchQuery.toLowerCase()));
    if(!beats.length){
      c.innerHTML=`<div class="mv-empty"><div class="mv-empty-icon">🎵</div>${_searchQuery?'Ingen treff':'Ingen sanger ennå'}</div>`;
      return;
    }
    const bp=window.bottomPlayer;
    c.innerHTML=beats.map(b=>{
      const cur=bp?.queue?.[bp.index]?.id;
      const playing=cur===b.id&&bp&&!bp.audio.paused;
      const cover=b.cover?`<img src="${esc(b.cover)}" alt="">`:'🎵';
      const tags=[b.bpm&&`${b.bpm} BPM`,b.key,b.duration&&fmtTime(b.duration)].filter(Boolean);
      return `
        <div class="mv-song-row${_currentBeatId===b.id?' active-song':''}"
             onclick="window.mvMobile.selectBeat('${esc(b.id)}')">
          <div class="mv-song-cover">${cover}</div>
          <div class="mv-song-info">
            <div class="mv-song-name">${esc(b.name)}</div>
            ${tags.length?`<div class="mv-song-meta">${tags.map(esc).join(' · ')}</div>`:''}
          </div>
          <button class="mv-song-play-btn${playing?' playing':''}"
                  onclick="event.stopPropagation();window.mvMobile.tapPlay('${esc(b.id)}')">
            ${playing?'⏸':'▶'}
          </button>
        </div>`;
    }).join('');
  }

  function selectBeat(id){
    _currentBeatId=id;
    renderSongList();
    showScreen('player');
  }

  // ── Audio: iOS-safe play ─────────────────────────────────────
  function tapPlay(id){
    unlockAudio();
    const bp=window.bottomPlayer; if(!bp) return;
    const cur=bp.queue?.[bp.index]?.id;
    if(cur===id&&!bp.audio.paused){ bp.audio.pause(); }
    else if(cur===id&&bp.audio.paused){ bp.audio.play().catch(()=>{}); }
    else { if(typeof window.playSingleBeat==='function') window.playSingleBeat(id); _currentBeatId=id; }
    setTimeout(()=>{renderSongList();updatePlayerUI();},150);
  }

  // ── Player UI ─────────────────────────────────────────────────
  function updatePlayerUI(){
    const beat=getCurrentBeat();
    const bp=window.bottomPlayer;

    // Cover
    const coverEl=document.getElementById('mvBigCover');
    if(coverEl) coverEl.innerHTML=beat?.cover?`<img src="${esc(beat.cover)}" alt="">`:'🎵';

    // Title
    const nameEl=document.getElementById('mvPlayerName');
    const subEl=document.getElementById('mvPlayerSub');
    if(nameEl) nameEl.textContent=beat?.name||'Velg en sang';
    if(subEl) subEl.textContent=beat?[beat.bpm&&`${beat.bpm} BPM`,beat.key,beat.mood].filter(Boolean).join(' · '):'';

    // Fav button
    const favBtn=document.getElementById('mvFavBtn');
    if(favBtn&&beat){ favBtn.textContent=beat.favorite?'★':'♡'; favBtn.classList.toggle('active',!!beat.favorite); }

    // Play btn
    const cur=bp?.queue?.[bp.index]?.id;
    const playing=cur===(_currentBeatId||beat?.id)&&bp&&!bp.audio.paused;
    const playBtn=document.getElementById('mvPlayBtn');
    if(playBtn) playBtn.textContent=playing?'⏸':'▶';

    // Cover background gradient update
    updatePlayerBg(beat);
  }

  function updatePlayerBg(beat){
    const screen=document.getElementById('mvScreenPlayer'); if(!screen) return;
    if(beat?.cover){
      screen.style.background='linear-gradient(180deg, rgba(40,28,10,.97) 0%, #0d0c0b 52%)';
    } else {
      screen.style.background='linear-gradient(180deg, rgba(30,22,12,.95) 0%, #0d0c0b 55%)';
    }
  }

  function syncProgress(){
    const bp=window.bottomPlayer; if(!bp) return;
    const a=bp.audio;
    const dur=isFinite(a.duration)?a.duration:0;
    const c=document.getElementById('mvCurrent');
    const d=document.getElementById('mvDuration');
    const s=document.getElementById('mvSeek');
    if(c) c.textContent=fmtTime(a.currentTime);
    if(d) d.textContent=fmtTime(dur);
    if(s&&!s.matches(':active')) s.value=dur?Math.round((a.currentTime/dur)*1000):0;
  }

  // ── Info tab ─────────────────────────────────────────────────
  function renderInfoTab(){
    const beat=getCurrentBeat();
    const c=document.getElementById('mvInfoContent'); if(!c) return;
    if(!beat){ c.innerHTML='<div class="mv-no-song-msg">Ingen sang valgt</div>'; return; }
    const rows=[
      beat.bpm     && ['BPM', beat.bpm],
      beat.key     && ['Toneart', beat.key],
      beat.mood    && ['Stemning', beat.mood],
      beat.duration&& ['Varighet', fmtTime(beat.duration)],
      beat.tags?.length && ['Tags', beat.tags.join(', ')],
      beat.uploadedBy && ['Lastet opp av', beat.uploadedBy],
    ].filter(Boolean);
    c.innerHTML=rows.map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.07)">
        <span style="font-size:14px;color:rgba(255,255,255,.4);font-weight:700">${esc(k)}</span>
        <span style="font-size:15px;font-weight:800">${esc(String(v))}</span>
      </div>`).join('')||'<div class="mv-no-song-msg" style="padding:40px 0">Ingen metadata</div>';
  }

  // ── Sections editor ──────────────────────────────────────────
  function renderSections(){
    const beat=getCurrentBeat();
    const c=document.getElementById('mvSectionsList'); if(!c) return;
    if(!beat){
      c.innerHTML=`<div class="mv-no-song-msg">Velg en sang for å skrive tekst.</div>`;
      return;
    }
    const secs=getSections(beat);
    c.innerHTML=secs.map(sec=>`
      <div class="mv-section-card${sec.collapsed?' collapsed':''}" data-sec-id="${esc(sec.id)}">
        <div class="mv-section-head" onclick="window.mvMobile.toggleSec('${esc(sec.id)}')">
          <span class="mv-section-type-pill ${TYPE_CLASS[sec.type]||'mv-type-custom'}"
                onclick="event.stopPropagation();window.mvMobile.changeType('${esc(sec.id)}')"
                title="Endre type">
            ${esc(TYPE_LABELS[sec.type]||sec.type)}
          </span>
          <input class="mv-section-title-input" value="${esc(sec.title)}"
                 onclick="event.stopPropagation()"
                 onchange="window.mvMobile.secTitle(this,'${esc(sec.id)}')"
                 oninput="window.mvMobile.secTitle(this,'${esc(sec.id)}')">
          <button class="mv-section-collapse-btn"
                  onclick="event.stopPropagation();window.mvMobile.toggleSec('${esc(sec.id)}')">▾</button>
        </div>
        <div class="mv-section-body">
          <textarea class="mv-section-textarea"
                    placeholder="${esc(TYPE_LABELS[sec.type]||'Tekst')}…"
                    oninput="window.mvMobile.secText(this,'${esc(sec.id)}')"
                    rows="6">${esc(sec.text||'')}</textarea>
          <div class="mv-section-footer">
            <button class="mv-section-delete-btn"
                    onclick="window.mvMobile.delSec('${esc(sec.id)}')">🗑 Slett seksjon</button>
          </div>
        </div>
      </div>`).join('');
  }

  // Type picker sheet
  function showTypeSheet(sec, cb){
    const sheet=document.createElement('div');
    sheet.className='mv-type-sheet';
    sheet.innerHTML=`<div class="mv-type-sheet-inner">
      <div class="mv-type-sheet-title">Velg seksjonstype</div>
      ${Object.keys(TYPE_LABELS).map(t=>`
        <button class="mv-type-option" data-type="${t}">
          <span class="mv-section-type-pill ${TYPE_CLASS[t]}">${esc(TYPE_LABELS[t])}</span>
          ${esc(TYPE_LABELS[t])}
        </button>`).join('')}
      <button class="mv-type-cancel">Avbryt</button>
    </div>`;
    document.getElementById('mvMobileApp').appendChild(sheet);
    sheet.querySelectorAll('[data-type]').forEach(btn=>btn.addEventListener('click',()=>{
      sec.type=btn.dataset.type; sheet.remove(); cb();
    }));
    sheet.querySelector('.mv-type-cancel').addEventListener('click',()=>sheet.remove());
    sheet.addEventListener('click',e=>{ if(e.target===sheet) sheet.remove(); });
  }

  // ── Record screen ────────────────────────────────────────────
  const _recs=(()=>{ try{ return JSON.parse(localStorage.getItem('mvMobileRecs')||'[]'); }catch{ return []; } })();
  function saveRecs(){ try{ localStorage.setItem('mvMobileRecs',JSON.stringify(_recs)); }catch{} }

  function updateRecordScreen(){
    const beat=getCurrentBeat();
    const ctx=document.getElementById('mvRecordContext');
    if(ctx) ctx.textContent=beat?`Sang: ${beat.name}`:'Ingen sang valgt';
    renderRecordingsList();
  }
  function renderRecordingsList(){
    const c=document.getElementById('mvRecordingsList'); if(!c) return;
    const recs=_recs.filter(r=>r.beatId===_currentBeatId);
    if(!recs.length){
      c.innerHTML=`<div class="mv-recordings-title">Opptak</div>
        <div class="mv-empty"><div class="mv-empty-icon">🎙</div>Ingen opptak ennå</div>`;
      return;
    }
    c.innerHTML=`<div class="mv-recordings-title">Opptak (${recs.length})</div>`+
      recs.map(r=>`
        <div class="mv-recording-row">
          <div class="mv-recording-info">
            <div class="mv-recording-name">${esc(r.name)}</div>
            <div class="mv-recording-meta">${fmtTs(r.created)} · ${fmtTime(r.duration)}</div>
          </div>
          <div class="mv-recording-actions">
            <button class="mv-rec-btn" onclick="window.mvMobile.playRec('${r.id}')">▶</button>
            <button class="mv-rec-btn" onclick="window.mvMobile.dlRec('${r.id}')">⬇</button>
            <button class="mv-rec-btn danger" onclick="window.mvMobile.delRec('${r.id}')">🗑</button>
          </div>
        </div>`).join('');
  }

  // ── Recording engine ─────────────────────────────────────────
  let _mr=null,_chunks=[],_recStart=null,_tI=null,_wI=null,_actx=null;
  async function startRec(){
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      _chunks=[];_recStart=Date.now();
      _actx=new(window.AudioContext||window.webkitAudioContext)();
      const an=_actx.createAnalyser();an.fftSize=64;
      _actx.createMediaStreamSource(stream).connect(an);
      const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':
                 MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':'';
      _mr=new MediaRecorder(stream,mime?{mimeType:mime}:{});
      _mr.ondataavailable=e=>{if(e.data.size>0)_chunks.push(e.data);};
      _mr.onstop=()=>finalizeRec(mime.includes('mp4')?'m4a':'webm',mime||'audio/webm');
      _mr.start(100);
      document.getElementById('mvRecordBtn')?.classList.add('recording');
      const lbl=document.getElementById('mvRecordLabel');
      if(lbl){lbl.textContent='Tar opp… Trykk for å stoppe';lbl.classList.add('recording');}
      document.getElementById('mvRecordTimer')?.classList.add('visible');
      document.getElementById('mvWaveform')?.classList.add('active');
      _tI=setInterval(()=>{const t=document.getElementById('mvRecordTimer');if(t)t.textContent=fmtTime(Math.floor((Date.now()-_recStart)/1000));},500);
      const bars=document.querySelectorAll('#mvWaveform .mv-wave-bar');
      const data=new Uint8Array(an.frequencyBinCount);
      _wI=setInterval(()=>{an.getByteFrequencyData(data);bars.forEach((b,i)=>b.style.height=Math.max(3,(data[i]||0)/255*50)+'px');},80);
    }catch(err){
      if(err.name==='NotAllowedError') alert('Music Vault trenger tilgang til mikrofon for å ta opp demo.');
      else alert('Kunne ikke starte innspilling: '+err.message);
    }
  }
  function stopRec(){
    if(!_mr||_mr.state==='inactive') return;
    _mr.stop();_mr.stream?.getTracks().forEach(t=>t.stop());
    clearInterval(_tI);clearInterval(_wI);
    if(_actx){_actx.close();_actx=null;}
    document.getElementById('mvRecordBtn')?.classList.remove('recording');
    const lbl=document.getElementById('mvRecordLabel');
    if(lbl){lbl.textContent='Trykk for å ta opp';lbl.classList.remove('recording');}
    document.getElementById('mvRecordTimer')?.classList.remove('visible');
    const w=document.getElementById('mvWaveform');
    if(w){w.classList.remove('active');w.querySelectorAll('.mv-wave-bar').forEach(b=>b.style.height='4px');}
  }
  function finalizeRec(ext,mimeType){
    const dur=Math.round((Date.now()-_recStart)/1000);
    const beat=getCurrentBeat();
    const blob=new Blob(_chunks,{type:mimeType});
    const name=(beat?.name||'demo').replace(/[^\w\sæøåÆØÅ]/g,'').trim()+'_demo_'+new Date().toISOString().slice(0,10);
    const reader=new FileReader();
    reader.onload=()=>{
      _recs.unshift({id:Date.now().toString(36),beatId:_currentBeatId,name,base64:reader.result,mimeType,ext,created:Date.now(),duration:dur});
      saveRecs();renderRecordingsList();
    };
    reader.readAsDataURL(blob);
    _chunks=[];
  }

  // ── Public API ───────────────────────────────────────────────
  window.mvMobile = {
    selectBeat,
    tapPlay,
    toggleSec(id){
      const beat=getCurrentBeat();if(!beat)return;
      const sec=getSections(beat).find(s=>s.id===id);if(!sec)return;
      sec.collapsed=!sec.collapsed;
      document.querySelector(`[data-sec-id="${CSS.escape(id)}"]`)?.classList.toggle('collapsed',sec.collapsed);
      scheduleSave();
    },
    secTitle(input,id){
      const beat=getCurrentBeat();if(!beat)return;
      const sec=getSections(beat).find(s=>s.id===id);if(!sec)return;
      sec.title=input.value;scheduleSave();
    },
    secText(textarea,id){
      const beat=getCurrentBeat();if(!beat)return;
      const sec=getSections(beat).find(s=>s.id===id);if(!sec)return;
      sec.text=textarea.value;
      beat.lyrics=getSections(beat).map(s=>s.text).join('\n');
      const el=document.getElementById('mvSaveStatus');if(el)el.textContent='…';
      scheduleSave();
    },
    delSec(id){
      const beat=getCurrentBeat();if(!beat)return;
      const secs=getSections(beat);const idx=secs.findIndex(s=>s.id===id);if(idx===-1)return;
      if(secs.length<=1){alert('Kan ikke slette siste seksjon.');return;}
      secs.splice(idx,1);renderSections();scheduleSave();
    },
    addSection(){
      const beat=getCurrentBeat();if(!beat)return;
      const secs=getSections(beat);
      secs.push({id:uid(),type:'custom',title:'Ny seksjon',text:'',collapsed:false,done:false,order:secs.length});
      renderSections();scheduleSave();
      setTimeout(()=>document.querySelector('.mv-section-card:last-child')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    },
    changeType(id){
      const beat=getCurrentBeat();if(!beat)return;
      const sec=getSections(beat).find(s=>s.id===id);if(!sec)return;
      showTypeSheet(sec,()=>{renderSections();scheduleSave();});
    },
    toggleFav(){
      const beat=getCurrentBeat();if(!beat)return;
      beat.favorite=!beat.favorite;if(typeof saveState==='function')saveState();
      const btn=document.getElementById('mvFavBtn');
      if(btn){btn.textContent=beat.favorite?'★':'♡';btn.classList.toggle('active',beat.favorite);}
    },
    playRec(id){ const r=_recs.find(x=>x.id===id);if(r?.base64)new Audio(r.base64).play().catch(()=>{}); },
    dlRec(id){ const r=_recs.find(x=>x.id===id);if(!r)return;const a=document.createElement('a');a.href=r.base64;a.download=`${r.name}.${r.ext}`;a.click(); },
    delRec(id){ const i=_recs.findIndex(x=>x.id===id);if(i===-1)return;_recs.splice(i,1);saveRecs();renderRecordingsList(); },
  };

  // ── Event bindings ───────────────────────────────────────────
  function bindEvents(){
    // Nav
    document.querySelectorAll('.mv-nav-btn').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));
    // Player sub-tabs
    document.querySelectorAll('.mv-player-tab').forEach(btn=>btn.addEventListener('click',()=>showPlayerTab(btn.dataset.tab)));
    // Search
    document.getElementById('mvSearch')?.addEventListener('input',e=>{_searchQuery=e.target.value;renderSongList();});
    // Seek
    document.getElementById('mvSeek')?.addEventListener('change',e=>{
      const bp=window.bottomPlayer;if(!bp)return;
      const a=bp.audio;if(isFinite(a.duration)&&a.duration>0)a.currentTime=(e.target.value/1000)*a.duration;
    });
    // Player controls
    document.getElementById('mvPlayBtn')?.addEventListener('click',()=>{ if(_currentBeatId)tapPlay(_currentBeatId); });
    document.getElementById('mvPrevBtn')?.addEventListener('click',()=>{ if(typeof bottomPrev==='function')bottomPrev();setTimeout(updatePlayerUI,100); });
    document.getElementById('mvNextBtn')?.addEventListener('click',()=>{ if(typeof bottomNext==='function')bottomNext(false);setTimeout(updatePlayerUI,100); });
    document.getElementById('mvShuffleBtn')?.addEventListener('click',()=>{ /* future */ });
    document.getElementById('mvSongsBtn')?.addEventListener('click',()=>showScreen('songs'));
    document.getElementById('mvFavBtn')?.addEventListener('click',()=>window.mvMobile.toggleFav());
    // Sections
    document.getElementById('mvAddSectionBtn')?.addEventListener('click',()=>window.mvMobile.addSection());
    // Record
    document.getElementById('mvRecordBtn')?.addEventListener('click',()=>{ if(_mr&&_mr.state==='recording')stopRec();else startRec(); });
    // Sync loop
    setInterval(()=>{
      if(_activeScreen==='player')syncProgress();
      if(_activeScreen==='songs') renderSongList();
    },500);
    // Audio events
    const bp=window.bottomPlayer;
    if(bp?.audio){
      bp.audio.addEventListener('play', updatePlayerUI);
      bp.audio.addEventListener('pause',updatePlayerUI);
      bp.audio.addEventListener('ended',updatePlayerUI);
    }
  }

  // ── Init ─────────────────────────────────────────────────────
  function showUsername(){
    const u=sessionStorage.getItem('mv_user')||sessionStorage.getItem('mv_username')||sessionStorage.getItem('currentUser');
    const el=document.getElementById('mvTopUser');if(el&&u)el.textContent=u;
  }
  function init(){
    buildOverlay();bindEvents();showUsername();
    const poll=()=>{ if(getState())renderSongList(); else setTimeout(poll,250); };
    poll();
    showScreen('songs');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,300));
  else setTimeout(init,300);

})();
