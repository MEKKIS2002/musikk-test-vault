(function(){
  const KEY='musicVaultTrackViewMode';
  const FILTER_KEY='musicVaultCollectionFilter';
  const SEARCH_KEY='musicVaultCollectionSearch';
  function safe(s){return (window.esc?esc:String)(s||'');}
  function getBeat(id){const source=(typeof state!=='undefined'&&state?.beats)?state.beats:(window.state?.beats||[]);return source.find(b=>b.id===id);}
  function getModeForEl(el){return el?.id==='mixtapeBeatList'?'mixtape':'album';}
  function getCollection(mode){return mode==='mixtape'?(state.mixtapes||[]).find(m=>m.id===currentMixtapeId):(state.albums||[]).find(a=>a.id===currentAlbumId);}
  function currentView(){return localStorage.getItem(KEY)||'cards';}
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
  window.advancedTrackFilter=function(filter){localStorage.setItem(FILTER_KEY,filter||'all');rerenderActive();};
  window.advancedTrackSearch=function(q){localStorage.setItem(SEARCH_KEY,q||'');applyCurrentFiltersOnly();};
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
  window.advancedOpenCurrentTrack=function(){const b=bottomPlayer.queue?.[bottomPlayer.index]; if(!b)return; const card=document.getElementById(`abi-${b.id}`); if(card){card.scrollIntoView({behavior:'smooth',block:'center'}); if(!card.classList.contains('expanded'))toggleAlbumBeat(b.id);}else showToast('Åpne albumet eller mixtapen for å se sangkortet');};
  function boot(){addOpenCurrentButton(); ['mixtape','album'].forEach(mode=>{const el=document.getElementById(mode==='mixtape'?'mixtapeBeatList':'albumBeatList'); if(el)applyAdvanced(el,mode);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
