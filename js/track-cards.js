// === cleanTrackCardsJs ===
(function(){
  function cropImageToCanvas(img,w,h){
    const canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d');
    const scale=Math.max(w/img.width,h/img.height);
    const sw=w/scale, sh=h/scale;
    const sx=(img.width-sw)/2, sy=(img.height-sh)/2;
    ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
    return canvas;
  }
  window.setAlbumBeatCover=function(id,input){
    const f=input?.files?.[0]; if(!f)return;
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const b=state.beats.find(x=>x.id===id); if(!b)return;
        b.cover=cropImageToCanvas(img,800,600).toDataURL('image/jpeg',.88);
        saveState();
        if(window.currentMixtapeId&&typeof renderMixtapeDetail==='function')renderMixtapeDetail();
        else if(typeof renderAlbumDetail==='function')renderAlbumDetail();
        if(typeof showToast==='function')showToast('✓ Coverbildet er croppet og lagret');
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(f);
  };

  // from songCardOpenByCoverTitleJs
// Gjør sangtittel klikkbar på samme måte som coverbildet.
  document.addEventListener('click', function(e){
    const title=e.target.closest('.album-beat-card .ab-title');
    if(!title) return;
    if(e.target.closest('button,input,textarea,label,select,a')) return;
    const card=title.closest('.album-beat-card');
    const id=card && card.dataset ? card.dataset.beatId : null;
    if(!id || typeof window.toggleAlbumBeat!=='function') return;
    e.preventDefault();
    e.stopPropagation();
    window.toggleAlbumBeat(id);
  }, true);

  // from trackCardActionsNoBatchOverrideJs
function organizeTrackActions(root){
    (root||document).querySelectorAll('.album-beat-card').forEach(card=>{
      card.classList.remove('is-batch-selected');
      card.querySelectorAll('.select-beat-check,.batch-bar').forEach(el=>el.remove());
      const titleRow=card.querySelector('.ab-body > div:first-child');
      if(!titleRow) return;
      let actions=titleRow.querySelector('.track-card-actions');
      if(!actions){
        actions=document.createElement('div');
        actions.className='track-card-actions';
        titleRow.appendChild(actions);
      }
      const play=titleRow.querySelector(':scope > .quick-play-btn') || card.querySelector('.quick-play-btn');
      const star=titleRow.querySelector(':scope > .star-btn') || card.querySelector('.star-btn[data-fav-id]');
      if(play && play.parentElement!==actions) actions.appendChild(play);
      if(star && star.parentElement!==actions) actions.appendChild(star);
    });
  }
  const run=()=>requestAnimationFrame(()=>organizeTrackActions(document));
  document.addEventListener('DOMContentLoaded',run);
  window.addEventListener('load',run);
  document.addEventListener('click',e=>{ if(e.target.closest('[data-track-view],.collection-filter,.quick-play-btn,.star-btn')) setTimeout(run,0); }, true);
  const oldRender=window.renderAlbumBeats;
  if(typeof oldRender==='function'){
    window.renderAlbumBeats=function(){
      const ret=oldRender.apply(this,arguments);
      run();
      return ret;
    };
  }
  window.toggleBeatSelect=function(){};
  window.batchFavorite=function(){};
  window.batchRemove=function(){};
  window.batchMoveToAlbum=function(){};
  run();

  // from marcus-minimal-track-list-fix-js
function fmt(sec){
    sec=Number(sec||0);
    if(!isFinite(sec)||sec<=0) return '—';
    if(typeof window.fmtTime==='function') return window.fmtTime(sec);
    const m=Math.floor(sec/60), s=Math.floor(sec%60);
    return m+':'+String(s).padStart(2,'0');
  }
  function organize(){
    document.querySelectorAll('.album-beat-listmode .album-beat-card').forEach(card=>{
      const id=card.dataset.beatId;
      const b=(window.state?.beats||[]).find(x=>x.id===id);
      const titleRow=card.querySelector('.ab-body > div:first-child');
      if(!titleRow||!b) return;
      let actions=titleRow.querySelector('.track-card-actions');
      if(!actions){actions=document.createElement('div');actions.className='track-card-actions';titleRow.appendChild(actions);}
      let dur=actions.querySelector('.track-duration');
      if(!dur){dur=document.createElement('span');dur.className='track-duration';actions.prepend(dur);}
      dur.textContent=fmt(b.duration);
      const star=titleRow.querySelector(':scope > .star-btn') || card.querySelector('.star-btn[data-fav-id]');
      const play=titleRow.querySelector(':scope > .quick-play-btn') || card.querySelector('.quick-play-btn');
      if(star && star.parentElement!==actions) actions.appendChild(star);
      if(play && play.parentElement!==actions) actions.appendChild(play);
    });
  }
  const run=()=>requestAnimationFrame(organize);
  document.addEventListener('DOMContentLoaded',run);
  window.addEventListener('load',run);
  document.addEventListener('click',()=>setTimeout(run,0),true);
  const old=window.renderAlbumBeats;
  if(typeof old==='function'){window.renderAlbumBeats=function(){const ret=old.apply(this,arguments);run();return ret;};}
  run();
})();

