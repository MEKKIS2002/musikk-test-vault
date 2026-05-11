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
})();
