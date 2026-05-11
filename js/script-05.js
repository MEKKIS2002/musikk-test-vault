(function(){
  // Full arkiv-funksjon: arkiverte elementer skjules fra statistikk og vanlige lister,
  // men vises samlet under egen fane "Arkivert".
  const ACTIVE_FILTER_FLAG='__mvRenderingActiveOnly';

  function activeTab(){return document.querySelector('.tab-btn.active')?.dataset?.tab||'mixtapes';}
  function isArchiveTab(){return activeTab()==='archive';}
  function beatById(id){return (state.beats||[]).find(b=>b.id===id);}
  function isArchivedBeat(id){const b=beatById(id);return !!(b&&b.archived);}
  function activeBeatIds(ids){return (ids||[]).filter(id=>!isArchivedBeat(id));}
  function activeBeatCount(ids){return activeBeatIds(ids).length;}
  function show(msg){if(typeof showToast==='function')showToast(msg);}

  function ensureArchiveData(){
    state.settings=state.settings||{};
    state.settings.showArchived=false;
    (state.beats||[]).forEach(b=>{b.archived=!!b.archived;});
    (state.albums||[]).forEach(a=>{a.archived=!!a.archived; a.beatIds=a.beatIds||[];});
    (state.mixtapes||[]).forEach(m=>{m.archived=!!m.archived; m.beatIds=m.beatIds||[];});
  }

  const oldRenderStats=window.renderStats;
  window.renderStats=function(){
    ensureArchiveData();
    const byId=new Map((state.beats||[]).map(b=>[b.id,b]));
    const mixtapeBeatIds=new Set((state.mixtapes||[]).filter(mt=>!mt.archived).flatMap(mt=>activeBeatIds(mt.beatIds)));
    const albumDemoIds=new Set((state.albums||[]).filter(a=>!a.archived).flatMap(a=>activeBeatIds(a.beatIds)));
    const mixtapeBeats=[...mixtapeBeatIds].map(id=>byId.get(id)).filter(b=>b&&!b.archived);
    const albumDemos=[...albumDemoIds].map(id=>byId.get(id)).filter(b=>b&&!b.archived);
    const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
    set('beatCount',mixtapeBeats.length);
    set('favCount',mixtapeBeats.filter(b=>b.favorite).length);
    set('demoCount',albumDemos.length);
    const avg=albumDemos.length?Math.round(albumDemos.reduce((s,d)=>s+Number(d.done||0),0)/albumDemos.length):0;
    set('avgDone',avg+'%');
  };

  function withFilteredCollections(kind,fn){
    ensureArchiveData();
    if(isArchiveTab())return fn();
    const key=kind==='album'?'albums':'mixtapes';
    const original=state[key];
    state[key]=(original||[]).filter(x=>!x.archived);
    window[ACTIVE_FILTER_FLAG]=true;
    try{return fn();}finally{state[key]=original;window[ACTIVE_FILTER_FLAG]=false;}
  }

  const oldRenderAlbums=window.renderAlbums;
  if(oldRenderAlbums){
    window.renderAlbums=function(){
      if(currentAlbumId){return renderAlbumDetail();}
      return withFilteredCollections('album',()=>oldRenderAlbums());
    };
  }
  const oldRenderMixtapes=window.renderMixtapes;
  if(oldRenderMixtapes){
    window.renderMixtapes=function(){
      if(currentMixtapeId){return renderMixtapeDetail();}
      return withFilteredCollections('mixtape',()=>oldRenderMixtapes());
    };
  }

  const oldGetSortedMixtapeBeats=window.getSortedMixtapeBeats;
  if(oldGetSortedMixtapeBeats){
    window.getSortedMixtapeBeats=function(mt){
      const arr=oldGetSortedMixtapeBeats(mt)||[];
      return (mt&&mt.archived)||isArchiveTab()?arr:arr.filter(b=>!b.archived);
    };
  }

  const oldRenderAlbumBeats=window.renderAlbumBeats;
  if(oldRenderAlbumBeats){
    window.renderAlbumBeats=function(beats,mode,customEl){
      ensureArchiveData();
      const listMode=mode||'album';
      const col=listMode==='mixtape'?(state.mixtapes||[]).find(m=>m.id===currentMixtapeId):(state.albums||[]).find(a=>a.id===currentAlbumId);
      const includeArchived=!!(col&&col.archived)||isArchiveTab();
      const filtered=includeArchived?(beats||[]):(beats||[]).filter(b=>!b.archived);
      oldRenderAlbumBeats(filtered,mode,customEl);
      setTimeout(()=>installBeatArchiveButtons(listMode),0);
    };
  }

  const oldRenderBeats=window.renderBeats;
  if(oldRenderBeats){
    window.renderBeats=function(container,beats,albumMode){
      const includeArchived=isArchiveTab();
      if(Array.isArray(beats)&&!includeArchived)beats=beats.filter(b=>!b.archived);
      oldRenderBeats(container,beats,albumMode);
      setTimeout(()=>installBeatArchiveButtons('beat'),0);
    };
  }

  function archiveLabel(type,item){
    if(type==='beat')return item.archived?'Gjenopprett sang':'Arkiver sang';
    if(type==='album')return item.archived?'Gjenopprett album':'Arkiver album';
    return item.archived?'Gjenopprett mixtape':'Arkiver mixtape';
  }

  window.toggleArchiveItem=function(type,id){
    ensureArchiveData();
    let arr=type==='album'?state.albums:type==='mixtape'?state.mixtapes:state.beats;
    const item=(arr||[]).find(x=>x.id===id);
    if(!item)return;
    item.archived=!item.archived;
    saveState();
    renderAll();
    if(isArchiveTab())renderArchiveView();
    show(item.archived?'✓ Arkivert':'✓ Gjenopprettet fra arkiv');
  };

  window.toggleShowArchived=function(){openArchiveTab();};

  function installArchiveTab(){
    const tabs=document.querySelector('.tabs');
    if(!tabs)return;
    if(!document.querySelector('[data-tab="archive"]')){
      tabs.insertAdjacentHTML('beforeend','<button class="tab-btn" data-tab="archive">🗄️ Arkivert</button>');
    }
    if(!document.getElementById('archiveTab')){
      const integrations=document.getElementById('integrationsTab');
      const sec=document.createElement('section');
      sec.id='archiveTab';
      sec.className='tab-view hidden';
      sec.innerHTML=`<div class="content-panel glass">
        <div class="section-title"><h2>Arkivert</h2><span class="hint">Elementer her teller ikke med i statistikk.</span></div>
        <p class="hint" style="margin-bottom:18px">Arkiverte beats/sanger, albumer og mixtapes skjules fra de vanlige visningene uten å bli slettet.</p>
        <div id="archiveList" class="archive-list"></div>
      </div>`;
      integrations?.insertAdjacentElement('afterend',sec) || document.querySelector('main.app')?.appendChild(sec);
    }
    document.querySelectorAll('[data-tab="archive"]').forEach(btn=>{
      if(btn.dataset.archiveBound)return;
      btn.dataset.archiveBound='1';
      btn.addEventListener('click',function(e){
        e.preventDefault();e.stopImmediatePropagation();
        openArchiveTab();
      },true);
    });
    document.getElementById('archiveToggleGlobal')?.closest('.archive-toolbar')?.remove();
  }

  window.openArchiveTab=function(){
    installArchiveTab();
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='archive'));
    document.querySelectorAll('.tab-view').forEach(v=>v.classList.add('hidden'));
    document.getElementById('archiveTab')?.classList.remove('hidden');
    currentAlbumId=null;
    currentMixtapeId=null;
    renderArchiveView();
  };

  window.renderArchiveView=function(){
    ensureArchiveData();
    const el=document.getElementById('archiveList');
    if(!el)return;
    const archivedMixtapes=(state.mixtapes||[]).filter(m=>m.archived);
    const archivedAlbums=(state.albums||[]).filter(a=>a.archived);
    const archivedBeats=(state.beats||[]).filter(b=>b.archived);
    const section=(title,items,empty)=>`<div class="archive-section"><h3>${title} <span>${items.length}</span></h3>${items.length?items.join(''):`<div class="empty">${empty}</div>`}</div>`;
    const beatCard=b=>`<div class="archive-row">
      <div class="archive-main"><strong>${esc(b.name||'Uten navn')}</strong><span>Sang/beat · ${esc(b.source||'lokal')}</span></div>
      <div class="archive-actions"><button class="ghost-btn" onclick="toggleArchiveItem('beat','${b.id}')">Gjenopprett</button></div>
    </div>`;
    const albumCard=a=>`<div class="archive-row">
      <div class="archive-main"><strong>${esc(a.name||'Uten navn')}</strong><span>Album · ${activeBeatCount(a.beatIds)} aktive / ${(a.beatIds||[]).length} totalt</span></div>
      <div class="archive-actions"><button class="ghost-btn" onclick="toggleArchiveItem('album','${a.id}')">Gjenopprett</button><button class="small-btn" onclick="document.querySelector('[data-tab=albums]')?.click();setTimeout(()=>openAlbum('${a.id}'),60)">Åpne</button></div>
    </div>`;
    const mixtapeCard=m=>`<div class="archive-row">
      <div class="archive-main"><strong>${esc(m.name||'Uten navn')}</strong><span>Mixtape · ${activeBeatCount(m.beatIds)} aktive / ${(m.beatIds||[]).length} totalt</span></div>
      <div class="archive-actions"><button class="ghost-btn" onclick="toggleArchiveItem('mixtape','${m.id}')">Gjenopprett</button><button class="small-btn" onclick="document.querySelector('[data-tab=mixtapes]')?.click();setTimeout(()=>openMixtape('${m.id}'),60)">Åpne</button></div>
    </div>`;
    el.innerHTML=section('Mixtapes',archivedMixtapes.map(mixtapeCard),'Ingen arkiverte mixtapes.')+
      section('Albumer',archivedAlbums.map(albumCard),'Ingen arkiverte albumer.')+
      section('Sanger og beats',archivedBeats.map(beatCard),'Ingen arkiverte sanger eller beats.');
  };

  function installBeatArchiveButtons(listMode){
    ensureArchiveData();
    document.querySelectorAll('.album-beat-card[data-beat-id]').forEach(card=>{
      const id=card.dataset.beatId;
      const b=beatById(id);if(!b)return;
      card.classList.toggle('archive-badge',!!b.archived);
      if(card.querySelector('.archive-song-btn')){
        card.querySelector('.archive-song-btn').textContent=archiveLabel('beat',b);
        return;
      }
      const target=card.querySelector('.ab-expand-actions')||card.querySelector('.ab-expand-right')||card.querySelector('.ab-body');
      if(target){
        target.insertAdjacentHTML('beforeend',`<button class="ghost-btn archive-song-btn" onclick="event.stopPropagation();toggleArchiveItem('beat','${id}')">${archiveLabel('beat',b)}</button>`);
      }
    });
    document.querySelectorAll('.beat-item[id^="bi-"]').forEach(item=>{
      const id=item.id.replace(/^bi-/,'');
      const b=beatById(id);if(!b)return;
      item.classList.toggle('archive-badge',!!b.archived);
      if(item.querySelector('.archive-song-btn')){item.querySelector('.archive-song-btn').textContent=archiveLabel('beat',b);return;}
      const target=item.querySelector('.beat-expand-actions')||item.querySelector('.beat-expand');
      if(target)target.insertAdjacentHTML('beforeend',`<button class="ghost-btn archive-song-btn" onclick="event.stopPropagation();toggleArchiveItem('beat','${id}')">${archiveLabel('beat',b)}</button>`);
    });
  }

  function installCollectionArchiveButtons(){
    ensureArchiveData();
    updateArchiveToolbarButtons?.();
    document.querySelectorAll('.mv-archive-detail-toolbar').forEach(el=>el.remove());
  }

  function installArchiveCss(){
    if(document.getElementById('mvArchiveCss'))return;
    document.head.insertAdjacentHTML('beforeend',`<style id="mvArchiveCss">
      .archive-list{display:grid;gap:18px}.archive-section{display:grid;gap:10px}.archive-section h3{display:flex;align-items:center;gap:8px;margin:0;font-size:16px}.archive-section h3 span{font-size:12px;color:var(--muted);font-weight:800}.archive-row{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);border-radius:18px;padding:14px}.archive-main{display:grid;gap:4px;min-width:0}.archive-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.archive-main span{color:var(--muted);font-size:12px}.archive-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.archive-song-btn{margin-top:6px}.archive-badge{opacity:.62;filter:grayscale(.35)}
      @media(max-width:640px){.archive-row{align-items:flex-start;flex-direction:column}.archive-actions{justify-content:flex-start}}
    </style>`);
  }

  function patchAddBeatModals(){
    const albumBtn=document.getElementById('addBeatsToAlbumBtn');
    if(albumBtn&&!albumBtn.dataset.archivePatch){
      albumBtn.dataset.archivePatch='1';
      albumBtn.addEventListener('click',function(e){
        e.stopImmediatePropagation();
        const album=(state.albums||[]).find(a=>a.id===currentAlbumId);if(!album)return;
        albumAddBeatCandidates=(state.beats||[]).filter(b=>!b.archived&&!album.beatIds.includes(b.id));
        const search=document.getElementById('beatSearchInput');if(search)search.value='';
        if(typeof renderAlbumAddBeatSearch==='function')renderAlbumAddBeatSearch();
        document.getElementById('addBeatsModal')?.classList.add('open');
        setTimeout(()=>document.getElementById('beatSearchInput')?.focus(),80);
      },true);
    }
    const mixBtn=document.getElementById('addBeatsToMixtapeBtn');
    if(mixBtn&&!mixBtn.dataset.archivePatch){
      mixBtn.dataset.archivePatch='1';
      mixBtn.addEventListener('click',function(e){
        e.stopImmediatePropagation();
        const mt=(state.mixtapes||[]).find(m=>m.id===currentMixtapeId);if(!mt)return;
        mixtapeAddBeatCandidates=(state.beats||[]).filter(b=>!b.archived&&!mt.beatIds.includes(b.id));
        const search=document.getElementById('mixtapeBeatSearchInput');if(search)search.value='';
        if(typeof renderMixtapeAddBeatSearch==='function')renderMixtapeAddBeatSearch();
        document.getElementById('addBeatsToMixtapeModal')?.classList.add('open');
        setTimeout(()=>document.getElementById('mixtapeBeatSearchInput')?.focus(),80);
      },true);
    }
  }

  const prevRenderAll=window.renderAll;
  window.renderAll=function(){
    ensureArchiveData();
    if(prevRenderAll)prevRenderAll();
    renderStats();
    setTimeout(()=>{installArchiveCss();installArchiveTab();installBeatArchiveButtons();installCollectionArchiveButtons();patchAddBeatModals();if(isArchiveTab())renderArchiveView();},0);
  };

  installArchiveCss();
  ensureArchiveData();
  setTimeout(()=>{installArchiveTab();installBeatArchiveButtons();installCollectionArchiveButtons();patchAddBeatModals();renderStats();},150);
})();
