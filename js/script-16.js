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
