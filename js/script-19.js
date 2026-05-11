(function(){
  function esc(v){return String(v??'').replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function fmtDate(ts){if(!ts)return '—'; try{return new Date(ts).toLocaleDateString('no-NO',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return '—';}}
  function mediaType(item){return item?.__type==='album'?'Vinyl':item?.__type==='mixtape'?'Kassett':'CD';}
  function archiveGroups(){
    const s=window.state||{};
    return {
      mixtapes:(s.mixtapes||[]).filter(x=>x && x.archived).map(x=>Object.assign({__type:'mixtape'},x)),
      albums:(s.albums||[]).filter(x=>x && x.archived).map(x=>Object.assign({__type:'album'},x)),
      beats:(s.beats||[]).filter(x=>x && x.archived).map(x=>Object.assign({__type:'beat'},x))
    };
  }
  function sortItems(items,mode){
    const arr=[...(items||[])];
    const getTime=i=>Number(i?.archivedAt||i?.updatedAt||i?.createdAt||0);
    if(mode==='oldest')arr.sort((a,b)=>getTime(a)-getTime(b));
    else if(mode==='az')arr.sort((a,b)=>(a.name||a.title||'').localeCompare(b.name||b.title||'','no'));
    else if(mode==='za')arr.sort((a,b)=>(b.name||b.title||'').localeCompare(a.name||a.title||'','no'));
    else arr.sort((a,b)=>getTime(b)-getTime(a));
    return arr;
  }
  function titleOf(item){return item?.name||item?.title||'Uten navn';}
  function countLabel(item){
    if(item?.__type==='album'||item?.__type==='mixtape')return `${(item.beatIds||[]).length} spor`;
    return `${item?.bpm? item.bpm+' BPM' : 'Demo'}`;
  }
  function visual(item, selected){
    const title=esc(titleOf(item));
    const sel=window.__mvArchiveSelected===item.id?' selected':'';
    if(item.__type==='mixtape'){
      return `<button class="av-arch-item${sel}" data-archive-item="${esc(item.id)}" aria-label="${title}"><div class="av-media-tape"><div class="lbl">${title}</div></div><div class="av-arch-caption"><strong>${title}</strong><span>${countLabel(item)}</span></div></button>`;
    }
    if(item.__type==='album'){
      const img=item.cover?`<img src="${esc(item.cover)}" alt="">`:'';
      return `<button class="av-arch-item${sel}" data-archive-item="${esc(item.id)}" aria-label="${title}"><div class="av-media-vinyl"><div class="disc"></div><div class="sleeve">${img}<div class="lbl">${title}</div></div></div><div class="av-arch-caption"><strong>${title}</strong><span>${countLabel(item)}</span></div></button>`;
    }
    return `<button class="av-arch-item${sel}" data-archive-item="${esc(item.id)}" aria-label="${title}"><div class="av-media-cd"><div class="case"></div><div class="disc"></div><div class="lbl">${title}</div></div><div class="av-arch-caption"><strong>${title}</strong><span>${countLabel(item)}</span></div></button>`;
  }
  function crate(label, type, items){
    const icon = type==='mixtape'?'📼':(type==='album'?'💿':'💽');
    const countText=`${items.length} ${items.length===1?'prosjekt':'prosjekter'}`;
    const inner = items.length ? items.map(visual).join('') : `<div class="av-crate-empty">Ingen arkiverte ${label.toLowerCase()} ennå.</div>`;
    return `<section class="av-crate-box" data-crate-type="${type}">
      <div class="av-crate-head"><div class="av-crate-tab">${esc(label)}</div><div class="av-crate-count">${countText}</div></div>
      <div class="av-crate-viewport">
        <button class="av-crate-scroll-btn" type="button" data-scroll-left aria-label="Scroll venstre">‹</button>
        <div class="av-crate-scroll" data-crate-scroll>${inner}</div>
        <button class="av-crate-scroll-btn" type="button" data-scroll-right aria-label="Scroll høyre">›</button>
      </div>
    </section>`;
  }
  function findSelected(all){
    let found = all.find(x=>x.id===window.__mvArchiveSelected);
    if(!found && all[0]){window.__mvArchiveSelected=all[0].id; found=all[0];}
    return found || null;
  }
  function feature(item){
    if(!item)return `<div class="av-side"><div class="av-side-card"><div class="empty upgraded-empty"><strong>Velg et arkivert item</strong><span>Klikk på en kassett, vinyl eller CD i en av kassene for å se detaljer.</span></div></div></div>`;
    const title=esc(titleOf(item));
    const type=item.__type;
    const art = type==='album'
      ? `<div class="av-feature-art"><div class="av-feature-vinyl"></div><div class="av-feature-sleeve">${item.cover?`<img src="${esc(item.cover)}" alt="">`:''}<div class="av-feature-tape">${title}</div></div></div>`
      : type==='mixtape'
      ? `<div class="av-feature-art"><div class="av-feature-cassette"><div class="lab">${title}</div></div></div>`
      : `<div class="av-feature-art"><div class="av-feature-cdwrap"><div class="av-feature-cd"></div><div class="av-feature-cdlabel">${title}</div></div></div>`;
    const tags = [];
    if(type==='album')tags.push('album'); if(type==='mixtape')tags.push('mixtape'); if(type==='beat')tags.push('demo'); tags.push('arkiv'); tags.push('vault');
    return `<aside class="av-side"><div class="av-side-card">
      <div class="av-side-head"><span>Valgt item</span><button type="button" class="av-close">×</button></div>
      ${art}
      <div class="av-feature-title"><h3>${title}</h3><p>${esc(mediaType(item))} · Arkivert · ${type==='beat'?'Sang/beat':'Samling'}</p></div>
      <div class="av-meta">
        <div class="av-meta-row"><span>Dato arkivert</span><b>${fmtDate(item.archivedAt||item.updatedAt||item.createdAt)}</b></div>
        <div class="av-meta-row"><span>Opprettet</span><b>${fmtDate(item.createdAt)}</b></div>
        <div class="av-meta-row"><span>Innhold</span><b>${type==='beat'?'1 spor':`${(item.beatIds||[]).length} spor`}</b></div>
        <div class="av-meta-row"><span>Status</span><b>Arkivert</b></div>
      </div>
      <div class="av-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}<span>+</span></div>
      <div class="av-section-title">Hurtighandlinger</div>
      <div class="av-actions">
        <button type="button" class="av-action" data-archive-action="open"><span>▶</span><small>Åpne</small></button>
        <button type="button" class="av-action" data-archive-action="restore"><span>↩</span><small>Tilbake</small></button>
        <button type="button" class="av-action"><span>⇩</span><small>Last ned</small></button>
        <button type="button" class="av-action"><span>↗</span><small>Del</small></button>
        <button type="button" class="av-action"><span>⋯</span><small>Mer</small></button>
      </div>
    </div></aside>`;
  }
  function ensureArchiveTab(){
    const tabs=document.querySelector('.tabs');
    if(tabs && !document.querySelector('[data-tab="archive"]')) tabs.insertAdjacentHTML('beforeend','<button class="tab-btn" data-tab="archive">🗄️ Arkivert</button>');
    let tab=document.getElementById('archiveTab');
    if(!tab){tab=document.createElement('section'); tab.id='archiveTab'; tab.className='content-panel hidden'; document.querySelector('.content-panel')?.parentNode?.appendChild(tab);}
    return tab;
  }
  function activateArchiveTab(){
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='archive'));
    document.querySelectorAll('.content-panel').forEach(el=>{if(el.id!=='archiveTab')el.classList.add('hidden');});
    ensureArchiveTab().classList.remove('hidden');
  }
  window.renderArchiveView=function(){
    const tab=ensureArchiveTab(); if(!tab) return;
    const grouped=archiveGroups();
    const allRaw=[...grouped.mixtapes,...grouped.albums,...grouped.beats];
    const q=(window.__mvArchiveQuery||'').trim().toLowerCase();
    const sort=window.__mvArchiveSort||'newest';
    function apply(items){
      let out=sortItems(items, sort);
      if(q) out=out.filter(it=>JSON.stringify([titleOf(it),it.notes||'',it.description||'']).toLowerCase().includes(q));
      return out;
    }
    grouped.mixtapes=apply(grouped.mixtapes);
    grouped.albums=apply(grouped.albums);
    grouped.beats=apply(grouped.beats);
    const all=[...grouped.mixtapes,...grouped.albums,...grouped.beats];
    const selected=findSelected(all.length?all:allRaw);
    tab.innerHTML = `<div class="archive-vault-page">
      <div class="av-topnav"><div class="av-brand">Music Vault</div><div class="av-nav"><span>⌂ Oversikt</span><span>♬ Beats</span><span>▣ Bibliotek</span><span class="active">▤ Arkiv</span></div></div>
      <div class="av-layout">
        <div class="av-main">
          <div class="av-header"><div class="av-title"><h2><span class="av-vinyl-dot"></span>Arkiv</h2><p>Grav i fortiden. Utforsk gamle prosjekter, utkast og versjoner som fortjener et nytt liv.</p></div>
            <div class="av-search-wrap"><label class="av-search"><span>●</span><input id="archiveSearchInputV2" value="${esc(window.__mvArchiveQuery||'')}" placeholder="Søk i arkivet…"><i>⌕</i></label><select id="archiveSortSelectV2" class="av-sort"><option value="newest" ${sort==='newest'?'selected':''}>Nyeste først</option><option value="oldest" ${sort==='oldest'?'selected':''}>Eldste først</option><option value="az" ${sort==='az'?'selected':''}>A–Å</option><option value="za" ${sort==='za'?'selected':''}>Å–A</option></select><div class="av-count"><strong>${allRaw.length}</strong><span>elementer i arkivet</span></div></div>
          </div>
          ${allRaw.length ? `<div class="av-crate-grid">${crate('Mixtapes','mixtape',grouped.mixtapes)}${crate('Albumer','album',grouped.albums)}${crate('Demoer','beat',grouped.beats)}<div class="av-create-box"><div><div class="plus">+</div><div class="txt">Ny kategori</div></div></div></div>` : `<div class="empty upgraded-empty" style="margin-top:20px"><strong>Arkivet er tomt</strong><span>Arkiver et album, en kassett eller en demo, så dukker den opp her som en kasse du kan bla i.</span></div>`}
        </div>
        ${feature(selected)}
      </div>
      <div class="av-bottom-player"><div class="av-player-track">${selected?esc(titleOf(selected)):'Ingenting valgt'}</div><div class="av-player-line"></div><button class="av-player-btn">▶</button></div>
    </div>`;

    tab.querySelectorAll('[data-archive-item]').forEach(btn=>btn.addEventListener('click', function(){window.__mvArchiveSelected=this.dataset.archiveItem; window.renderArchiveView();}));
    tab.querySelectorAll('[data-scroll-left]').forEach(btn=>btn.addEventListener('click', function(){const sc=this.parentNode.querySelector('[data-crate-scroll]'); if(sc) sc.scrollBy({left:-220,behavior:'smooth'});}));
    tab.querySelectorAll('[data-scroll-right]').forEach(btn=>btn.addEventListener('click', function(){const sc=this.parentNode.querySelector('[data-crate-scroll]'); if(sc) sc.scrollBy({left:220,behavior:'smooth'});}));
    const search=tab.querySelector('#archiveSearchInputV2'); if(search) search.addEventListener('input', function(){window.__mvArchiveQuery=this.value; window.renderArchiveView();});
    const sortSel=tab.querySelector('#archiveSortSelectV2'); if(sortSel) sortSel.addEventListener('change', function(){window.__mvArchiveSort=this.value; window.renderArchiveView();});
    tab.querySelector('.av-close')?.addEventListener('click', function(){window.__mvArchiveSelected=null; window.renderArchiveView();});
    tab.querySelector('[data-archive-action="restore"]')?.addEventListener('click', function(){
      const s=window.state||{}; const item=(s.mixtapes||[]).concat(s.albums||[]).concat(s.beats||[]).find(x=>x && x.id===window.__mvArchiveSelected); if(!item) return;
      item.archived=false; if(typeof saveState==='function') saveState(); if(typeof renderAll==='function') renderAll(); window.__mvArchiveSelected=null; window.renderArchiveView(); if(typeof showToast==='function') showToast('✓ Gjenopprettet fra arkiv');
    });
    tab.querySelector('[data-archive-action="open"]')?.addEventListener('click', function(){
      const s=window.state||{}; const id=window.__mvArchiveSelected; let item=(s.mixtapes||[]).find(x=>x.id===id); if(item){window.currentMixtapeId=id; document.querySelector('[data-tab="mixtapes"]')?.click(); return;}
      item=(s.albums||[]).find(x=>x.id===id); if(item){window.currentAlbumId=id; document.querySelector('[data-tab="albums"]')?.click(); return;}
      if(typeof showToast==='function') showToast('Åpne demoen fra Beats-fanen');
    });
  };
  const prevToggle=window.toggleArchiveItem;
  window.toggleArchiveItem=function(type,id){ if(typeof prevToggle==='function') prevToggle(type,id); else { const arr=type==='album'?(state.albums||[]):type==='mixtape'?(state.mixtapes||[]):(state.beats||[]); const item=arr.find(x=>x.id===id); if(item){item.archived=!item.archived; if(item.archived&&!item.archivedAt)item.archivedAt=Date.now(); if(!item.archived) delete item.archivedAt; saveState?.();}} if(document.querySelector('[data-tab="archive"]')?.classList.contains('active')) setTimeout(window.renderArchiveView,0); };
  const prevArchiveCollection=window.archiveCurrentCollection;
  window.archiveCurrentCollection=function(type){ if(typeof prevArchiveCollection==='function') prevArchiveCollection(type); setTimeout(()=>{ if(document.querySelector('[data-tab="archive"]')?.classList.contains('active')) window.renderArchiveView(); }, 0); };
  window.openArchiveTab=function(){ activateArchiveTab(); window.renderArchiveView(); };
  document.addEventListener('click', function(e){ const btn=e.target.closest?.('[data-tab="archive"]'); if(btn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); window.openArchiveTab(); return false;} }, true);
  setTimeout(function(){ ensureArchiveTab(); if(document.querySelector('[data-tab="archive"]')?.classList.contains('active')) window.renderArchiveView(); }, 0);
})();
