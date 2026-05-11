(function(){
  const PRODUCER_TABS=["mixtapes","pipeline"];
  function safeTab(tab){return PRODUCER_TABS.includes(tab)?tab:"mixtapes";}
  window.showProducerAllowedTab=function(tab){
    const target=safeTab(tab);
    document.body.classList.toggle('producer-mode',typeof isProducerUser==='function'&&isProducerUser());
    document.querySelectorAll('.tab-btn').forEach(btn=>{
      const isActive=btn.dataset.tab===target;
      btn.classList.toggle('active',isActive);
      if(typeof isProducerUser==='function'&&isProducerUser()){
        btn.style.display=PRODUCER_TABS.includes(btn.dataset.tab)?'inline-flex':'none';
      }else{
        btn.style.display='';
      }
    });
    document.querySelectorAll('.tab-view').forEach(view=>view.classList.add('hidden'));
    const view=document.getElementById(target+'Tab');
    if(view)view.classList.remove('hidden');
    if(target==='pipeline'&&typeof renderPipeline==='function')renderPipeline();
    if(target==='mixtapes'&&typeof renderMixtapes==='function')renderMixtapes();
  };
  const previousApply=window.applyRoleMode;
  window.applyRoleMode=function(){
    if(typeof previousApply==='function')previousApply();
    if(typeof isProducerUser==='function'&&isProducerUser()){
      const active=document.querySelector('.tab-btn.active')?.dataset?.tab||'mixtapes';
      window.showProducerAllowedTab(active);
    }
  };
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',function(e){
      if(!(typeof isProducerUser==='function'&&isProducerUser()))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const tab=btn.dataset.tab;
      if(!PRODUCER_TABS.includes(tab)){
        if(typeof showToast==='function')showToast('Produsentmodus har tilgang til mixtapes og pipeline');
        return false;
      }
      window.showProducerAllowedTab(tab);
      return false;
    },true);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    if(typeof isProducerUser==='function'&&isProducerUser())window.showProducerAllowedTab(document.querySelector('.tab-btn.active')?.dataset?.tab||'mixtapes');
  });
})();


