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
