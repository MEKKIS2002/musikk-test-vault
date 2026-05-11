(function(){
  function esc(v){return String(v ?? '').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function appState(){return (typeof window.state!=='undefined'&&window.state)?window.state:(typeof state!=='undefined'?state:{beats:[],albums:[],mixtapes:[],settings:{}});}
  function toast(msg){if(typeof showToast==='function')showToast(msg);else if(typeof show==='function')show(msg);else console.log(msg);}
  function titleOf(x){return x?.name||x?.title||x?.filename||'Uten navn';}
  function fmt(v){try{return v?new Date(v).toLocaleDateString('no-NO',{day:'2-digit',month:'short',year:'numeric'}):'Ukjent';}catch(e){return 'Ukjent';}}
  function progressOf(x){if(typeof x?.progress==='number')return Math.max(0,Math.min(100,Math.round(x.progress)));if(typeof x?.completion==='number')return Math.max(0,Math.min(100,Math.round(x.completion)));if(typeof x?.done==='number')return Math.max(0,Math.min(100,Math.round(x.done)));if(x?.done||x?.finished)return 100;if(x?.hasAudio&&x?.lyrics)return 80;if(x?.hasAudio)return 55;return 38;}
  function countOf(x){return Array.isArray(x?.beatIds)?x.beatIds.length:(x?.__type==='beat'?1:0);}
  function kindOf(x){return x?.__type==='album'?'Album':x?.__type==='mixtape'?'Mixtape':'Demo';}
  function typeKey(x){return x?.__type==='album'?'album':x?.__type==='mixtape'?'mixtape':'demo';}
  function genreOf(x,i){const pool=['Hip hop','R&B / Soul','Trap','Lo-fi','Afrobeat','Demo','Ideas'];return x?.genre||x?.mood||x?.category||pool[i%pool.length];}
  function itemDate(x){return Number(new Date(x?.archivedAt||x?.updatedAt||x?.createdAt||0))||0;}
  function allArchived(){const s=appState();return [
    ...(s.albums||[]).filter(x=>x&&x.archived).map(x=>Object.assign({__type:'album'},x)),
    ...(s.mixtapes||[]).filter(x=>x&&x.archived).map(x=>Object.assign({__type:'mixtape'},x)),
    ...(s.beats||[]).filter(x=>x&&x.archived).map(x=>Object.assign({__type:'beat'},x))
  ];}
  function allGenres(){const set=new Set(allArchived().map((x,i)=>genreOf(x,i)).filter(Boolean));return ['alle',...Array.from(set).sort((a,b)=>a.localeCompare(b,'no'))];}
  function getRecords(){
    let items=allArchived();
    const q=(window.__acpQuery||'').trim().toLowerCase();
    const type=window.__acpType||'alle';
    const genre=window.__acpGenre||'alle';
    const sort=window.__acpSort||'newest';
    const onlyPlayable=!!window.__acpOnlyPlayable;
    items=items.filter(function(x,i){
      const hay=[titleOf(x),kindOf(x),genreOf(x,i),x.mood||'',x.description||'',x.notes||''].join(' ').toLowerCase();
      const typeOk=type==='alle'||typeKey(x)===type;
      const genreOk=genre==='alle'||genreOf(x,i)===genre;
      const playableOk=!onlyPlayable||hasLikelyAudio(x);
      return (!q||hay.includes(q))&&typeOk&&genreOk&&playableOk;
    });
    items.sort(function(a,b){
      if(sort==='oldest')return itemDate(a)-itemDate(b);
      if(sort==='az')return titleOf(a).localeCompare(titleOf(b),'no');
      if(sort==='za')return titleOf(b).localeCompare(titleOf(a),'no');
      if(sort==='progress')return progressOf(b)-progressOf(a);
      return itemDate(b)-itemDate(a);
    });
    return items;
  }
  function colors(x,i){const pairs=[['#151515','#050505'],['#782655','#160c15'],['#d8d1c0','#716756'],['#ca6420','#210e07'],['#1e7069','#061714'],['#30235d','#070711'],['#7a441e','#130905']];return [x.c1||pairs[i%pairs.length][0],x.c2||pairs[i%pairs.length][1]];}
  function hasLikelyAudio(x){const s=appState();if(x?.__type==='beat')return !!(x.url||x.audio_url||x.drive_url||x.hasAudio);const beats=(x.beatIds||[]).map(id=>(s.beats||[]).find(b=>b.id===id)).filter(Boolean);return beats.some(b=>b.url||b.audio_url||b.drive_url||b.hasAudio);}
  function ensureExtraStyles(){if(document.getElementById('acp-functional-styles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="acp-functional-styles">
    .acp-mini-btn{cursor:pointer}.acp-mini-btn:hover,.acp-action:hover,.acp-pill:hover{filter:brightness(1.12)}
    .acp-action-menu{display:grid;gap:8px;margin-top:10px;padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(0,0,0,.32)}
    .acp-action-menu.hidden{display:none}.acp-action.danger{color:#ffb4a8;border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.10)}
    .acp-filter-drawer{display:flex;flex-wrap:wrap;gap:10px;margin:-12px 0 20px;padding:12px 16px;border:1px solid rgba(255,159,48,.18);border-radius:18px;background:rgba(255,159,48,.055);color:#d8c8af;font-size:13px}
    .acp-filter-drawer.hidden{display:none}.acp-filter-drawer label{display:flex;align-items:center;gap:8px}.acp-filter-drawer input{accent-color:#ff9f30}
    .acp-list{display:grid;gap:10px;margin:12px 24px 0}.acp-list-row{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:14px 16px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.035);color:#f6efe8}.acp-list-row small{display:block;color:#bda98d;margin-top:4px}.acp-list-row button{height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.32);color:#fff;padding:0 12px;font-weight:800}.acp-list-row button.primary{border-color:rgba(255,159,48,.55);background:rgba(255,159,48,.13);color:#ffd28a}.acp-empty strong{display:block;color:#fff;font-size:20px;margin-bottom:6px}
    .acp-now-playing{color:#ffd28a!important}.acp-action:disabled{opacity:.45;cursor:not-allowed}
  </style>`);}
  function ensureArchiveTab(){const tabs=document.querySelector('.tabs');if(tabs&&!document.querySelector('[data-tab="archive"]'))tabs.insertAdjacentHTML('beforeend','<button class="tab-btn" data-tab="archive">▣ Arkivert</button>');let tab=document.getElementById('archiveTab');if(!tab){tab=document.createElement('section');tab.id='archiveTab';tab.className='tab-view hidden';(document.getElementById('integrationsTab')||document.querySelector('main.app')||document.body).insertAdjacentElement('afterend',tab);}return tab;}
  function activateArchive(){ensureArchiveTab();document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.toggle('active',b.dataset.tab==='archive')});document.querySelectorAll('.tab-view').forEach(function(v){if(v.id!=='archiveTab')v.classList.add('hidden')});document.getElementById('archiveTab')?.classList.remove('hidden');}
  function beatsForItem(x){const s=appState();if(!x)return[];if(x.__type==='beat')return (s.beats||[]).filter(b=>b.id===x.id);return (x.beatIds||[]).map(id=>(s.beats||[]).find(b=>b.id===id)).filter(Boolean);}
  async function playItem(x){
    if(!x)return;
    const s=appState();
    if(x.__type==='album' && typeof playAlbumFromStart==='function')return playAlbumFromStart(x.id);
    if(x.__type==='mixtape' && typeof playMixtapeFromStart==='function')return playMixtapeFromStart(x.id);
    if(x.__type==='beat' && typeof playSingleBeat==='function')return playSingleBeat(x.id);
    const queue=beatsForItem(x);
    if(typeof playQueue==='function')return playQueue(queue,{type:x.__type||'archive',id:x.id,label:titleOf(x)});
    toast('Fant ingen avspillingsfunksjon i appen.');
  }
  function restoreItem(id){const s=appState();const item=[...(s.albums||[]),...(s.mixtapes||[]),...(s.beats||[])].find(x=>x&&x.id===id);if(!item)return;item.archived=false;if(typeof saveState==='function')saveState();if(typeof renderAll==='function')renderAll();window.__acpSelected=null;render();toast('✓ Gjenopprettet fra arkiv');}
  function deleteItem(id){const s=appState();let type=null;let arr=null;[['album',s.albums],['mixtape',s.mixtapes],['beat',s.beats]].some(([t,a])=>{const i=(a||[]).findIndex(x=>x.id===id);if(i>=0){type=t;arr=a;return true;}return false;});if(!arr)return;const item=arr.find(x=>x.id===id);if(!confirm(`Slette «${titleOf(item)}» permanent? Dette kan ikke angres.`))return;const idx=arr.findIndex(x=>x.id===id);arr.splice(idx,1);if(typeof saveState==='function')saveState();if(typeof renderAll==='function')renderAll();window.__acpSelected=null;render();toast('Slettet permanent');}
  function openOriginal(id){const s=appState();let item=(s.mixtapes||[]).find(x=>x.id===id);if(item){window.currentMixtapeId=id;document.querySelector('[data-tab="mixtapes"]')?.click();return;}item=(s.albums||[]).find(x=>x.id===id);if(item){window.currentAlbumId=id;document.querySelector('[data-tab="albums"]')?.click();return;}item=(s.beats||[]).find(x=>x.id===id);if(item){document.querySelector('[data-tab="pipeline"]')?.click();toast('Demoen er valgt i arkivet. Bruk søk i Pipeline for å finne den raskt.');return;} }
  function exportJson(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},0);}
  function exportItem(id){const item=allArchived().find(x=>x.id===id);if(!item)return;exportJson(`music-vault-arkiv-${titleOf(item).replace(/[^a-z0-9æøå_-]+/gi,'-')}.json`,item);toast('Eksporterte arkiv-element');}
  function exportArchive(){exportJson('music-vault-arkiv.json',{exportedAt:new Date().toISOString(),items:allArchived()});toast('Eksporterte hele arkivet');}
  function recordCard(x,i,selected){const [c1,c2]=colors(x,i);const title=esc(titleOf(x));const pct=progressOf(x);const cover=x.cover||x.image||x.artwork||'';const coverCss=x.coverCss?`--cover:${x.coverCss};`:'';const playing=isPlayingItem(x);return `<article class="acp-record ${selected?'is-selected':''} ${playing?'is-playing':''}" data-acp-record="${esc(x.id)}" style="--c1:${c1};--c2:${c2};${coverCss}"><button type="button" class="acp-record-select" data-acp-select="${esc(x.id)}" aria-label="Velg ${title}"><div class="acp-disc"></div><div class="acp-sleeve">${cover?`<img src="${esc(cover)}" alt="">`:''}<div class="acp-genre-tab">${esc(genreOf(x,i))}</div><button type="button" class="acp-menu-dot" data-acp-menu-card="${esc(x.id)}" title="Flere handlinger">⋮</button><div class="acp-card-info"><h3>${title}</h3><p>${kindOf(x)} · ${countOf(x)} beats</p><span class="acp-tag">${esc(x.mood||genreOf(x,i))}</span><div class="acp-progress-row"><span>Ferdig ${pct}%</span><div class="acp-progress"><i style="width:${pct}%"></i></div></div><div class="acp-card-actions"><button type="button" class="acp-mini-btn" data-acp-play="${esc(x.id)}">${playing?'⏸ Spiller':'▶ Preview'}</button><button type="button" class="acp-mini-btn" data-acp-restore-card="${esc(x.id)}">↩ Gjenopprett</button></div></div></div></button></article>`;}
  function isPlayingItem(x){try{const ctx=window.bottomPlayer?.context;const paused=window.bottomPlayer?.audio?.paused;return !!ctx&&!paused&&ctx.id===x.id;}catch(e){return false;}}
  function detail(x,idx){if(!x)return `<div class="acp-empty"><strong>Arkivet er tomt</strong><span>Arkiver et album, en mixtape eller en demo, så dukker den opp her i trekassen.</span></div>`;const [c1,c2]=colors(x,idx);const pct=progressOf(x);const cover=x.cover||x.image||x.artwork||'';const canPlay=countOf(x)>0||x.__type==='beat';const playing=isPlayingItem(x);return `<div class="acp-detail"><div class="acp-detail-cover"><div class="acp-detail-art" style="--c1:${c1};--c2:${c2}">${cover?`<img src="${esc(cover)}" alt="">`:''}</div><div class="acp-detail-text"><span class="acp-tag">${esc(genreOf(x,idx))}</span><h3 class="${playing?'acp-now-playing':''}">${esc(titleOf(x))}</h3><p>${kindOf(x)} · ${countOf(x)} beats</p></div></div><div><div class="acp-meta-grid"><div class="acp-meta"><span>Type</span><b>${kindOf(x)}</b></div><div class="acp-meta"><span>Beats</span><b>${countOf(x)}</b></div><div class="acp-meta"><span>Opprettet</span><b>${fmt(x.createdAt)}</b></div><div class="acp-meta"><span>Sist arkivert</span><b>${fmt(x.archivedAt)}</b></div></div><div class="acp-detail-progress" style="margin-top:22px"><span><b>Fremdrift</b><b>${pct}%</b></span><div class="bar"><i style="width:${pct}%"></i></div></div></div><div class="acp-detail-actions"><button class="acp-action primary" data-acp-preview ${!canPlay?'disabled':''}>${playing?'⏸ Spiller':'▶ Forhåndsvis'}</button><button class="acp-action" data-acp-restore>↩ Gjenopprett</button><button class="acp-action" data-acp-open>↗ Åpne</button><button class="acp-action" data-acp-more>⋯ Flere handlinger</button><div class="acp-action-menu hidden" data-acp-menu><button class="acp-action" data-acp-export-item>⇩ Eksporter info</button><button class="acp-action" data-acp-copy-name>⧉ Kopier navn</button><button class="acp-action danger" data-acp-delete>🗑 Slett permanent</button></div></div></div>`;}
  function listView(records){return `<div class="acp-list">${records.map((x,i)=>`<div class="acp-list-row"><div><b>${esc(titleOf(x))}</b><small>${kindOf(x)} · ${countOf(x)} beats · ${esc(genreOf(x,i))} · ${fmt(x.archivedAt||x.createdAt)}</small></div><button class="primary" data-acp-play="${esc(x.id)}">▶ Spill</button><button data-acp-restore-card="${esc(x.id)}">↩ Gjenopprett</button></div>`).join('')||'<div class="acp-empty">Ingen elementer matcher filtrene.</div>'}</div>`;}
  function render(){
    ensureExtraStyles();
    const tab=ensureArchiveTab();
    const records=getRecords();
    let selected=records.find(x=>x.id===window.__acpSelected)||records[0]||null;
    if(selected)window.__acpSelected=selected.id;
    const rawCount=allArchived().length;
    const selectedIndex=Math.max(0,records.findIndex(x=>x.id===window.__acpSelected));
    const genres=allGenres();
    const mode=window.__acpViewMode||'crate';
    tab.innerHTML=`<div class="archive-crate-prototype"><div class="acp-top"><div class="acp-mark"><span class="acp-wave"></span>MUSIC VAULT</div><div class="acp-admin"><i></i>ADMIN</div></div><div class="acp-hero"><div><div class="acp-kicker">Arkivkasse</div><h1 class="acp-title">Arkiverte plater</h1><p class="acp-copy">Utforsk dine arkiverte prosjekter. Her ligger idéer du har lagt på hylla – klare til å hentes frem igjen når tiden er inne.</p></div><div class="acp-stats"><div class="acp-stat"><div class="acp-stat-icon">◉</div><div><b>${rawCount}</b><span>Plater i arkivet</span></div></div><div class="acp-stat"><div class="acp-stat-icon">▣</div><div><b>${records.length}</b><span>Vises nå</span></div></div><div class="acp-stat"><div class="acp-stat-icon">▶</div><div><b>${allArchived().filter(hasLikelyAudio).length}</b><span>Kan spilles</span></div></div><div class="acp-stat"><div class="acp-stat-icon">↩</div><div><b>${allArchived().filter(x=>x.__type==='album'||x.__type==='mixtape').length}</b><span>Samlinger</span></div></div></div></div><div class="acp-controls"><label class="acp-search">⌕<input id="acpSearch" value="${esc(window.__acpQuery||'')}" placeholder="Søk i arkivet..."></label><select id="acpType" class="acp-pill"><option value="alle" ${(!window.__acpType||window.__acpType==='alle')?'selected':''}>Alle typer</option><option value="album" ${window.__acpType==='album'?'selected':''}>Album</option><option value="mixtape" ${window.__acpType==='mixtape'?'selected':''}>Mixtape</option><option value="demo" ${window.__acpType==='demo'?'selected':''}>Demo</option></select><select id="acpGenre" class="acp-pill">${genres.map(g=>`<option value="${esc(g)}" ${((window.__acpGenre||'alle')===g)?'selected':''}>${g==='alle'?'Alle sjangre':esc(g)}</option>`).join('')}</select><select id="acpSort" class="acp-pill"><option value="newest" ${(!window.__acpSort||window.__acpSort==='newest')?'selected':''}>Dato (nyeste)</option><option value="oldest" ${window.__acpSort==='oldest'?'selected':''}>Dato (eldste)</option><option value="az" ${window.__acpSort==='az'?'selected':''}>A–Å</option><option value="za" ${window.__acpSort==='za'?'selected':''}>Å–A</option><option value="progress" ${window.__acpSort==='progress'?'selected':''}>Fremdrift</option></select><button class="acp-pill accent" data-acp-filters>☰ Flere filtre</button><button class="acp-pill accent" data-acp-bulk style="margin-left:auto">Massehandlinger⌄</button></div><div class="acp-filter-drawer ${window.__acpShowFilters?'':'hidden'}"><label><input type="checkbox" id="acpOnlyPlayable" ${window.__acpOnlyPlayable?'checked':''}> Vis kun elementer med lyd</label><button class="acp-mini-btn" data-acp-clear-filters>Nullstill filtre</button></div>${mode==='crate'?`<div class="acp-crate-stage"><button class="acp-arrow left" data-acp-left>‹</button><div class="acp-crate"><div class="acp-record-track" data-acp-track>${records.map(function(x,i){return recordCard(x,i,x.id===window.__acpSelected)}).join('')}${!records.length?'<div class="acp-empty">Ingen plater matcher søket.</div>':''}</div><div class="acp-wood-lip"></div><div class="acp-plaque"><small>✦ MUSIC VAULT ✦</small><strong>ARKIVKASSE</strong><em>— IDÉER TAR ALDRI FRI —</em></div></div><button class="acp-arrow right" data-acp-right>›</button></div>`:listView(records)}${detail(selected,selectedIndex)}<div class="acp-bottom"><div class="acp-tip">⭐ Tips: Bruk Forhåndsvis for å høre gjennom arkiverte album, mixtapes og demoer uten å gjenopprette dem.</div><div class="acp-storage">▣ <span>Arkivstatus<br>${rawCount} elementer totalt</span><div class="bar"><i style="width:${rawCount?Math.min(100,Math.round((records.length/rawCount)*100)):0}%"></i></div><b>${rawCount?Math.round((records.length/rawCount)*100):0}%</b></div><div class="acp-toggle"><button class="${mode==='crate'?'active':''}" data-acp-view="crate">▰ Kassevisning</button><button class="${mode==='list'?'active':''}" data-acp-view="list">☷ Listevisning</button></div></div></div>`;
    bindArchiveEvents(tab);
  }
  function selectedItem(){return allArchived().find(x=>x.id===window.__acpSelected)||null;}
  function bindArchiveEvents(tab){
    const track=tab.querySelector('[data-acp-track]');
    tab.querySelector('[data-acp-left]')?.addEventListener('click',()=>track?.scrollBy({left:-340,behavior:'smooth'}));
    tab.querySelector('[data-acp-right]')?.addEventListener('click',()=>track?.scrollBy({left:340,behavior:'smooth'}));
    tab.querySelectorAll('[data-acp-select]').forEach(btn=>btn.addEventListener('click',function(e){e.preventDefault();window.__acpSelected=this.dataset.acpSelect;render();setTimeout(()=>{const active=tab.querySelector('.acp-record.is-selected');active?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});},20)}));
    tab.querySelectorAll('[data-acp-play], [data-acp-preview]').forEach(btn=>btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();const id=this.dataset.acpPlay||window.__acpSelected;const item=allArchived().find(x=>x.id===id);playItem(item).then(()=>setTimeout(render,80));}));
    tab.querySelectorAll('[data-acp-restore-card], [data-acp-restore]').forEach(btn=>btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();const id=this.dataset.acpRestoreCard||window.__acpSelected;restoreItem(id);}));
    tab.querySelector('#acpSearch')?.addEventListener('input',function(){window.__acpQuery=this.value;render()});
    tab.querySelector('#acpType')?.addEventListener('change',function(){window.__acpType=this.value;window.__acpSelected=null;render()});
    tab.querySelector('#acpGenre')?.addEventListener('change',function(){window.__acpGenre=this.value;window.__acpSelected=null;render()});
    tab.querySelector('#acpSort')?.addEventListener('change',function(){window.__acpSort=this.value;render()});
    tab.querySelector('[data-acp-filters]')?.addEventListener('click',function(){window.__acpShowFilters=!window.__acpShowFilters;render()});
    tab.querySelector('#acpOnlyPlayable')?.addEventListener('change',function(){window.__acpOnlyPlayable=this.checked;window.__acpSelected=null;render()});
    tab.querySelector('[data-acp-clear-filters]')?.addEventListener('click',function(){window.__acpQuery='';window.__acpType='alle';window.__acpGenre='alle';window.__acpSort='newest';window.__acpOnlyPlayable=false;window.__acpSelected=null;render()});
    tab.querySelector('[data-acp-bulk]')?.addEventListener('click',exportArchive);
    tab.querySelector('[data-acp-open]')?.addEventListener('click',()=>openOriginal(window.__acpSelected));
    tab.querySelector('[data-acp-more]')?.addEventListener('click',()=>tab.querySelector('[data-acp-menu]')?.classList.toggle('hidden'));
    tab.querySelector('[data-acp-export-item]')?.addEventListener('click',()=>exportItem(window.__acpSelected));
    tab.querySelector('[data-acp-copy-name]')?.addEventListener('click',async()=>{const item=selectedItem();if(!item)return;try{await navigator.clipboard.writeText(titleOf(item));toast('Kopierte navn');}catch(e){toast(titleOf(item));}});
    tab.querySelector('[data-acp-delete]')?.addEventListener('click',()=>deleteItem(window.__acpSelected));
    tab.querySelectorAll('[data-acp-view]').forEach(btn=>btn.addEventListener('click',function(){window.__acpViewMode=this.dataset.acpView;render()}));
  }
  document.addEventListener('click',function(e){const btn=e.target.closest?.('.tab-btn[data-tab]');if(!btn || btn.dataset.tab==='archive')return;setTimeout(function(){const view=document.getElementById(btn.dataset.tab+'Tab');view?.querySelectorAll('.content-panel.hidden').forEach(function(panel){panel.classList.remove('hidden');});},0);},true);
  window.renderArchiveView=render;
  window.openArchiveTab=function(){activateArchive();render();};
  document.addEventListener('click',function(e){const btn=e.target.closest?.('[data-tab="archive"]');if(btn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.openArchiveTab();return false;}},true);
  setTimeout(function(){ensureArchiveTab();if(document.querySelector('[data-tab="archive"]')?.classList.contains('active'))render();},0);
  console.assert(typeof render==='function','Archive crate prototype render exists');
  console.assert(Array.isArray(allArchived()),'Archive data source available');
})();
