(function(){
  const safe=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmtDate=ts=>{try{return ts?new Date(ts).toLocaleDateString('no-NO',{day:'2-digit',month:'short',year:'numeric'}):'Ukjent';}catch(e){return 'Ukjent';}};
  const beatCount=ids=>Array.isArray(ids)?ids.length:0;
  const getState=()=>typeof state!=='undefined'?state:(window.state||{beats:[],albums:[],mixtapes:[],settings:{}});
  const mediaType=o=>o.__type==='mixtape'?'Kassett':o.__type==='album'?'Vinyl':'Demo';
  const itemTitle=o=>o?.name||'Uten navn';
  const itemCover=o=>o?.cover||'';
  const selectedFallback=items=>items[0]||null;
  const actionOpen=(type,id)=>{
    if(type==='album')return `document.querySelector('[data-tab=albums]')?.click();setTimeout(()=>openAlbum('${safe(id)}'),80)`;
    if(type==='mixtape')return `document.querySelector('[data-tab=mixtapes]')?.click();setTimeout(()=>openMixtape('${safe(id)}'),80)`;
    return `playSingleBeat('${safe(id)}')`;
  };
  function crate({key,title,count,kind,sticker,items}){
    const sleeves=(items&&items.length?items:[{},{},{},{}]).slice(0,5).map((it,i)=>{
      const cls=kind==='tape'?' tape':kind==='cd'?' cd':'';
      const colors=[['#8b4b21','#17100b'],['#d0a15f','#2b1d12'],['#1b1715','#080706'],['#6f3a16','#0f0b08'],['#312015','#090807']][i%5];
      return `<span class="av-sleeve${cls}" style="--r:${[-4,3,-1,5,-3][i]}deg;--c1:${colors[0]};--c2:${colors[1]}"></span>`;
    }).join('');
    return `<button class="av-crate" type="button" data-av-filter="${safe(key)}">
      <div class="av-folder-tab">${safe(title)}</div>
      <div class="av-stack">${sleeves}</div>
      <div class="av-crate-label">${safe(title)}<small>${count} prosjekter</small></div>
      <div class="av-sticker ${sticker&&sticker.length>9?'note':''}">${safe(sticker||'ARCHIVE')}</div>
    </button>`;
  }
  function detail(item){
    const title=item?itemTitle(item):'Lost Tapes';
    const type=item?item.__type:'demo';
    const cover=item?itemCover(item):'';
    const open=item?`onclick="${actionOpen(type,item.id)}"`:'';
    const restore=item?`onclick="toggleArchiveItem('${safe(type)}','${safe(item.id)}')"`:'';
    return `<aside class="av-side">
      <div class="av-side-top"><span>Valgt item</span><span class="av-close">×</span></div>
      <div class="av-feature-art">
        <div class="av-feature-vinyl"></div>
        <div class="av-feature-sleeve">${cover?`<img src="${safe(cover)}" alt="">`:''}</div>
      </div>
      <div class="av-feature-title"><h3>${safe(title)}</h3><p>${safe(mediaType(item||{__type:'demo'}))} · Arkivert · ${type==='beat'?'Sang/beat':'Samling'}</p></div>
      <div class="av-meta">
        <div class="av-meta-row"><span>Dato arkivert</span><b>${fmtDate(item?.archivedAt||item?.createdAt)}</b></div>
        <div class="av-meta-row"><span>Opprettet</span><b>${fmtDate(item?.createdAt)}</b></div>
        <div class="av-meta-row"><span>Innhold</span><b>${type==='beat'?'1 spor':beatCount(item?.beatIds)+' spor'}</b></div>
        <div class="av-meta-row"><span>Status</span><b>Arkivert</b></div>
      </div>
      <div class="av-tags"><span>${safe(type==='mixtape'?'mixtape':type==='album'?'album':'demo')}</span><span>melankolsk</span><span>lofi</span><span>+</span></div>
      <p class="av-action-title">Hurtighandlinger</p>
      <div class="av-actions">
        <button class="av-action" ${open}>▶<small>Åpne</small></button>
        <button class="av-action" ${restore}>↩<small>Tilbake</small></button>
        <button class="av-action" type="button">⇩<small>Last ned</small></button>
        <button class="av-action" type="button">↗<small>Del</small></button>
        <button class="av-action" type="button">…<small>Mer</small></button>
      </div>
    </aside>`;
  }
  window.renderArchiveView=function(){
    const s=getState();
    const archivedMixtapes=(s.mixtapes||[]).filter(m=>m.archived).map(x=>({...x,__type:'mixtape'}));
    const archivedAlbums=(s.albums||[]).filter(a=>a.archived).map(x=>({...x,__type:'album'}));
    const archivedBeats=(s.beats||[]).filter(b=>b.archived).map(x=>({...x,__type:'beat'}));
    const all=[...archivedMixtapes,...archivedAlbums,...archivedBeats];
    const chosen=all.find(x=>x.id===window.__mvArchiveSelected)||selectedFallback(all);
    const tab=document.getElementById('archiveTab'); if(!tab)return;
    tab.innerHTML=`<div class="archive-vault-page">
      <div class="av-topnav"><div class="av-brand">Music Vault</div><div class="av-nav"><span>⌂ Oversikt</span><span>♬ Beats</span><span>▣ Bibliotek</span><span class="active">▤ Arkiv</span></div></div>
      <div class="av-layout">
        <main class="av-main">
          <div class="av-header">
            <div class="av-title"><h2><span class="av-vinyl-dot"></span>Arkiv</h2><p>Grav i fortiden. Utforsk gamle prosjekter, utkast og versjoner som fortjener et nytt liv.</p></div>
            <div class="av-search-wrap"><label class="av-search"><input id="avSearchInput" placeholder="Søk i arkivet..."><span class="av-search-icon">⌕</span></label><button class="av-sort" type="button">Nyeste først⌄</button></div>
            <div class="av-count"><strong>${all.length}</strong><span>elementer i arkivet</span></div>
          </div>
          <div class="av-crate-grid">
            ${crate({key:'mixtape',title:'Mixtapes',count:archivedMixtapes.length,kind:'tape',sticker:'GOOD\nVIBES',items:archivedMixtapes})}
            ${crate({key:'album',title:'Albumer',count:archivedAlbums.length,kind:'vinyl',sticker:'M.V.',items:archivedAlbums})}
            ${crate({key:'beat',title:'Demoer',count:archivedBeats.length,kind:'cd',sticker:'ROUGH\nDIAMONDS',items:archivedBeats})}
            <button class="av-crate av-new" type="button"><div class="av-stack">＋</div><div class="av-crate-label">Ny kategori<small>Lag din egen arkivkasse</small></div></button>
            ${crate({key:'unreleased',title:'Uutgitt',count:archivedBeats.filter(b=>(b.done||0)<80).length,kind:'cd',sticker:'HANDLE\nWITH CARE',items:archivedBeats})}
            ${crate({key:'versions',title:'Gamle versjoner',count:all.length,kind:'tape',sticker:'V.1\nV.2\nV.3',items:all})}
            <div class="av-shelf-shadow"></div>
          </div>
          <div class="av-player-strip"><div class="av-mini-cover"></div><div><b>${safe(chosen?itemTitle(chosen):'Late Night Thoughts')}</b><div class="av-wave"></div></div><button class="av-play" type="button">▶</button></div>
        </main>
        ${detail(chosen)}
      </div>
    </div>`;
    tab.querySelectorAll('.av-crate[data-av-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      const type=btn.dataset.avFilter;
      const item=(type==='mixtape'?archivedMixtapes:type==='album'?archivedAlbums:type==='beat'?archivedBeats:all)[0];
      if(item){window.__mvArchiveSelected=item.id;window.renderArchiveView();}
    }));
    const input=tab.querySelector('#avSearchInput');
    input?.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      tab.querySelectorAll('.av-crate[data-av-filter]').forEach(btn=>{btn.style.opacity=q&&!btn.textContent.toLowerCase().includes(q)?'.38':'1'});
    });
  };
})();