/* === UX UPGRADE PACK === */
(function(){
  const _oldSaveState = window.saveState;
  const _oldRenderAll = window.renderAll;
  const _oldShowToast = window.showToast;
  let _toastTimer=null;
  let _selectedBeats=new Set();

  window.showToast=function(msg, actionLabel, actionFn){
    let t=document.getElementById('_toast');
    if(!t){t=document.createElement('div');t.id='_toast';t.style.cssText='position:fixed;bottom:22px;right:22px;background:rgba(18,18,27,.96);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:11px 14px;font-size:13px;z-index:9999;transform:translateY(60px);opacity:0;transition:all .25s;box-shadow:0 18px 50px rgba(0,0,0,.35);display:flex;align-items:center;gap:4px;pointer-events:auto';document.body.appendChild(t);}
    t.innerHTML=`<span>${esc(String(msg||''))}</span>${actionLabel?`<button class="toast-action" id="toastActionBtn">${esc(actionLabel)}</button>`:''}`;
    if(actionLabel&&actionFn){const b=document.getElementById('toastActionBtn'); if(b)b.onclick=()=>{actionFn();t.style.opacity='0';};}
    t.style.transform='translateY(0)';t.style.opacity='1';
    clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>{t.style.transform='translateY(60px)';t.style.opacity='0';},actionLabel?7000:2600);
  };

  window.saveState=function(){
    if(typeof _oldSaveState==='function')_oldSaveState();
    showSavePulse();
  };

  function showSavePulse(){
    let el=document.getElementById('autosaveIndicator');
    if(!el){el=document.createElement('div');el.id='autosaveIndicator';el.className='autosave-indicator';document.body.appendChild(el);}
    el.textContent='✓ Lagret';el.classList.add('show');
    clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1200);
  }

  function ensureUxData(){
    state.settings=state.settings||{};
    state.settings.lastBackup=state.settings.lastBackup||'';
    (state.beats||[]).forEach(b=>{
      if(!b.uploadedAt)b.uploadedAt=b.createdAt||Date.now();
      if(!b.uploadStatus)b.uploadStatus='sendt inn';
      if(!b.priority)b.priority='medium';
      if(typeof b.comments==='undefined')b.comments='';
      if(typeof b.pipelineNotes==='undefined')b.pipelineNotes='';
      if(typeof b.lyricsNotes==='undefined')b.lyricsNotes=b.lyricsNotes||'';
      if(typeof b.structure==='undefined')b.structure='Intro / Verse / Hook / Verse / Hook / Outro';
      if(typeof b.credits==='undefined')b.credits='';
      if(typeof b.bpm==='undefined')b.bpm='';
      if(typeof b.key==='undefined')b.key='';
      if(typeof b.energy==='undefined')b.energy='';
      if(typeof b.mood==='undefined')b.mood='';
      if(typeof b.tags==='undefined')b.tags='';
    });
    (state.mixtapes||[]).forEach((m,i)=>{if(!m.status)m.status='Åpen for uploads'; if(typeof m.description==='undefined')m.description=''; if(!m.color)m.color=cassColor(m,i);});
    (state.albums||[]).forEach(a=>{if(!a.status)a.status='Idé'; if(typeof a.archived==='undefined')a.archived=false;});
  }


  function installRoleBadge(){
    let badge=document.getElementById('roleBadge');
    if(!badge){badge=document.createElement('div');badge.id='roleBadge';badge.className='role-badge';document.body.appendChild(badge);}
    const role=isProducerUser()?'Produsent':'Admin';
    badge.textContent=role;badge.className='role-badge '+role.toLowerCase();
  }


  function emptyState(icon,title,text,btn,onclick){return `<div class="empty-state"><div><div class="empty-icon">${icon}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${btn?`<button class="primary-btn" onclick="${onclick}">${esc(btn)}</button>`:''}</div></div>`;}
  window.uxEmptyState=emptyState;

  const _oldRenderMixtapes=window.renderMixtapes;
  window.renderMixtapes=function(){
    ensureUxData();
    if(typeof _oldRenderMixtapes==='function')_oldRenderMixtapes();
    const grid=document.getElementById('mixtapeGrid');
    if(grid && !(state.mixtapes||[]).length){grid.innerHTML=emptyState('📼','Ingen mixtapes ennå','Lag en mixtape for å samle beats og produsent-uploads.','Lag mixtape',"document.getElementById('newMixtapeBtn').click()");}
    injectProducerDashboard();
    hydrateCards();
  };

  const _oldRenderAlbums=window.renderAlbums;
  window.renderAlbums=function(){
    ensureUxData();
    if(typeof _oldRenderAlbums==='function')_oldRenderAlbums();
    const grid=document.getElementById('albumGrid');
    if(grid && !(state.albums||[]).filter(a=>!a.archived).length){grid.innerHTML=emptyState('💿','Ingen albumer ennå','Lag et album for å flytte favorittbeats over til demoer.','Lag album',"document.getElementById('newAlbumBtn').click()");}
    hydrateCards();
  };

  const _oldRenderPipeline=window.renderPipeline;
  window.renderPipeline=function(){
    if(typeof _oldRenderPipeline==='function')_oldRenderPipeline();
    enhancePipeline();
  };

  function enhancePipeline(){
    const board=document.getElementById('pipelineBoard'); if(!board)return;
    if(!state.albums?.length){board.innerHTML=emptyState('📊','Pipeline er tom','Lag et album og legg til demoer for å bygge pipeline.','Lag album',"document.querySelector('[data-tab=albums]').click();setTimeout(()=>document.getElementById('newAlbumBtn')?.click(),80)");return;}
    if(!document.getElementById('pipelineFilterbar')){
      board.insertAdjacentHTML('beforebegin',`<div id="pipelineFilterbar" class="pipeline-filterbar"><input id="pipelineSearch" class="ux-input" placeholder="Søk i pipeline"><select id="pipelineStatusFilter" class="ux-input"><option value="">Alle statuser</option><option>Idé</option><option>Demo</option><option>Valgt</option><option>Miks</option><option>Master</option><option>Klar for release</option></select><select id="pipelinePriorityFilter" class="ux-input"><option value="">Alle prioriteter</option><option value="high">Høy</option><option value="medium">Medium</option><option value="low">Lav</option></select></div>`);
      ['pipelineSearch','pipelineStatusFilter','pipelinePriorityFilter'].forEach(id=>document.getElementById(id)?.addEventListener('input',filterPipeline));
    }
    board.querySelectorAll('.pipeline-beat-row').forEach(row=>{
      const name=row.querySelector('.pipeline-beat-name')?.textContent||'';
      const beat=(state.beats||[]).find(b=>b.name===name);
      if(beat){const col=beatMixtapeColor(beat.id,'album')||'var(--accent)';row.style.setProperty('--chip-color',col);row.dataset.priority=beat.priority||'medium';row.dataset.status=beat.stage||'';row.insertAdjacentHTML('beforeend',`<span class="beat-chip"><span class="color-dot" style="--chip-color:${col}"></span>${esc(beat.priority||'medium')}</span>`);}
    });
    filterPipeline();
  }
  function filterPipeline(){
    const q=(document.getElementById('pipelineSearch')?.value||'').toLowerCase();
    const st=document.getElementById('pipelineStatusFilter')?.value||'';
    const pr=document.getElementById('pipelinePriorityFilter')?.value||'';
    document.querySelectorAll('.pipeline-beat-row').forEach(row=>{const ok=(!q||row.textContent.toLowerCase().includes(q))&&(!st||row.dataset.status===st)&&(!pr||row.dataset.priority===pr);row.style.display=ok?'flex':'none';});
  }

  const _oldRenderAlbumDetail=window.renderAlbumDetail;
  window.renderAlbumDetail=function(){
    if(typeof _oldRenderAlbumDetail==='function')_oldRenderAlbumDetail();
    redesignAlbumDetail();
  };

  function redesignAlbumDetail(){
    const album=state.albums?.find(a=>a.id===currentAlbumId);
    const hd=document.getElementById('albumDetailHd');
    if(!album||!hd)return;
    const beats=beatsFromIds(album.beatIds);
    const avg=beats.length?Math.round(beats.reduce((s,b)=>s+Number(b.done||0),0)/beats.length):0;
    const isPlaying=bottomPlayer.context?.type==='album'&&bottomPlayer.context?.id===album.id&&!bottomPlayer.audio.paused;
    const cover=album.cover
      ?`<img src="${esc(album.cover)}" alt="${esc(album.name)}">`
      :`<div class="album-detail-cover-ph">♪</div>`;
    const label=album.cover
      ?`<img src="${esc(album.cover)}" alt="">`
      :`<div class="album-detail-cover-ph" style="font-size:22px;border-radius:50%">♪</div>`;
    hd.classList.toggle('is-playing-album',!!isPlaying);
    hd.innerHTML=`
      <div class="album-detail-premium">
        <div class="album-detail-art" aria-hidden="true">
          <div class="album-detail-vinyl">
            <div class="album-detail-vinyl-label">${label}</div>
            <div class="album-detail-vinyl-hole"></div>
          </div>
          <div class="album-detail-cover-card">${cover}</div>
        </div>

        <div class="album-detail-main">
          <div class="eyebrow">Album</div>
          <h2>${esc(album.name)}</h2>
          <p class="album-detail-sub">
            <span>${beats.length} demo${beats.length===1?'':'er'}</span>
            <span>•</span>
            <span>${avg}% snitt ferdig</span>
            <span>•</span>
            <span>${esc(album.status||'Idé')}</span>
          </p>
          <div class="album-detail-actions">
            <button class="primary-btn" id="playAlbumBtn" onclick="playAlbumFromStart('${album.id}')">▶ Spill fra start</button>
            <label class="ghost-btn" style="cursor:pointer">🖼️ Bytt albumbilde<input type="file" accept="image/*" hidden onchange="setAlbumCover('${album.id}',this.files[0])"></label>
            <button class="small-btn danger hidden" id="stopAlbumBtn" onclick="stopCollectionPlayback()">⏹ Stopp</button>
          </div>
        </div>

        <aside class="album-detail-side">
          <div class="meta-row"><span>Status</span><strong>${esc(album.status||'Idé')}</strong></div>
          <div class="meta-row"><span>Tracks</span><strong>${beats.length}</strong></div>
          <div class="meta-row"><span>Ferdig</span><strong>${avg}%</strong></div>
          <div class="progress-bar"><div style="width:${avg}%"></div></div>
          <select class="ux-input" onchange="albumStatusChange('${album.id}',this.value)">
            <option ${album.status==='Idé'?'selected':''}>Idé</option>
            <option ${album.status==='Demo'?'selected':''}>Demo</option>
            <option ${album.status==='Valgt'?'selected':''}>Valgt</option>
            <option ${album.status==='Miks'?'selected':''}>Miks</option>
            <option ${album.status==='Master'?'selected':''}>Master</option>
            <option ${album.status==='Klar for release'?'selected':''}>Klar for release</option>
          </select>
        </aside>
      </div>`;
  }
  window.albumStatusChange=function(id,val){const a=state.albums.find(x=>x.id===id);if(a){a.status=val;saveState();showToast('✓ Albumstatus oppdatert');renderAlbumDetail();}};
  window.setAlbumCover=function(id,file){if(!file)return;const r=new FileReader();r.onload=e=>{const a=state.albums.find(x=>x.id===id);if(a){a.cover=e.target.result;saveState();renderAlbumDetail();renderAlbums();showToast('✓ Albumbilde oppdatert');}};r.readAsDataURL(file);};

  const _oldRenderAlbumBeats=window.renderAlbumBeats;
  window.renderAlbumBeats=function(beats,mode,customEl){
    if(typeof _oldRenderAlbumBeats==='function')_oldRenderAlbumBeats(beats,mode,customEl);
    enhanceBeatCards(mode||'album', customEl||document.getElementById('albumBeatList'));
  };

  function enhanceBeatCards(mode,el){
    if(!el)return;
    if(!el.querySelector('.album-beat-card') && (!beatsFromDom(el).length))return;
    if(el.innerHTML.includes('Ingen beats')){
      el.innerHTML=emptyState(mode==='mixtape'?'🎧':'💿',mode==='mixtape'?'Mixtapen er tom':'Albumet er tomt',mode==='mixtape'?'Last opp beats eller legg til eksisterende beats.':'Legg til beats som demoer for å starte albumet.',mode==='mixtape'?'Last opp beats':'Legg til eksisterende',mode==='mixtape'?"document.getElementById('mixtapeUploadInput').click()":"document.getElementById('addBeatsToAlbumBtn').click()");
      return;
    }
    el.querySelectorAll('.album-beat-card').forEach(card=>{
      const id=card.dataset.beatId||card.id?.replace('abi-',''); const b=state.beats.find(x=>x.id===id); if(!b)return;
      card.classList.toggle('is-batch-selected',_selectedBeats.has(id));
      const title=card.querySelector('.ab-title');
      if(title&&!card.querySelector('.beat-chip-row')){const col=beatMixtapeColor(id,mode)||'var(--accent)';title.insertAdjacentHTML('afterend',`<div class="beat-chip-row" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="beat-chip"><span class="color-dot" style="--chip-color:${col}"></span>${esc(primaryMixtapeName(id)||'Mixtape')}</span></div>`);}
      const exp=card.querySelector('.ab-expand-left');
      if(exp&&!card.querySelector('.ux-extra-fields')) exp.insertAdjacentHTML('beforeend',extraBeatFields(b,mode));
    });
  }
  function beatsFromDom(el){return [...el.querySelectorAll('[data-beat-id]')].map(x=>x.dataset.beatId)}
  function primaryMixtapeName(id){const m=(state.mixtapes||[]).find(mt=>(mt.beatIds||[]).includes(id));return m?.name||'';}
  function extraBeatFields(b,mode){return ``;}
  window.updateBeatMeta=function(id,key,val){const b=state.beats.find(x=>x.id===id);if(!b)return;b[key]=val;saveState();showToast('✓ Oppdatert');};
  // Masseredigering er fjernet fra tracklisten.
  window.toggleBeatSelect=function(){};
  window.batchFavorite=function(){};
  window.batchRemove=function(){};
  window.batchMoveToAlbum=function(){};
  window.moveBeatToAlbumPrompt=function(id){const a=state.albums[0]; if(!a){showToast('Lag et album først');return;} if(!a.beatIds.includes(id))a.beatIds.push(id);saveState();renderMixtapeDetail();showToast(`✓ Kopiert til ${a.name}`,'Angre',()=>{a.beatIds=a.beatIds.filter(x=>x!==id);saveState();renderMixtapeDetail();});};

  const _oldRemoveFromCollection=window.removeFromCollection;
  window.removeFromCollection=function(beatId,mode){const col=activeCollectionForMode(mode||'album'); if(!col)return; const before=col.beatIds.slice(); if(typeof _oldRemoveFromCollection==='function')_oldRemoveFromCollection(beatId,mode); showToast('✓ Beat fjernet','Angre',()=>{col.beatIds=before;saveState();mode==='mixtape'?renderMixtapeDetail():renderAlbumDetail();});};

  const _oldToggleFav=window.toggleFav;
  window.toggleFav=function(id,btn){if(typeof _oldToggleFav==='function')_oldToggleFav(id,btn); document.querySelectorAll(`#bi-${id},#abi-${id}`).forEach(el=>{el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1200);});};

  const _oldCreateBeatFromFile=window.createBeatFromFile;
  if(_oldCreateBeatFromFile){window.createBeatFromFile=async function(file){const b=await _oldCreateBeatFromFile(file); if(b){b.fileType=file.type||'';b.fileSize=file.size||0;b.uploadedAt=Date.now();b.producer=isProducerUser()?'Produsent':'Admin';b.uploadStatus='sendt inn';} return b;};}

  function injectProducerDashboard(){
    if(!isProducerUser())return;
    const list=document.getElementById('mixtapesListView'); if(!list||document.getElementById('producerDashboard'))return;
    list.insertAdjacentHTML('afterbegin',`<div id="producerDashboard" class="producer-dashboard"><h3 style="margin:0 0 6px">Produsent-dashboard</h3><p class="hint" style="margin:0 0 12px">Last opp beats, lag mixtapes og følg med på pipeline-status. Sletting og admin-endringer er låst.</p><button class="primary-btn" onclick="document.getElementById('newMixtapeBtn').click()">+ Ny mixtape</button> <label class="ghost-btn" style="cursor:pointer;margin-left:8px">📂 Last opp beats<input type="file" accept="audio/*" multiple hidden onchange="producerQuickUpload(this.files)"></label></div>`);
  }
  window.producerQuickUpload=async function(files){let mt=state.mixtapes[0];if(!mt){mt={id:uid(),name:'Producer Uploads',beatIds:[],color:CASS_COLORS[0],status:'Åpen for uploads',createdAt:Date.now()};state.mixtapes.unshift(mt);}currentMixtapeId=mt.id;for(const f of [...files])addBeatToMixtape(await createBeatFromFile(f));saveState();renderMixtapes();showToast(`✓ ${files.length} beat${files.length===1?'':'s'} lastet opp`);};

  function hydrateCards(){document.querySelectorAll('.cassette-card,.album-card,.album-beat-card').forEach(el=>{el.addEventListener('dragstart',()=>document.body.classList.add('is-dragging'),{once:true});el.addEventListener('dragend',()=>document.body.classList.remove('is-dragging'),{once:true});});updatePlayingAnimations();}
  function updatePlayingAnimations(){document.body.classList.toggle('is-playing-mixtape',bottomPlayer.context?.type==='mixtape'&&!bottomPlayer.audio.paused);document.body.classList.toggle('is-playing-album',bottomPlayer.context?.type==='album'&&!bottomPlayer.audio.paused);document.querySelectorAll('.album-detail-hd').forEach(h=>h.classList.toggle('is-playing-album',bottomPlayer.context?.type==='album'&&!bottomPlayer.audio.paused));document.querySelectorAll(`#abi-${bottomPlayer.queue?.[bottomPlayer.index]?.id}`).forEach(el=>el.classList.add('flash'));}
  const _oldUpdateBottomUI=window.updateBottomUI; if(_oldUpdateBottomUI){window.updateBottomUI=function(){_oldUpdateBottomUI();updatePlayingAnimations();};}

  window.renderAll=function(){ensureUxData();installRoleBadge();if(typeof _oldRenderAll==='function')_oldRenderAll();installRoleBadge();};

  // Backup UX
  document.getElementById('exportBtn')?.addEventListener('click',()=>{state.settings.lastBackup=new Date().toLocaleString('no-NO');setTimeout(()=>showToast('✓ Backup eksportert'),80);});
  document.getElementById('importInput')?.addEventListener('change',e=>{const f=e.target.files?.[0]; if(f)showToast(`Importer: ${f.name}. Sjekk at dette er riktig backup.`);});

  ensureUxData();installRoleBadge();setTimeout(()=>{try{renderAll();}catch(e){console.error(e);}},80);
})();
