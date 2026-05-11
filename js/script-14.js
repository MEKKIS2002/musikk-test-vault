(function(){
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
})();
