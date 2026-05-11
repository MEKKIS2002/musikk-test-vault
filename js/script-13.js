(function(){
  const VIEW_KEY='musicVaultTrackViewMode';
  function norm(v){return ['cards','list','studio'].includes(v)?v:'cards';}
  try{localStorage.setItem(VIEW_KEY,norm(localStorage.getItem(VIEW_KEY)||'cards'));}catch(e){}

  function visible(el){return el && !el.classList.contains('hidden');}
  function activeType(){
    if(visible(document.getElementById('albumDetailView'))) return 'album';
    if(visible(document.getElementById('mixtapeDetailView'))) return 'mixtape';
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
  window.advancedSetTrackViewMode=window.setTrackViewMode;

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
