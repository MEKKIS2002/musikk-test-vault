(function(){
  function esc(v){return String(v ?? '').replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function appState(){return (typeof window.state !== 'undefined' && window.state) ? window.state : (typeof state !== 'undefined' ? state : {beats:[],albums:[],mixtapes:[],settings:{}});}
  function tabId(tab){return tab + 'Tab';}
  function countTracks(item){return Array.isArray(item?.beatIds) ? item.beatIds.length : 1;}
  function fmtDate(v){try{return v ? new Date(v).toLocaleDateString('no-NO',{day:'2-digit',month:'short',year:'numeric'}) : 'Ukjent';}catch(e){return 'Ukjent';}}
  function typeLabel(t){return t === 'mixtape' ? 'Kassett' : t === 'album' ? 'Vinyl' : 'Demo';}
  function allArchived(){
    const s=appState();
    return {
      mixtapes:(s.mixtapes||[]).filter(x=>x && x.archived).map(x=>Object.assign({__type:'mixtape'},x)),
      albums:(s.albums||[]).filter(x=>x && x.archived).map(x=>Object.assign({__type:'album'},x)),
      beats:(s.beats||[]).filter(x=>x && x.archived).map(x=>Object.assign({__type:'beat'},x))
    };
  }
  function ensureArchiveTab(){
    const tabs=document.querySelector('.tabs');
    if(tabs && !document.querySelector('[data-tab="archive"]')){
      tabs.insertAdjacentHTML('beforeend','<button class="tab-btn" data-tab="archive">🗄️ Arkivert</button>');
    }
    let tab=document.getElementById('archiveTab');
    if(!tab){
      tab=document.createElement('section');
      tab.id='archiveTab';
      tab.className='tab-view hidden';
      const after=document.getElementById('integrationsTab');
      if(after) after.insertAdjacentElement('afterend',tab);
      else (document.querySelector('main.app')||document.body).appendChild(tab);
    }
    return tab;
  }
  function setArchiveActive(){
    ensureArchiveTab();
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='archive'));
    document.querySelectorAll('.tab-view').forEach(v=>v.classList.add('hidden'));
    document.getElementById('archiveTab')?.classList.remove('hidden');
  }
  function crate(type,title,count,kind,sticker,items){
    const fallback=[{}, {}, {}, {}, {}];
    const arr=(items && items.length ? items : fallback).slice(0,5);
    const sleeves=arr.map(function(_,i){
      const cls=kind==='tape'?' tape':kind==='cd'?' cd':'';
      const rot=[-5,3,-1,5,-3][i] || 0;
      const colors=[['#8b4b21','#17100b'],['#d0a15f','#2b1d12'],['#1b1715','#080706'],['#6f3a16','#0f0b08'],['#312015','#090807']][i%5];
      return '<span class="av-sleeve'+cls+'" style="--r:'+rot+'deg;--c1:'+colors[0]+';--c2:'+colors[1]+'"></span>';
    }).join('');
    return '<button class="av-crate" type="button" data-archive-crate="'+type+'">'
      +'<div class="av-folder-tab">'+esc(title)+'</div>'
      +'<div class="av-stack">'+sleeves+'</div>'
      +'<div class="av-crate-label">'+esc(title)+'<small>'+count+' prosjekter</small></div>'
      +'<div class="av-sticker '+(String(sticker).length>9?'note':'')+'">'+esc(sticker).replace(/\n/g,'<br>')+'</div>'
      +'</button>';
  }
  function detail(item){
    const t=item?.__type || 'beat';
    const title=item?.name || 'Ingen valgt';
    const cover=item?.cover || item?.image || '';
    return '<aside class="av-side">'
      +'<div class="av-side-top"><span>Valgt item</span><span class="av-close">×</span></div>'
      +'<div class="av-feature-art"><div class="av-feature-vinyl"></div><div class="av-feature-sleeve">'+(cover?'<img src="'+esc(cover)+'" alt="">':'')+'</div></div>'
      +'<div class="av-feature-title"><h3>'+esc(title)+'</h3><p>'+esc(typeLabel(t))+' · Arkivert · '+(t==='beat'?'Sang/beat':'Samling')+'</p></div>'
      +'<div class="av-meta">'
      +'<div class="av-meta-row"><span>Dato arkivert</span><b>'+fmtDate(item?.archivedAt||item?.updatedAt||item?.createdAt)+'</b></div>'
      +'<div class="av-meta-row"><span>Opprettet</span><b>'+fmtDate(item?.createdAt)+'</b></div>'
      +'<div class="av-meta-row"><span>Innhold</span><b>'+countTracks(item)+' spor</b></div>'
      +'<div class="av-meta-row"><span>Status</span><b>Arkivert</b></div>'
      +'</div>'
      +'<div class="av-tags"><span>'+esc(t)+'</span><span>arkiv</span><span>vault</span><span>+</span></div>'
      +'<p class="av-action-title">Hurtighandlinger</p>'
      +'<div class="av-actions">'
      +'<button class="av-action" data-av-open="'+esc(t)+'" data-id="'+esc(item?.id||'')+'">▶<small>Åpne</small></button>'
      +'<button class="av-action" data-av-restore="'+esc(t)+'" data-id="'+esc(item?.id||'')+'">↩<small>Tilbake</small></button>'
      +'<button class="av-action" type="button">⇩<small>Last ned</small></button>'
      +'<button class="av-action" type="button">↗<small>Del</small></button>'
      +'<button class="av-action" type="button">…<small>Mer</small></button>'
      +'</div></aside>';
  }
  window.renderArchiveView=function(){
    const tab=ensureArchiveTab();
    const grouped=allArchived();
    const all=[...grouped.mixtapes,...grouped.albums,...grouped.beats];
    let selected=all.find(x=>String(x.id)===String(window.__mvArchiveSelected));
    if(!selected){selected=all[0]||null; window.__mvArchiveSelected=selected?.id||'';}
    tab.innerHTML='<div class="archive-vault-page">'
      +'<div class="av-topnav"><div class="av-brand">Music Vault</div><div class="av-nav"><span>⌂ Oversikt</span><span>♬ Beats</span><span>▣ Bibliotek</span><span class="active">▤ Arkiv</span></div></div>'
      +'<div class="av-layout"><main class="av-main">'
      +'<div class="av-header"><div class="av-title"><h2><span class="av-vinyl-dot"></span>Arkiv</h2><p>Grav i fortiden. Utforsk gamle prosjekter, utkast og versjoner som fortjener et nytt liv.</p></div>'
      +'<div class="av-search-wrap"><label class="av-search"><input id="avSearchInput" placeholder="Søk i arkivet..."><span class="av-search-icon">⌕</span></label><button class="av-sort" type="button">Nyeste først⌄</button></div>'
      +'<div class="av-count"><strong>'+all.length+'</strong><span>elementer i arkivet</span></div></div>'
      +(all.length?'<div class="av-crate-grid">'
        +crate('mixtape','Mixtapes',grouped.mixtapes.length,'tape','GOOD\nVIBES',grouped.mixtapes)
        +crate('album','Albumer',grouped.albums.length,'vinyl','M.V.',grouped.albums)
        +crate('beat','Demoer',grouped.beats.length,'cd','ROUGH\nDIAMONDS',grouped.beats)
        +'<button class="av-crate av-new" type="button"><div class="av-stack">＋</div><div class="av-crate-label">Ny kategori<small>Lag din egen arkivkasse</small></div></button>'
        +crate('unreleased','Uutgitt',grouped.beats.filter(b=>(b.done||0)<80).length,'cd','HANDLE\nWITH CARE',grouped.beats.filter(b=>(b.done||0)<80))
        +crate('versions','Gamle versjoner',all.length,'tape','V.1\nV.2\nV.3',all)
        +'<div class="av-shelf-shadow"></div></div>'
        :'<div class="empty upgraded-empty" style="margin-top:20px"><strong>Arkivet er tomt</strong><span>Arkiver et album eller en kassett, så dukker den opp her som en arkivkasse.</span></div>')
      +'<div class="av-player-strip"><div class="av-mini-cover"></div><div><b>'+esc(selected?.name||'Late Night Thoughts')+'</b><div class="av-wave"></div></div><button class="av-play" type="button">▶</button></div>'
      +'</main>'+detail(selected||{name:'Lost Tapes',__type:'beat',id:''})+'</div></div>';
    tab.querySelectorAll('[data-archive-crate]').forEach(function(btn){btn.addEventListener('click',function(){
      const t=btn.dataset.archiveCrate;
      const arr=t==='mixtape'?grouped.mixtapes:t==='album'?grouped.albums:t==='beat'?grouped.beats:all;
      if(arr[0]){window.__mvArchiveSelected=arr[0].id; window.renderArchiveView();}
    });});
    const input=tab.querySelector('#avSearchInput');
    input?.addEventListener('input',function(){
      const q=input.value.trim().toLowerCase();
      tab.querySelectorAll('[data-archive-crate]').forEach(function(btn){btn.style.opacity=q && !btn.textContent.toLowerCase().includes(q) ? '.36' : '1';});
    });
  };
  window.openArchiveTab=function(){setArchiveActive(); window.renderArchiveView();};
  document.addEventListener('click',function(e){
    const archiveBtn=e.target.closest?.('[data-tab="archive"]');
    if(archiveBtn){e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); window.openArchiveTab(); return false;}
    const restore=e.target.closest?.('[data-av-restore]');
    if(restore){
      const s=appState(); const type=restore.dataset.avRestore; const id=restore.dataset.id;
      const arr=type==='album'?s.albums:type==='mixtape'?s.mixtapes:s.beats;
      const item=(arr||[]).find(x=>String(x.id)===String(id));
      if(item){item.archived=false; if(typeof saveState==='function')saveState(); if(typeof renderAll==='function')renderAll(); window.openArchiveTab(); if(typeof showToast==='function')showToast('✓ Gjenopprettet fra arkiv');}
      return;
    }
    const open=e.target.closest?.('[data-av-open]');
    if(open){
      const type=open.dataset.avOpen; const id=open.dataset.id;
      if(type==='album'){document.querySelector('[data-tab="albums"]')?.click(); setTimeout(()=>window.openAlbum?.(id),80);}
      else if(type==='mixtape'){document.querySelector('[data-tab="mixtapes"]')?.click(); setTimeout(()=>window.openMixtape?.(id),80);}
      else {window.playSingleBeat?.(id);}
    }
  },true);
  const previousToggle=window.toggleArchiveItem;
  window.toggleArchiveItem=function(type,id){
    const s=appState(); const arr=type==='album'?s.albums:type==='mixtape'?s.mixtapes:s.beats;
    const item=(arr||[]).find(x=>String(x.id)===String(id));
    if(!item && typeof previousToggle==='function') return previousToggle(type,id);
    if(!item) return;
    item.archived=!item.archived;
    if(item.archived && !item.archivedAt) item.archivedAt=Date.now();
    if(!item.archived) delete item.archivedAt;
    if(typeof saveState==='function') saveState();
    if(typeof renderAll==='function') renderAll();
    if(document.querySelector('[data-tab="archive"]')?.classList.contains('active')) window.renderArchiveView();
    if(typeof updateArchiveToolbarButtons==='function') updateArchiveToolbarButtons();
    if(typeof showToast==='function') showToast(item.archived?'✓ Arkivert':'✓ Gjenopprettet fra arkiv');
  };
  const previousArchiveCollection=window.archiveCurrentCollection;
  window.archiveCurrentCollection=function(type){
    const s=appState();
    const id=type==='album' ? window.currentAlbumId : window.currentMixtapeId;
    const arr=type==='album'?s.albums:s.mixtapes;
    const item=(arr||[]).find(x=>String(x.id)===String(id));
    if(item) return window.toggleArchiveItem(type,item.id);
    if(typeof previousArchiveCollection==='function') return previousArchiveCollection(type);
  };
  const previousRenderAll=window.renderAll;
  if(!window.__mvArchiveRenderAllPatched){
    window.__mvArchiveRenderAllPatched=true;
    window.renderAll=function(){
      if(typeof previousRenderAll==='function') previousRenderAll();
      ensureArchiveTab();
      if(document.querySelector('[data-tab="archive"]')?.classList.contains('active')) setTimeout(window.renderArchiveView,0);
    };
  }
  function boot(){ensureArchiveTab(); if(document.querySelector('[data-tab="archive"]')?.classList.contains('active')) window.renderArchiveView();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  setTimeout(boot,300);
})();