// === trackListModeAndPlaceholderJs ===
(function(){
  const KEY = 'musicVaultTrackViewMode';

  function currentView(){ return localStorage.getItem(KEY) || 'list'; }

  function saveView(mode){
    const v = ['list','cards','studio'].includes(mode) ? mode : 'list';
    try{ localStorage.setItem(KEY, v); } catch(e){}
    return v;
  }

  function applyView(el){
    if(!el) return;
    const view = currentView();
    el.classList.remove('album-beat-grid','album-beat-listmode','album-beat-studio');
    if(view === 'list')   el.classList.add('album-beat-listmode');
    else if(view === 'studio') el.classList.add('album-beat-studio');
    else                  el.classList.add('album-beat-grid');
    updateToggleButtons();
  }

  function updateToggleButtons(){
    const v = currentView();
    document.querySelectorAll('[data-track-view]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.trackView === v);
    });
  }

  function activeMode(){
    const mv = document.getElementById('mixtapeDetailView');
    const av = document.getElementById('albumDetailView');
    if(mv && !mv.classList.contains('hidden')) return 'mixtape';
    if(av && !av.classList.contains('hidden')) return 'album';
    if(typeof currentMixtapeId !== 'undefined' && currentMixtapeId) return 'mixtape';
    if(typeof currentAlbumId   !== 'undefined' && currentAlbumId)   return 'album';
    return null;
  }

  function rerenderActive(){
    const type = activeMode();
    if(type === 'mixtape' && typeof renderMixtapeDetail === 'function') renderMixtapeDetail();
    else if(type === 'album' && typeof renderAlbumDetail === 'function') renderAlbumDetail();
  }

  // THE single authoritative setTrackViewMode
  window.setTrackViewMode = function(mode){
    saveView(mode);
    // If studio, delegate to advancedSetTrackViewMode if it handles studio rendering
    if(mode === 'studio' && typeof window.advancedSetTrackViewMode === 'function'){
      window.advancedSetTrackViewMode('studio');
      return;
    }
    // Apply CSS classes immediately without full re-render
    applyView(document.getElementById('mixtapeBeatList'));
    applyView(document.getElementById('albumBeatList'));
    updateToggleButtons();
  };

  window.advancedSetTrackViewMode = function(mode){
    saveView(mode);
    rerenderActive();
    updateToggleButtons();
  };

  const previousRender = window.renderAlbumBeats;
  window.renderAlbumBeats = function(beats, mode, customEl){
    if(typeof previousRender === 'function') previousRender(beats, mode, customEl);
    const el = customEl || document.getElementById(mode === 'mixtape' ? 'mixtapeBeatList' : 'albumBeatList');
    applyView(el);
    updateToggleButtons();
  };

  const boot = () => {
    applyView(document.getElementById('mixtapeBeatList'));
    applyView(document.getElementById('albumBeatList'));
    updateToggleButtons();
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

// === clean-song-detail-fields-script ===
(function(){
  function removeSongMetaFields(){
    document.querySelectorAll('.ux-extra-fields,.full-meta-extra,.meta-mini-grid,.structure-tags,.loop-controls,.waveform').forEach(el=>el.remove());
  }
  const oldRender=window.renderAlbumBeats;
  if(typeof oldRender==='function'){
    window.renderAlbumBeats=function(beats,mode,customEl){
      oldRender(beats,mode,customEl);
      requestAnimationFrame(removeSongMetaFields);
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeSongMetaFields);else removeSongMetaFields();
})();

// === advanced-music-vault-upgrades-js ===
(function(){
  const KEY='musicVaultTrackViewMode';
  const FILTER_KEY='musicVaultCollectionFilter';
  const SEARCH_KEY='musicVaultCollectionSearch';
  function safe(s){return (window.esc?esc:String)(s||'');}
  function getBeat(id){const source=(typeof state!=='undefined'&&state?.beats)?state.beats:(window.state?.beats||[]);return source.find(b=>b.id===id);}
  function getModeForEl(el){return el?.id==='mixtapeBeatList'?'mixtape':'album';}
  function getCollection(mode){return mode==='mixtape'?(state.mixtapes||[]).find(m=>m.id===currentMixtapeId):(state.albums||[]).find(a=>a.id===currentAlbumId);}
  function currentView(){return localStorage.getItem(KEY)||'list';}
  function getFilter(){return localStorage.getItem(FILTER_KEY)||'all';}
  function getSearch(){return localStorage.getItem(SEARCH_KEY)||'';}
  function hasAudio(b){return !!(b.audio_url||b.audioUrl||b.fileName||b.source||b.hasAudio);}
  function hasLyrics(b){return !!String(b.lyrics||'').replace(/<[^>]+>/g,'').trim();}
  function collectionCover(mode){return getCollection(mode)?.cover||'';}
  function coverForBeat(b,mode){return b?.cover||collectionCover(mode)||'';}
  function matchFilter(b,filter,mode){
    if(filter==='fav')return !!b.favorite;
    if(filter==='todo')return Number(b.done||0)<100;
    if(filter==='done')return Number(b.done||0)>=100;
    if(filter==='noaudio')return !hasAudio(b);
    if(filter==='lyrics')return hasLyrics(b);
    return true;
  }
  function getVisibleBeatsFor(mode){
    const col=getCollection(mode); const ids=col?.beatIds||[]; const q=getSearch().toLowerCase().trim(); const f=getFilter();
    return ids.map(getBeat).filter(Boolean).filter(b=>matchFilter(b,f,mode)).filter(b=>!q||String(b.name||'').toLowerCase().includes(q)||String(b.lyrics||'').toLowerCase().includes(q));
  }
  function installTools(mode){
    const detail=document.getElementById(mode==='mixtape'?'mixtapeDetailView':'albumDetailView'); if(!detail||detail.classList.contains('hidden'))return;
    const list=document.getElementById(mode==='mixtape'?'mixtapeBeatList':'albumBeatList'); if(!list)return;
    const drop=document.getElementById(mode==='mixtape'?'mixtapeDrop':'albumDrop');
    let tools=detail.querySelector('.collection-tools');
    if(!tools){
      tools=document.createElement('div');tools.className='collection-tools';
      tools.innerHTML=`<input class="collection-search" placeholder="Søk i sanger eller tekst..." value="${safe(getSearch())}" oninput="advancedTrackSearch(this.value)">
        <button class="collection-filter" data-filter="all" onclick="advancedTrackFilter('all')">Alle</button>
        <button class="collection-filter" data-filter="fav" onclick="advancedTrackFilter('fav')">★ Favoritter</button>
        <button class="collection-filter" data-filter="todo" onclick="advancedTrackFilter('todo')">Uferdige</button>
        <button class="collection-filter" data-filter="done" onclick="advancedTrackFilter('done')">Ferdige</button>
        <button class="collection-filter" data-filter="noaudio" onclick="advancedTrackFilter('noaudio')">Mangler lyd</button>
        <button class="collection-filter" data-filter="lyrics" onclick="advancedTrackFilter('lyrics')">Har tekst</button>
        <span class="collection-count" data-count></span>`;
      (drop||list).insertAdjacentElement(drop?'afterend':'beforebegin',tools);
    }
    tools.querySelector('.collection-search').value=getSearch();
    tools.querySelectorAll('.collection-filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===getFilter()));
  }
  function installStudioToggle(){
    document.querySelectorAll('.track-view-toggle').forEach(t=>{
      if(t.querySelector('[data-track-view="studio"]'))return;
      t.insertAdjacentHTML('beforeend',`<button type="button" data-track-view="studio" onclick="advancedSetTrackViewMode('studio')">▤ Studio</button>`);
    });
    updateToggleButtons();
  }
  function updateToggleButtons(){document.querySelectorAll('[data-track-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.trackView===currentView()));}
  window.advancedSetTrackViewMode=function(mode){
    const next=['cards','list','studio'].includes(mode)?mode:'cards';
    localStorage.setItem(KEY,next);
    rerenderActive();
    updateToggleButtons();
  };
  const oldSet=window.setTrackViewMode;
  window.setTrackViewMode=function(mode){
    if(mode==='studio')return window.advancedSetTrackViewMode('studio');
    const next=mode==='list'?'list':'cards';
    localStorage.setItem(KEY,next);
    /* Viktig: når man bytter fra Studio tilbake til Kort/Liste må hele
       track-listen rendres på nytt. Ellers blir studio-board stående i DOM-en. */
    rerenderActive();
    updateToggleButtons();
  };
  /* advancedTrackFilter removed — unused */rerenderActive();};
  window.advancedTrackSearch = function(q){
    window.__advSearchQ = (q||'').toLowerCase().trim();
    if(typeof window.renderAlbumBeats==='function') renderAll();
  };applyCurrentFiltersOnly();};
  function rerenderActive(){
    if(!document.getElementById('mixtapeDetailView')?.classList.contains('hidden')&&typeof renderMixtapeDetail==='function')renderMixtapeDetail();
    else if(typeof renderAlbumDetail==='function')renderAlbumDetail();
  }
  function applyCurrentFiltersOnly(){
    ['mixtape','album'].forEach(mode=>{
      const el=document.getElementById(mode==='mixtape'?'mixtapeBeatList':'albumBeatList'); if(!el)return;
      if(currentView()==='studio'){renderStudioBoard(el,mode);return;}
      const visible=new Set(getVisibleBeatsFor(mode).map(b=>b.id)); let shown=0;
      el.querySelectorAll('.album-beat-card').forEach(card=>{const show=visible.has(card.dataset.beatId);card.style.display=show?'':'none';if(show)shown++;});
      updateCount(mode,shown);
    });
  }
  function updateCount(mode,shown){
    const detail=document.getElementById(mode==='mixtape'?'mixtapeDetailView':'albumDetailView'); const c=detail?.querySelector('[data-count]'); if(!c)return;
    const total=(getCollection(mode)?.beatIds||[]).length; c.textContent=`${shown ?? getVisibleBeatsFor(mode).length}/${total} vises`;
    detail.querySelectorAll('.collection-filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===getFilter()));
  }
  function enhanceEmpty(el,mode){
    const empty=el?.querySelector('.empty'); if(!empty)return;
    empty.classList.add('upgraded-empty');
    empty.innerHTML=`<strong>Ingen sanger her ennå</strong><span>Slipp lydfiler i feltet over, eller bruk «Legg til eksisterende» for å bygge tracklisten.</span>`;
  }
  function enhanceCards(el,mode){
    if(!el)return;
    enhanceEmpty(el,mode);
    const colCover=collectionCover(mode);
    el.querySelectorAll('.album-beat-card').forEach(card=>{
      const b=getBeat(card.dataset.beatId); if(!b)return;
      const cover=coverForBeat(b,mode);
      const wrap=card.querySelector('.ab-cover-wrap');
      if(cover && !card.querySelector('.ab-cover')){
        const ph=card.querySelector('.ab-cover-ph'); if(ph)ph.outerHTML=`<img class="ab-cover" src="${safe(cover)}" alt="${safe(b.name)}">`;
      }
      if(!card.querySelector('.quick-play-btn')){
        const titleRow=card.querySelector('.ab-body > div:first-child');
        const btn=document.createElement('button');btn.type='button';btn.className='quick-play-btn';btn.textContent='▶';btn.title='Spill sang';
        btn.onclick=(e)=>{e.stopPropagation();playSingleBeat(b.id);};
        titleRow?.appendChild(btn);
      }
      if(!card.querySelector('.beat-chip-row')){
        const body=card.querySelector('.ab-body');
        const chips=document.createElement('div');chips.className='beat-chip-row';
        const status=Number(b.done||0)>=100?'Ferdig':(Number(b.done||0)>0?'Pågår':'Idé');
        chips.innerHTML=`<span class="pill">${status}</span>${hasAudio(b)?'<span class="pill">Lyd</span>':'<span class="pill">Mangler lyd</span>'}${hasLyrics(b)?'<span class="pill">Tekst</span>':''}`;
        body?.appendChild(chips);
      }
    });
    markPlayingCard();
  }
  function studioColumnFor(b){const d=Number(b.done||0); if(d>=100)return 'Ferdig'; if(d>=70)return 'Miks/Master'; if(d>=30)return 'Spilt inn'; return 'Idé/Skriver';}
  function renderStudioBoard(el,mode){
    const beats=getVisibleBeatsFor(mode); const cols=['Idé/Skriver','Spilt inn','Miks/Master','Ferdig'];
    el.classList.remove('album-beat-grid','album-beat-listmode'); el.classList.add('album-beat-grid');
    const by=Object.fromEntries(cols.map(c=>[c,[]])); beats.forEach(b=>by[studioColumnFor(b)].push(b));
    el.innerHTML=`<div class="studio-board">${cols.map(c=>`<div class="studio-col"><div class="studio-col-head"><span>${c}</span><span>${by[c].length}</span></div>${by[c].map(b=>studioTrack(b,mode)).join('')||'<div class="studio-empty">Ingen sanger</div>'}</div>`).join('')}</div>`;
    updateCount(mode,beats.length); markPlayingCard();
  }
  function studioTrack(b,mode){const cov=coverForBeat(b,mode);return `<div class="studio-track" data-beat-id="${safe(b.id)}" onclick="toggleAlbumBeat('${safe(b.id)}')"><div>${cov?`<img class="studio-thumb" src="${safe(cov)}" alt="">`:'<div class="studio-thumb"></div>'}</div><div style="min-width:0"><div class="studio-title">${safe(b.name)}</div><div class="studio-sub">${b.favorite?'★ ':''}${b.done||0}% ferdig · ${hasAudio(b)?'har lyd':'mangler lyd'}</div></div><div class="studio-actions"><button onclick="event.stopPropagation();playSingleBeat('${safe(b.id)}')">▶</button><button onclick="event.stopPropagation();toggleFav('${safe(b.id)}',this)">★</button></div></div>`;}
  function applyAdvanced(el,mode){
    installTools(mode); installStudioToggle(); updateToggleButtons();
    if(currentView()==='studio'){renderStudioBoard(el,mode);return;}
    enhanceCards(el,mode); applyCurrentFiltersOnly();
  }
  function markPlayingCard(){
    const id=window.bottomPlayer?.queue?.[window.bottomPlayer.index]?.id;
    const playing=id&&!window.bottomPlayer.audio.paused;
    document.querySelectorAll('.quick-play-btn.playing').forEach(b=>b.classList.remove('playing'));
    if(playing)document.querySelectorAll(`#abi-${CSS.escape(id)} .quick-play-btn`).forEach(b=>{b.classList.add('playing');b.textContent='⏸';});
  }
  const oldRender=window.renderAlbumBeats;
  if(typeof oldRender==='function'){
    window.renderAlbumBeats=function(beats,mode,customEl){
      oldRender(beats,mode,customEl);
      const m=mode||getModeForEl(customEl)||'album'; const el=customEl||document.getElementById(m==='mixtape'?'mixtapeBeatList':'albumBeatList');
      requestAnimationFrame(()=>applyAdvanced(el,m));
    };
  }
  const oldUpdate=window.updateBottomUI;
  if(typeof oldUpdate==='function'){
    window.updateBottomUI=function(){oldUpdate(); const b=bottomPlayer.queue?.[bottomPlayer.index]; const cov=b?coverForBeat(b,bottomPlayer.context?.type):''; const cover=document.getElementById('bpCover'); if(cover&&cov&&!b.cover)cover.innerHTML=`<img src="${safe(cov)}" alt="">`; markPlayingCard();};
  }
  function addOpenCurrentButton(){
    const actions=document.querySelector('.bottom-player .bp-actions'); if(!actions||actions.querySelector('.bp-open-current'))return;
    actions.insertAdjacentHTML('afterbegin',`<button class="bp-btn bp-open-current" onclick="advancedOpenCurrentTrack()" title="Åpne sangkort">Åpne</button>`);
  }
  /* advancedOpenCurrentTrack removed — unused */ if(!b)return; const card=document.getElementById(`abi-${b.id}`); if(card){card.scrollIntoView({behavior:'smooth',block:'center'}); if(!card.classList.contains('expanded'))toggleAlbumBeat(b.id);}else showToast('Åpne albumet eller mixtapen for å se sangkortet');};
  function boot(){addOpenCurrentButton(); ['mixtape','album'].forEach(mode=>{const el=document.getElementById(mode==='mixtape'?'mixtapeBeatList':'albumBeatList'); if(el)applyAdvanced(el,mode);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();

// === final-view-toggle-and-archive-fix ===
(function(){
  const VIEW_KEY = 'musicVaultTrackViewMode';
  let cleanupQueued = false;
  let rerenderQueued = false;

  function normalizeView(mode){
    return ['cards','list','studio'].includes(mode) ? mode : 'cards';
  }
  function currentView(){
    return normalizeView(localStorage.getItem(VIEW_KEY) || 'cards');
  }
  function isVisible(el){
    return !!el && !el.classList.contains('hidden');
  }
  function activeCollection(){
    const albumView = document.getElementById('albumDetailView');
    const mixView = document.getElementById('mixtapeDetailView');
    if(isVisible(albumView) && typeof currentAlbumId !== 'undefined' && currentAlbumId){
      return { type:'album', listId:'albumBeatList' };
    }
    if(isVisible(mixView) && typeof currentMixtapeId !== 'undefined' && currentMixtapeId){
      return { type:'mixtape', listId:'mixtapeBeatList' };
    }
    return null;
  }
  function updateViewButtons(){
    const view = currentView();
    document.querySelectorAll('[data-track-view]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.trackView === view);
    });
  }
  function cleanupArchiveToolbars(){
    cleanupQueued = false;
    const configs = [
      { hd:'albumDetailHd', preferred:'#archiveAlbumBtn' },
      { hd:'mixtapeDetailHd', preferred:'#archiveMixtapeBtn, [onclick*="openCassetteCropEditor"]' }
    ];
    configs.forEach(cfg=>{
      const hd = document.getElementById(cfg.hd);
      const parent = hd?.parentElement;
      if(!parent) return;
      const bars = Array.from(parent.children).filter(el=>el.classList && el.classList.contains('archive-toolbar'));
      if(bars.length <= 1) return;
      const preferred = bars.find(bar=>bar.querySelector(cfg.preferred)) || bars[0];
      bars.forEach(bar=>{ if(bar !== preferred) bar.remove(); });
    });
  }
  function queueArchiveCleanup(){
    if(cleanupQueued) return;
    cleanupQueued = true;
    requestAnimationFrame(cleanupArchiveToolbars);
  }
  function refreshActiveView(){
    rerenderQueued = false;
    const active = activeCollection();
    if(active?.type === 'album' && typeof renderAlbumDetail === 'function'){
      const list = document.getElementById(active.listId);
      if(list) list.innerHTML = '';
      renderAlbumDetail();
    }else if(active?.type === 'mixtape' && typeof renderMixtapeDetail === 'function'){
      const list = document.getElementById(active.listId);
      if(list) list.innerHTML = '';
      renderMixtapeDetail();
    }
    requestAnimationFrame(()=>{
      updateViewButtons();
      queueArchiveCleanup();
    });
  }
  function setView(mode){
    localStorage.setItem(VIEW_KEY, normalizeView(mode));
    updateViewButtons();
    if(!rerenderQueued){
      rerenderQueued = true;
      requestAnimationFrame(refreshActiveView);
    }
  }

  // Én felles, robust handler for Kort/Liste/Studio. Capture stopper eldre inline-handlere
  // fra å sette riktig knapp uten å tegne visningen på nytt.
  document.addEventListener('click', function(e){
    const btn = e.target.closest('[data-track-view]');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    setView(btn.dataset.trackView);
  }, true);

  window.setTrackViewMode = setView;
  window.advancedSetTrackViewMode = setView;

  const boot = ()=>{
    updateViewButtons();
    queueArchiveCleanup();
    const body = document.body;
    if(body){
      const mo = new MutationObserver(()=>queueArchiveCleanup());
      mo.observe(body, { childList:true, subtree:true });
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

// === performance-stability-fix ===
(function(){
  const VIEW_KEY='musicVaultTrackViewMode';
  function norm(v){return ['cards','list','studio'].includes(v)?v:'cards';}
  try{localStorage.setItem(VIEW_KEY,norm(localStorage.getItem(VIEW_KEY)||'list'));}catch(e){}

  function visible(el){return el && !el.classList.contains('hidden');}
  function activeType(){
    if(visible(document.getElementById('albumDetailView'))) return 'album';
    if(visible(document.getElementById('mixtapeDetailView'))) return 'mixtape';
    // Fallback: check global ID variables
    if(typeof currentAlbumId !== 'undefined' && currentAlbumId) return 'album';
    if(typeof currentMixtapeId !== 'undefined' && currentMixtapeId) return 'mixtape';
    // Fallback: check which section is visible
    const albumsTab = document.getElementById('albumsTab');
    const mixtapesTab = document.getElementById('mixtapesTab');
    if(albumsTab && !albumsTab.classList.contains('hidden')) return 'album';
    if(mixtapesTab && !mixtapesTab.classList.contains('hidden')) return 'mixtape';
    return null;
  }
  function rerender(){
    const type=activeType();
    if(type==='album' && typeof renderAlbumDetail==='function') renderAlbumDetail();
    if(type==='mixtape' && typeof renderMixtapeDetail==='function') renderMixtapeDetail();
  }

  window.setTrackViewMode=function(mode){
    try{localStorage.setItem(VIEW_KEY,norm(mode));}catch(e){}
    document.querySelectorAll('[data-track-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.trackView===norm(mode)));
    requestAnimationFrame(rerender);
  };

  document.addEventListener('click',function(e){
    const btn=e.target.closest('[data-track-view]');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    window.setTrackViewMode(btn.dataset.trackView);
  },true);

  // Hold global search behind modal windows.
  const syncModalState=function(){document.body.classList.toggle('modal-open',!!document.querySelector('.modal.open'));};
  document.addEventListener('click',()=>setTimeout(syncModalState,0),true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setTimeout(syncModalState,0);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncModalState);else syncModalState();
})();
/* merged from music-vault-status-card-redesign-final-js */

(function(){
  function polishStatusCard(){
    const avg=document.getElementById('avgDone');
    if(avg){
      const card=avg.closest('.stat');
      if(card){card.classList.add('avg-stat');}
      const pct=Math.max(0,Math.min(100,parseFloat((avg.textContent||'0').replace('%',''))||0));
      document.documentElement.style.setProperty('--mv-avg-progress', pct + '%');
    }
  }
  document.addEventListener('DOMContentLoaded',polishStatusCard);
  window.addEventListener('load',polishStatusCard);
  const mo=new MutationObserver(polishStatusCard);
  document.addEventListener('DOMContentLoaded',function(){
    const avg=document.getElementById('avgDone');
    if(avg) mo.observe(avg,{childList:true,characterData:true,subtree:true});
  });
})();

// === music-vault-v3-pipeline-fix ===
(function(){
  const oldRenderPipeline = window.renderPipeline;
  if(typeof oldRenderPipeline !== 'function') return;

  window.renderPipeline = function(){
    const originalAlbums = Array.isArray(state?.albums) ? state.albums : [];
    try{
      state.albums = (originalAlbums||[])
        .filter(album => !album?.archived)
        .map(album => ({
          ...album,
          beatIds: (album.beatIds||[]).filter(id => {
            const beat = (state?.beats||[]).find(b => b.id === id);
            return !!beat && !beat.archived;
          })
        }));

      oldRenderPipeline();

      const board = document.getElementById('pipelineBoard');
      if(board && !state.albums.length){
        board.innerHTML = '<div class="empty upgraded-empty"><strong>Pipeline er tom</strong><span>Arkiverte albumer vises ikke her. Opprett eller gjenopprett et aktivt album for å bygge pipeline.</span></div>';
      }
    } finally {
      state.albums = originalAlbums;
    }
  };

  const rerenderIfVisible = () => {
    const tab = document.getElementById('pipelineTab');
    if(tab && !tab.classList.contains('hidden')) window.renderPipeline();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', rerenderIfVisible);
  } else {
    rerenderIfVisible();
  }
})();

// === mixed-button-redesign-js ===
document.documentElement.classList.remove('mv-angular-ui');
  document.documentElement.classList.add('mv-mixed-ui');

// === marcus-shared-song-context-fix-js ===
(function(){
  'use strict';

  function visible(el){
    return !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none' && !el.classList.contains('hidden'));
  }
  function activeList(){
    const albumList=document.getElementById('albumBeatList');
    const mixList=document.getElementById('mixtapeBeatList');
    const albumDetail=document.getElementById('albumDetailView');
    const mixDetail=document.getElementById('mixtapeDetailView');
    if(visible(albumDetail) || visible(albumList)) return albumList;
    if(visible(mixDetail) || visible(mixList)) return mixList;
    return albumList || mixList || document;
  }
  function cssId(id){
    return (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  }
  function clickedCard(id){
    const ev=window.event;
    const fromEvent=ev && ev.target && ev.target.closest ? ev.target.closest('.album-beat-card') : null;
    if(fromEvent && (!id || fromEvent.getAttribute('data-beat-id')===String(id) || fromEvent.id===`abi-${id}`)) return fromEvent;
    const list=activeList();
    return list?.querySelector?.(`#abi-${cssId(id)}, .album-beat-card[data-beat-id="${String(id).replace(/"/g,'\\"')}"]`) || document.getElementById(`abi-${id}`);
  }
  function clickedMode(){
    const ev=window.event;
    const card=ev && ev.target && ev.target.closest ? ev.target.closest('.album-beat-card') : null;
    const list=card?.closest?.('#albumBeatList,#mixtapeBeatList');
    if(list?.id==='albumBeatList') return 'album';
    if(list?.id==='mixtapeBeatList') return 'mixtape';
    if(visible(document.getElementById('albumDetailView'))) return 'album';
    if(visible(document.getElementById('mixtapeDetailView'))) return 'mixtape';
    return (typeof currentMixtapeId!=='undefined' && currentMixtapeId && !(typeof currentAlbumId!=='undefined' && currentAlbumId)) ? 'mixtape' : 'album';
  }
  function rerenderMode(mode){
    if(mode==='mixtape' && typeof renderMixtapeDetail==='function') renderMixtapeDetail();
    else if(typeof renderAlbumDetail==='function') renderAlbumDetail();
  }

  const oldOpenAlbum=window.openAlbum;
  window.openAlbum=function(id){
    try{ if(typeof currentMixtapeId!=='undefined') currentMixtapeId=null; }catch(e){}
    if(typeof oldOpenAlbum==='function') return oldOpenAlbum.apply(this,arguments);
    try{ currentAlbumId=id; }catch(e){}
    if(typeof renderAlbumDetail==='function') renderAlbumDetail();
  };

  const oldOpenMixtape=window.openMixtape;
  window.openMixtape=function(id){
    try{ if(typeof currentAlbumId!=='undefined') currentAlbumId=null; }catch(e){}
    if(typeof oldOpenMixtape==='function') return oldOpenMixtape.apply(this,arguments);
    try{ currentMixtapeId=id; }catch(e){}
    if(typeof renderMixtapeDetail==='function') renderMixtapeDetail();
  };

  window.toggleAlbumBeat=function(id){
    const card=clickedCard(id);
    if(!card) return;
    card.classList.toggle('expanded');
    if(card.classList.contains('expanded') && typeof loadAudioForBeat==='function') loadAudioForBeat(id);
  };

  const oldSetRating=window.setAlbumBeatRating;
  window.setAlbumBeatRating=function(id,r){
    const b=(window.state?.beats||state?.beats||[]).find(x=>x.id===id);
    if(b){b.rating=r; if(typeof saveState==='function') saveState();}
    document.querySelectorAll(`#abi-${cssId(id)} .ab-stars button, .album-beat-card[data-beat-id="${String(id).replace(/"/g,'\\"')}"] .ab-stars button`).forEach((s,i)=>s.classList.toggle('on',i<r));
    if(!b && typeof oldSetRating==='function') return oldSetRating.apply(this,arguments);
  };

  const oldSetDone=window.setAlbumBeatDone;
  window.setAlbumBeatDone=function(id,val){
    const b=(window.state?.beats||state?.beats||[]).find(x=>x.id===id);
    const done=typeof clamp==='function'?clamp(val):Math.max(0,Math.min(100,Number(val)||0));
    if(b){b.done=done; if(typeof saveState==='function') saveState();}
    document.querySelectorAll(`#abibar-${cssId(id)}`).forEach(bar=>bar.style.width=done+'%');
    document.querySelectorAll(`#abidone-${cssId(id)}`).forEach(lbl=>lbl.textContent=done+'%');
    if(!b && typeof oldSetDone==='function') return oldSetDone.apply(this,arguments);
  };

  const oldSetCover=window.setAlbumBeatCover;
  window.setAlbumBeatCover=function(id,input){
    const mode=clickedMode();
    const f=input?.files?.[0];
    if(!f){ if(typeof oldSetCover==='function') return oldSetCover.apply(this,arguments); return; }
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const sz=600;
        const canvas=document.createElement('canvas');
        canvas.width=sz; canvas.height=sz;
        const ctx=canvas.getContext('2d');
        const side=Math.min(img.width,img.height);
        const sx=(img.width-side)/2, sy=(img.height-side)/2;
        ctx.drawImage(img,sx,sy,side,side,0,0,sz,sz);
        const b=(window.state?.beats||state?.beats||[]).find(x=>x.id===id);
        if(!b) return;
        b.cover=canvas.toDataURL('image/jpeg',.86);
        if(typeof saveState==='function') saveState();
        rerenderMode(mode);
        if(typeof showToast==='function') showToast('✓ Coverbilde oppdatert');
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(f);
  };

  window.removeFromAlbum=function(beatId){
    const mode=clickedMode();
    if(typeof removeFromCollection==='function') return removeFromCollection(beatId,mode);
  };
})();
// ── Sync view toggle active state after detail renders ──────────────────────
(function(){
  ['renderMixtapeDetail','renderAlbumDetail'].forEach(fnName => {
    const orig = window[fnName];
    if(typeof orig === 'function'){
      window[fnName] = function(){
        const r = orig.apply(this, arguments);
        setTimeout(()=>{
          document.querySelectorAll('[data-track-view]').forEach(btn=>{
            btn.classList.toggle('active', btn.dataset.trackView === (localStorage.getItem('mv-track-view') || 'list'));
          });
        }, 0);
        return r;
      };
    }
  });
})();

// ── FINAL VIEW MODE OVERRIDE ────────────────────────────────────────────────
// Ensures the clean 3-mode implementation wins over any earlier redefinitions.
;(function(){
  const KEY = 'musicVaultTrackViewMode';
  const VIEWS = ['list','cards','studio'];
  function save(v){ try{ localStorage.setItem(KEY, VIEWS.includes(v)?v:'list'); }catch(e){} }
  function cur(){ return localStorage.getItem(KEY) || 'list'; }
  function apply(el){
    if(!el) return;
    el.classList.remove('album-beat-grid','album-beat-listmode','album-beat-studio');
    const v = cur();
    if(v==='list') el.classList.add('album-beat-listmode');
    else if(v==='studio') el.classList.add('album-beat-studio');
    else el.classList.add('album-beat-grid');
  }
  function syncBtns(){ document.querySelectorAll('[data-track-view]').forEach(b=>b.classList.toggle('active',b.dataset.trackView===cur())); }
  function activeType(){
    if(document.getElementById('mixtapeDetailView') && !document.getElementById('mixtapeDetailView').classList.contains('hidden')) return 'mixtape';
    if(document.getElementById('albumDetailView')   && !document.getElementById('albumDetailView').classList.contains('hidden'))   return 'album';
    if(typeof currentMixtapeId!=='undefined' && currentMixtapeId) return 'mixtape';
    if(typeof currentAlbumId!=='undefined'   && currentAlbumId)   return 'album';
    return null;
  }
  function rerender(){
    const t = activeType();
    if(t==='mixtape' && typeof renderMixtapeDetail==='function') renderMixtapeDetail();
    else if(t==='album' && typeof renderAlbumDetail==='function') renderAlbumDetail();
  }

  window.setTrackViewMode = function(mode){
    save(mode);
    if(mode==='studio'){ rerender(); syncBtns(); return; }
    apply(document.getElementById('mixtapeBeatList'));
    apply(document.getElementById('albumBeatList'));
    syncBtns();
  };
  window.advancedSetTrackViewMode = function(mode){
    save(mode);
    rerender();
    syncBtns();
  };

  // Sync buttons on initial load
  setTimeout(syncBtns, 300);
})();
