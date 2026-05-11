(function(){
  const KEY='musicVaultTrackViewMode';
  function currentView(){return localStorage.getItem(KEY)||'cards';}
  function activeMode(){return !document.getElementById('mixtapeDetailView')?.classList.contains('hidden')?'mixtape':'album';}
  function applyView(el){
    if(!el)return;
    el.classList.remove('album-beat-grid','album-beat-listmode');
    el.classList.add(currentView()==='list'?'album-beat-listmode':'album-beat-grid');
    el.querySelectorAll('.ab-cover-ph').forEach(ph=>{ph.textContent='';ph.setAttribute('aria-label','Ingen coverbilde');});
    updateToggleButtons();
  }
  function rerenderActive(){
    if(activeMode()==='mixtape'&&typeof renderMixtapeDetail==='function')renderMixtapeDetail();
    else if(typeof renderAlbumDetail==='function')renderAlbumDetail();
  }
  window.setTrackViewMode=function(mode){
    localStorage.setItem(KEY,mode==='list'?'list':'cards');
    applyView(document.getElementById('mixtapeBeatList'));
    applyView(document.getElementById('albumBeatList'));
    updateToggleButtons();
  };
  function updateToggleButtons(){
    document.querySelectorAll('[data-track-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.trackView===currentView()));
  }
  function toggleMarkup(){
    return `<div class="track-view-toggle" title="Velg visningsmodus">
      <button type="button" data-track-view="cards" onclick="setTrackViewMode('cards')">▦ Kort</button>
      <button type="button" data-track-view="list" onclick="setTrackViewMode('list')">☰ Liste</button>
    </div>`;
  }
  function installToggles(){
    const mixtapeToolbar=document.getElementById('addBeatsToMixtapeBtn')?.closest('.toolbar');
    const albumToolbar=document.getElementById('addBeatsToAlbumBtn')?.closest('.toolbar');
    [mixtapeToolbar,albumToolbar].forEach(tb=>{
      if(!tb||tb.querySelector('.track-view-toggle'))return;
      const deleteBtn=tb.querySelector('.danger');
      if(deleteBtn)deleteBtn.insertAdjacentHTML('beforebegin',toggleMarkup());
      else tb.insertAdjacentHTML('beforeend',toggleMarkup());
    });
    updateToggleButtons();
  }
  const previousRender=window.renderAlbumBeats;
  window.renderAlbumBeats=function(beats,mode,customEl){
    if(typeof previousRender==='function')previousRender(beats,mode,customEl);
    const el=customEl||document.getElementById(mode==='mixtape'?'mixtapeBeatList':'albumBeatList');
    applyView(el);
    installToggles();
  };
  const boot=()=>{installToggles();applyView(document.getElementById('mixtapeBeatList'));applyView(document.getElementById('albumBeatList'));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
