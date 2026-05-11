(function(){
  if(window.__fullUpgradePackLoaded)return; window.__fullUpgradePackLoaded=true;
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const safeEsc=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getRole=()=>typeof getUserRole==='function'?(getUserRole()||'admin'):(sessionStorage.getItem('mv_role')||'admin');
  const isProducer=()=>typeof isProducerUser==='function'?isProducerUser():getRole()==='producer';
  const parseTime=v=>{if(v==null||v==='')return null; const s=String(v).trim(); if(/^\d+:\d+(\.\d+)?$/.test(s)){const [m,sec]=s.split(':');return Number(m)*60+Number(sec);} const n=Number(s.replace(',','.')); return Number.isFinite(n)?n:null;};
  function ensureFullData(){
    try{
      state.settings=state.settings||{}; state.settings.recentlyPlayed=state.settings.recentlyPlayed||[]; state.settings.archivedIds=state.settings.archivedIds||[]; state.settings.producerName=state.settings.producerName||'';
      state.settings.notifications=state.settings.notifications||[]; state.settings.showArchived=!!state.settings.showArchived;
      (state.beats||[]).forEach(b=>{b.createdAt=b.createdAt||Date.now(); b.uploadedAt=b.uploadedAt||b.createdAt; b.uploadStatus=b.uploadStatus||'sendt inn'; b.priority=b.priority||'medium'; b.stage=b.stage||'Idé'; b.owner=b.owner||b.producerName||b.producer||'Admin'; b.fileType=b.fileType||''; b.fileSize=b.fileSize||0; b.deadline=b.deadline||''; b.assignee=b.assignee||''; b.structure=b.structure||b.structure||''; b.credits=b.credits||'';});
      (state.mixtapes||[]).forEach(m=>{m.archived=!!m.archived; m.description=m.description||''; m.status=m.status||'Åpen for uploads'; m.coverZoom=m.coverZoom||1; m.coverPosX=m.coverPosX||50; m.coverPosY=m.coverPosY||50;});
      (state.albums||[]).forEach(a=>{a.archived=!!a.archived; a.status=a.status||'Idé'; a.deadline=a.deadline||''; a.assignee=a.assignee||'';});
    }catch(e){console.warn('full data repair failed',e)}
  }
  const oldSave=window.saveState; window.saveState=function(){ensureFullData(); if(oldSave)oldSave(); showSavedIndicator();};
  function showSavedIndicator(){let el=$('#autosaveIndicator'); if(!el){el=document.createElement('div');el.id='autosaveIndicator';el.className='upgrade-pill';el.style.cssText='position:fixed;left:18px;bottom:108px;z-index:2300;background:rgba(18,18,27,.92);backdrop-filter:blur(14px)';document.body.appendChild(el);}el.textContent='✓ Lagret';el.style.opacity='1';clearTimeout(window.__saveT);window.__saveT=setTimeout(()=>el.style.opacity='.0',1200);}

  function installGlobalSearch(){
    const app=$('.app')||document.body; if($('#globalSearchWrap'))return;
    const nav=$('.tabs'); const wrap=document.createElement('div'); wrap.id='globalSearchWrap'; wrap.className='global-search-wrap';
    wrap.innerHTML=`<input id="globalSearchInput" class="global-search-input" placeholder="Søk globalt i beats, mixtapes, album, lyrics, credits og notater…"><div id="globalSearchResults" class="global-search-results"></div>`;
    if(nav) nav.insertAdjacentElement('beforebegin',wrap); else app.insertAdjacentElement('afterbegin',wrap);
    $('#globalSearchInput').addEventListener('input',renderGlobalSearch);
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearchInput')?.focus();}});
  }
  function renderGlobalSearch(){
    const q=$('#globalSearchInput')?.value.trim().toLowerCase()||''; const out=$('#globalSearchResults'); if(!out)return;
    if(!q){out.classList.remove('open');out.innerHTML='';return;}
    const results=[];
    (state.beats||[]).forEach(b=>{const hay=[b.name,b.source,b.lyrics,b.comments,b.structure,b.credits,b.bpm,b.key,b.priority,b.stage,b.owner,b.uploadStatus].join(' ').toLowerCase(); if(hay.includes(q))results.push({type:'Beat',title:b.name,sub:[b.bpm&&b.bpm+' BPM',b.key,b.owner,b.uploadStatus].filter(Boolean).join(' · '),go:()=>openBeatContext(b.id)});});
    (state.mixtapes||[]).forEach(m=>{const hay=[m.name,m.description,m.status].join(' ').toLowerCase(); if(hay.includes(q))results.push({type:'Mixtape',title:m.name,sub:`${(m.beatIds||[]).length} beats · ${m.status||''}`,go:()=>{document.querySelector('[data-tab="mixtapes"]')?.click();setTimeout(()=>openMixtape(m.id),80)}});});
    (state.albums||[]).forEach(a=>{const hay=[a.name,a.status,a.assignee,a.deadline].join(' ').toLowerCase(); if(hay.includes(q))results.push({type:'Album',title:a.name,sub:`${(a.beatIds||[]).length} demoer · ${a.status||''}`,go:()=>{document.querySelector('[data-tab="albums"]')?.click();setTimeout(()=>openAlbum(a.id),80)}});});
    out.innerHTML=results.slice(0,40).map((r,i)=>`<div class="global-result" data-i="${i}"><div class="global-result-type">${safeEsc(r.type)}</div><div style="min-width:0"><div class="global-result-title">${safeEsc(r.title)}</div><div class="global-result-sub">${safeEsc(r.sub||'')}</div></div></div>`).join('')||`<div class="global-result"><div class="global-result-sub">Ingen treff.</div></div>`;
    out.classList.add('open'); $$('.global-result[data-i]',out).forEach(el=>el.onclick=()=>{results[Number(el.dataset.i)]?.go(); out.classList.remove('open');});
  }
  window.openBeatContext=function(id){const mt=(state.mixtapes||[]).find(m=>(m.beatIds||[]).includes(id)); const al=(state.albums||[]).find(a=>(a.beatIds||[]).includes(id)); if(mt){document.querySelector('[data-tab="mixtapes"]')?.click();setTimeout(()=>{openMixtape(mt.id);setTimeout(()=>document.getElementById('abi-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}),120)},80);} else if(al){document.querySelector('[data-tab="albums"]')?.click();setTimeout(()=>{openAlbum(al.id);setTimeout(()=>document.getElementById('abi-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}),120)},80);} };

  function installQueueDrawer(){
    if($('#queueDrawer'))return; const d=document.createElement('div'); d.id='queueDrawer'; d.className='queue-drawer';
    d.innerHTML=`<div class="queue-hd"><strong>Play queue</strong><button class="ghost-btn" onclick="document.getElementById('queueDrawer').classList.remove('open')">Lukk</button></div><div id="queueList" class="queue-list"></div><div class="queue-hd"><strong>Recently played</strong></div><div id="recentList" class="queue-list"></div>`;document.body.appendChild(d);
    const btn=document.createElement('button');btn.id='queueToggleBtn';btn.className='ghost-btn';btn.textContent='Kø';btn.onclick=()=>{d.classList.toggle('open');renderQueueDrawer();}; $('.bp-right')?.prepend(btn);
  }
  function renderQueueDrawer(){const q=$('#queueList'), r=$('#recentList'); if(q){q.innerHTML=(bottomPlayer.queue||[]).map((b,i)=>`<div class="queue-item ${i===bottomPlayer.index?'active':''}" onclick="playBottomIndex(${i})"><span class="queue-num">${i+1}</span><div style="min-width:0"><div class="queue-title">${safeEsc(b.name)}</div><div class="queue-sub">${safeEsc(bottomPlayer.context?.label||'Queue')}</div></div></div>`).join('')||'<div class="queue-item"><span class="queue-sub">Køen er tom.</span></div>';} if(r){r.innerHTML=(state.settings.recentlyPlayed||[]).slice(0,12).map(id=>state.beats.find(b=>b.id===id)).filter(Boolean).map(b=>`<div class="queue-item" onclick="playSingleBeat('${b.id}')"><span class="queue-num">▶</span><div class="queue-title">${safeEsc(b.name)}</div></div>`).join('')||'<div class="queue-item"><span class="queue-sub">Ingen nylig spilte.</span></div>';}}
  const oldPlayIndex=window.playBottomIndex; if(oldPlayIndex){window.playBottomIndex=async function(i){await oldPlayIndex(i); const b=bottomPlayer.queue?.[bottomPlayer.index]; if(b){state.settings.recentlyPlayed=[b.id,...(state.settings.recentlyPlayed||[]).filter(x=>x!==b.id)].slice(0,30); if(oldSave)oldSave();} renderQueueDrawer();};}
  bottomPlayer?.audio?.addEventListener('timeupdate',()=>{const b=bottomPlayer.queue?.[bottomPlayer.index]; if(!b)return; const s=parseTime(b.loopStart), e=parseTime(b.loopEnd); if(s!=null&&e!=null&&e>s&&bottomPlayer.audio.currentTime>=e){bottomPlayer.audio.currentTime=s; showLoopFlash(b.id);}});
  function showLoopFlash(id){const card=$('#abi-'+id); if(card){card.classList.add('loop-active');setTimeout(()=>card.classList.remove('loop-active'),700);}}

  async function drawWaveformForBeat(id,holder){
    if(!holder||holder.dataset.drawn)return; holder.dataset.drawn='1'; holder.classList.add('loading');
    try{let blob=await audioDB.load(id); if(!blob){holder.textContent='Waveform kun for lokale lydfiler'; holder.classList.remove('loading'); return;}
      const buf=await blob.arrayBuffer(); const ctx=new (window.AudioContext||window.webkitAudioContext)(); const audio=await ctx.decodeAudioData(buf.slice(0)); const data=audio.getChannelData(0); const canvas=document.createElement('canvas'); canvas.width=900; canvas.height=110; const c=canvas.getContext('2d'); c.clearRect(0,0,900,110); c.globalAlpha=.95; c.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent')||'#f59e0b'; c.lineWidth=2; const step=Math.ceil(data.length/450); c.beginPath(); for(let i=0;i<450;i++){let min=1,max=-1; for(let j=0;j<step;j++){const v=data[(i*step)+j]||0;if(v<min)min=v;if(v>max)max=v;} const x=i*2; c.moveTo(x,55+min*48); c.lineTo(x,55+max*48);} c.stroke(); holder.innerHTML=''; holder.appendChild(canvas); const b=state.beats.find(x=>x.id===id); if(b){b.duration=Math.round(audio.duration); if(!b.fileSize)b.fileSize=blob.size; if(!b.fileType)b.fileType=blob.type; if(oldSave)oldSave();} ctx.close?.();
    }catch(e){console.warn(e); holder.textContent='Kunne ikke tegne waveform';} finally{holder.classList.remove('loading');}
  }
  function enhanceWaveforms(){ $$('.album-beat-card').forEach(card=>{const id=card.dataset.beatId; const w=$('.waveform',card); if(id&&w&&!w.dataset.hasClick){w.dataset.hasClick='1'; w.textContent='Klikk for waveform'; w.onclick=(e)=>{e.stopPropagation();drawWaveformForBeat(id,w)}; drawWaveformForBeat(id,w);}}); }

  function addExtendedMeta(){ return;
    $$('.album-beat-card').forEach(card=>{const id=card.dataset.beatId; const b=state.beats.find(x=>x.id===id); if(!b)return; const ex=$('.ux-extra-fields',card); if(ex&&!$('.full-meta-extra',ex)){
      ex.insertAdjacentHTML('beforeend',`<div class="full-meta-extra"><div class="meta-mini-grid"><input class="ux-input" type="date" title="Deadline" value="${safeEsc(b.deadline||'')}" onchange="updateBeatMeta('${id}','deadline',this.value)"><input class="ux-input" placeholder="Ansvarlig" value="${safeEsc(b.assignee||'')}" onchange="updateBeatMeta('${id}','assignee',this.value)"><select class="ux-input" onchange="updateBeatMeta('${id}','uploadStatus',this.value)"><option ${b.uploadStatus==='sendt inn'?'selected':''}>sendt inn</option><option ${b.uploadStatus==='hørt'?'selected':''}>hørt</option><option ${b.uploadStatus==='favoritt'?'selected':''}>favoritt</option><option ${b.uploadStatus==='valgt til album'?'selected':''}>valgt til album</option><option ${b.uploadStatus==='trenger ny versjon'?'selected':''}>trenger ny versjon</option></select></div><div class="structure-tags"><span class="structure-tag">Intro</span><span class="structure-tag">Verse</span><span class="structure-tag">Hook</span><span class="structure-tag">Bridge</span><span class="structure-tag">Outro</span></div><div class="hint" style="margin-top:8px">Metadata: ${safeEsc(b.fileType||'ukjent filtype')} · ${b.fileSize?Math.round(b.fileSize/1024/1024*10)/10+' MB':'ukjent størrelse'} · ${b.duration?fmtTime(b.duration):'ukjent varighet'} · ${b.uploadedAt?new Date(b.uploadedAt).toLocaleDateString('no-NO'):''}</div></div>`);
      if(isProducer()&&b.owner&&state.settings.producerName&&b.owner!==state.settings.producerName&&b.owner!=='Produsent'){card.classList.add('producer-locked'); ex.querySelectorAll('input,select,textarea,button').forEach(x=>{if(!/play/i.test(x.textContent||''))x.disabled=true;});}
      if(isProducer()&&(!b.owner||b.owner===state.settings.producerName||b.owner==='Produsent'))card.classList.add('producer-owned');
    }});
  }

  function updateArchiveToolbarButtons(){
    const album=(state.albums||[]).find(x=>x.id===currentAlbumId);
    const mixtape=(state.mixtapes||[]).find(x=>x.id===currentMixtapeId);
    const albumBtn=document.getElementById('archiveAlbumBtn');
    if(albumBtn){
      albumBtn.style.display=album?'inline-flex':'none';
      albumBtn.textContent=album?archiveLabel('album',album):'Arkiver album';
      albumBtn.onclick=function(e){e?.stopPropagation?.(); archiveCurrentCollection('album');};
    }
    const mixtapeBtn=document.getElementById('archiveMixtapeBtn');
    if(mixtapeBtn){
      mixtapeBtn.style.display=mixtape?'inline-flex':'none';
      mixtapeBtn.textContent=mixtape?archiveLabel('mixtape',mixtape):'Arkiver mixtape';
      mixtapeBtn.onclick=function(e){e?.stopPropagation?.(); archiveCurrentCollection('mixtape');};
    }
    document.querySelectorAll('.mv-archive-detail-toolbar').forEach(el=>el.remove());
  }
  window.updateArchiveToolbarButtons=updateArchiveToolbarButtons;
  window.archiveCurrentCollection=function(type){
    if(type==='album'){
      const item=(state.albums||[]).find(x=>x.id===currentAlbumId);
      if(item) toggleArchiveItem('album', item.id);
      return;
    }
    const item=(state.mixtapes||[]).find(x=>x.id===currentMixtapeId);
    if(item) toggleArchiveItem('mixtape', item.id);
  };

  function installArchiveControls(){
    updateArchiveToolbarButtons();
    // Global "Vis arkiv" button removed: archive has its own tab.
    $('#archiveToggleGlobal')?.closest('.archive-toolbar')?.remove();
    document.querySelectorAll('.mv-archive-detail-toolbar').forEach(el=>el.remove());
    if(!state.settings.showArchived){(state.albums||[]).forEach((al,i)=>{if(al.archived) $$('.album-card')[i]?.classList.add('archive-hidden')}); (state.mixtapes||[]).forEach((mt,i)=>{if(mt.archived) $$('.cassette-card')[i]?.classList.add('archive-hidden')});}
  }
  window.toggleShowArchived=function(){state.settings.showArchived=!state.settings.showArchived;saveState();renderAll();};
  window.toggleArchiveItem=function(type,id){const arr=type==='album'?state.albums:state.mixtapes; const item=arr.find(x=>x.id===id); if(!item)return; item.archived=!item.archived; saveState(); renderAll(); updateArchiveToolbarButtons?.(); showToast(item.archived?'✓ Arkivert':'✓ Gjenopprettet','Angre',()=>{item.archived=!item.archived;saveState();renderAll();updateArchiveToolbarButtons?.();});};

  function createModal(id,title,body){let m=$('#'+id); if(!m){m=document.createElement('div');m.id=id;m.className='modal';m.innerHTML=`<div class="modal-card modal-sm"><div class="modal-hd"><div class="modal-hd-left"><h2>${title}</h2></div><div class="modal-hd-right"><button class="close-btn" onclick="closeModal('${id}')">×</button></div></div><div class="modal-body" style="padding:22px 28px 28px;display:grid;gap:14px"></div></div>`;document.body.appendChild(m);} $('.modal-body',m).innerHTML=body; return m;}
  window.openCassetteCropEditor=function(id){const mt=state.mixtapes.find(x=>x.id===id); if(!mt){return} const body=`<div class="crop-editor-stage" style="--cass-color:${safeEsc(cassColor(mt,state.mixtapes.indexOf(mt)))};--zoom:${mt.coverZoom||1};--pos-x:${mt.coverPosX||50}%;--pos-y:${mt.coverPosY||50}%">${mt.cover?`<img id="cropPreviewImg" src="${safeEsc(mt.cover)}">`:'<div style="display:grid;place-items:center;height:100%;color:#fff">Ingen kassettbilde</div>'}</div><label class="ghost-btn" style="cursor:pointer;justify-content:center">Bytt bilde<input type="file" hidden accept="image/*" onchange="cassetteCropUpload('${id}',this.files[0])"></label><label>Zoom<input id="cropZoom" type="range" min="1" max="2.4" step=".05" value="${mt.coverZoom||1}" oninput="cassetteCropChange('${id}','coverZoom',this.value)"></label><label>Horisontal posisjon<input type="range" min="0" max="100" value="${mt.coverPosX||50}" oninput="cassetteCropChange('${id}','coverPosX',this.value)"></label><label>Vertikal posisjon<input type="range" min="0" max="100" value="${mt.coverPosY||50}" oninput="cassetteCropChange('${id}','coverPosY',this.value)"></label><button class="primary-btn" onclick="saveState();renderMixtapeDetail();renderMixtapes();closeModal('cassetteCropModal');showToast('✓ Kassettbilde lagret')">Lagre</button>`; createModal('cassetteCropModal','Rediger kassettbilde',body).classList.add('open');};
  window.cassetteCropChange=function(id,key,val){const mt=state.mixtapes.find(x=>x.id===id); if(!mt)return; mt[key]=Number(val); const st=$('.crop-editor-stage'); if(st){st.style.setProperty('--zoom',mt.coverZoom||1);st.style.setProperty('--pos-x',(mt.coverPosX||50)+'%');st.style.setProperty('--pos-y',(mt.coverPosY||50)+'%');}};
  window.cassetteCropUpload=function(id,file){if(!file)return;const r=new FileReader();r.onload=e=>{const mt=state.mixtapes.find(x=>x.id===id); if(mt){mt.cover=e.target.result;openCassetteCropEditor(id)}};r.readAsDataURL(file);};
  const oldCassCoverStyle=window.cassCoverStyle; if(oldCassCoverStyle){window.cassCoverStyle=function(cover){return oldCassCoverStyle(cover)}}

  function installImportPreview(){const inp=$('#importInput'); if(!inp||inp.dataset.fullPreview)return; inp.dataset.fullPreview='1'; inp.addEventListener('change',e=>{e.stopImmediatePropagation(); const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{try{const raw=JSON.parse(r.result); const imp=typeof migrate==='function'?migrate(raw):raw; const body=`<p class="hint">Sjekk backupen før import. Import erstatter nåværende lokale data.</p><div class="import-preview-list"><div class="import-preview-row"><span>Beats</span><strong>${(imp.beats||[]).length}</strong></div><div class="import-preview-row"><span>Mixtapes</span><strong>${(imp.mixtapes||[]).length}</strong></div><div class="import-preview-row"><span>Albumer</span><strong>${(imp.albums||[]).length}</strong></div></div><button class="primary-btn" id="confirmImportPreview">Importer backup</button>`; const m=createModal('importPreviewModal','Import-preview',body); m.classList.add('open'); $('#confirmImportPreview').onclick=()=>{Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,imp);ensureFullData();currentAlbumId=null;currentMixtapeId=null;saveState();renderAll();closeModal('importPreviewModal');showToast('✓ Backup importert');};}catch(err){alert('Ugyldig fil.')}}; r.readAsText(f);},true);}

  function installProducerEnhancements(){
    if(isProducer()&&!state.settings.producerName){const n=prompt('Produsentnavn for uploads?', 'Produsent')||'Produsent'; state.settings.producerName=n; saveState();}
    const dash=$('#producerDashboard'); if(dash&&!$('#producerNotifications')){const mine=(state.beats||[]).filter(b=>b.owner===state.settings.producerName||b.producerName===state.settings.producerName); const action=mine.filter(b=>['favoritt','valgt til album','trenger ny versjon'].includes(b.uploadStatus)).length; dash.insertAdjacentHTML('beforeend',`<div id="producerNotifications" class="upgrade-panel" style="margin-top:14px"><h3>Mine uploads <span class="notification-badge">${action}</span></h3><p class="hint">${mine.length} beats lastet opp av ${safeEsc(state.settings.producerName||'produsent')}.</p></div>`);}
    const badge=$('#roleBadge'); if(badge&&isProducer()&&state.settings.producerName) badge.textContent='Produsent · '+state.settings.producerName;
  }
  const oldCreateBeat=window.createBeatFromFile; if(oldCreateBeat){window.createBeatFromFile=async function(file){const b=await oldCreateBeat(file); if(b){b.owner=isProducer()?(state.settings.producerName||'Produsent'):'Admin';b.producerName=b.owner;b.uploadStatus=b.uploadStatus||'sendt inn';b.uploadedAt=Date.now();b.fileType=file.type||b.fileType||'';b.fileSize=file.size||b.fileSize||0;saveState();} return b;};}

  function installResetDemo(){if($('#resetDemoBtn'))return; const area=$('#integrationsTab .content-panel')||$('#integrationsTab')||document.body; area.insertAdjacentHTML('beforeend',`<div class="upgrade-panel"><h3>Data-verktøy</h3><div class="upgrade-row"><button id="resetDemoBtn" class="small-btn danger">Reset lokale data</button><button id="loadDemoBtn" class="ghost-btn">Last inn demo-data</button><span class="hint">Bruk med forsiktighet. Backup anbefales først.</span></div></div>`); $('#resetDemoBtn').onclick=()=>showDeleteConfirm('Nullstille all lokal data?',()=>{localStorage.removeItem('mvState');location.reload();}); $('#loadDemoBtn').onclick=()=>{state.mixtapes.unshift({id:uid(),name:'Demo Mixtape',beatIds:[],color:'#6d8fbd',status:'Åpen for uploads',createdAt:Date.now()});state.albums.unshift({id:uid(),name:'Demo Album',beatIds:[],status:'Idé',createdAt:Date.now()});saveState();renderAll();showToast('✓ Demo-data lagt til');};}

  function addPipelineInputs(){ $$('.pipeline-beat-row').forEach(row=>{if($('.pipeline-extra',row))return; const name=$('.pipeline-beat-name',row)?.textContent; const b=state.beats.find(x=>x.name===name); if(!b)return; row.insertAdjacentHTML('beforeend',`<div class="pipeline-extra" style="display:flex;gap:6px;flex-wrap:wrap"><input class="ux-input" style="width:130px;padding:6px 8px" type="date" value="${safeEsc(b.deadline||'')}" onchange="updateBeatMeta('${b.id}','deadline',this.value)"><input class="ux-input" style="width:120px;padding:6px 8px" placeholder="Ansvarlig" value="${safeEsc(b.assignee||'')}" onchange="updateBeatMeta('${b.id}','assignee',this.value)"></div>`);});}

  const oldRenderAll2=window.renderAll; window.renderAll=function(){ensureFullData(); if(oldRenderAll2)oldRenderAll2(); setTimeout(runFullEnhancements,0);};
  const oldRenderAlbumBeats2=window.renderAlbumBeats; if(oldRenderAlbumBeats2){window.renderAlbumBeats=function(beats,mode,customEl){oldRenderAlbumBeats2(beats,mode,customEl); setTimeout(()=>{enhanceWaveforms();addExtendedMeta();},0);};}
  function runFullEnhancements(){installGlobalSearch();installQueueDrawer();installArchiveControls();installImportPreview();installProducerEnhancements();installResetDemo();enhanceWaveforms();addExtendedMeta();addPipelineInputs();renderQueueDrawer();}
  ensureFullData(); setTimeout(()=>{try{runFullEnhancements(); renderQueueDrawer();}catch(e){console.error(e)}},120);
})();
