(function(){
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
})();
