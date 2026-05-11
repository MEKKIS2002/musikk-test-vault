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
