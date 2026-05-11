/*
  Supabase datasynk for Music Vault
  - Leser felles innhold fra Supabase for alle brukere.
  - Skriver bare til Supabase når window.isAdminMode === true.
  - Lydfiler ligger fortsatt eksternt, f.eks. Google Drive. audio_url/url lagres i databasen.

  Kjør denne SQL-en én gang dersom tabellene dine mangler metadata-kolonnen:

  alter table public.beats add column if not exists metadata jsonb default '{}'::jsonb;
  alter table public.albums add column if not exists metadata jsonb default '{}'::jsonb;
  alter table public.mixtapes add column if not exists metadata jsonb default '{}'::jsonb;
*/
(function(){
  if (window.__musicVaultSupabaseSyncInstalled) return;
  window.__musicVaultSupabaseSyncInstalled = true;

  const SYNC_STATUS_ID = 'supabaseSyncStatus';
  let isPullingFromSupabase = false;
  let pushTimer = null;
  let lastPushAt = 0;

  function client(){ return window.supabaseClient || null; }
  function appState(){ try { return state; } catch { return null; } }
  function canWrite(){ return !!(client() && window.isAdminMode); }
  function say(msg, type='info'){
    const el = document.getElementById(SYNC_STATUS_ID);
    if(el){ el.textContent = msg; el.dataset.type = type; }
    if(type === 'error') console.error(msg);
  }
  function toast(msg){ try { if(typeof showToast === 'function') showToast(msg); } catch{} }
  function safeDate(ms){
    const n = Number(ms || Date.now());
    const d = new Date(Number.isFinite(n) ? n : Date.now());
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  function fromIso(v){
    const t = v ? new Date(v).getTime() : Date.now();
    return Number.isFinite(t) ? t : Date.now();
  }
  function driveIdFromUrl(url){
    const str = String(url || '');
    return (str.match(/[?&]id=([^&#]+)/) || str.match(/\/d\/([^/?#]+)/) || [])[1] || '';
  }
  function uniq(arr){ return [...new Set((arr || []).filter(Boolean))]; }

  function packBeat(b){
    const meta = {...b};
    delete meta.id;
    const title = b.name || b.title || 'Untitled beat';
    return {
      id: b.id,
      title,
      bpm: Number.isFinite(Number(b.bpm)) ? Number(b.bpm) : null,
      tags: Array.isArray(b.tags) ? b.tags : [],
      audio_url: normalizeAudioUrl(b.audio_url) || normalizeAudioUrl(b.url) || '',
      drive_file_id: b.drive_file_id || driveIdFromUrl(b.audio_url || b.url),
      archived: !!b.archived,
      created_at: safeDate(b.createdAt),
      metadata: meta
    };
  }
  function unpackBeat(row){
    const meta = row.metadata || {};
    return {
      ...meta,
      id: row.id,
      name: meta.name || row.title || 'Untitled beat',
      title: row.title || meta.name || 'Untitled beat',
      url: normalizeAudioUrl(row.audio_url) || normalizeAudioUrl(meta.url) || '',
      audio_url: normalizeAudioUrl(row.audio_url) || normalizeAudioUrl(meta.url) || '',
      drive_file_id: row.drive_file_id || meta.drive_file_id || '',
      source: meta.source || (row.drive_file_id ? 'Google Drive' : (row.audio_url ? 'URL' : '')),
      tags: Array.isArray(row.tags) ? row.tags : (meta.tags || []),
      bpm: row.bpm ?? meta.bpm ?? null,
      archived: !!row.archived,
      favorite: !!meta.favorite,
      lyrics: meta.lyrics || '',
      rating: Number(meta.rating || 0),
      cover: meta.cover || '',
      done: Number(meta.done || 0),
      createdAt: meta.createdAt || fromIso(row.created_at)
    };
  }
  function packAlbum(a){
    const meta = {...a};
    delete meta.id;
    delete meta.beatIds;
    return {
      id: a.id,
      title: a.name || a.title || 'Untitled album',
      description: a.description || '',
      cover_url: a.cover || a.cover_url || '',
      archived: !!a.archived,
      created_at: safeDate(a.createdAt),
      metadata: meta
    };
  }
  function unpackAlbum(row, beatIds){
    const meta = row.metadata || {};
    return {
      ...meta,
      id: row.id,
      name: meta.name || row.title || 'Untitled album',
      title: row.title || meta.name || 'Untitled album',
      description: row.description || meta.description || '',
      cover: meta.cover || row.cover_url || null,
      cover_url: row.cover_url || meta.cover || '',
      archived: !!row.archived,
      beatIds: beatIds || meta.beatIds || [],
      createdAt: meta.createdAt || fromIso(row.created_at)
    };
  }
  function packMixtape(m){
    const meta = {...m};
    delete meta.id;
    delete meta.beatIds;
    return {
      id: m.id,
      title: m.name || m.title || 'Untitled mixtape',
      description: m.description || '',
      cover_url: m.cover || m.cover_url || '',
      archived: !!m.archived,
      created_at: safeDate(m.createdAt),
      metadata: meta
    };
  }
  function unpackMixtape(row, beatIds){
    const meta = row.metadata || {};
    return {
      ...meta,
      id: row.id,
      name: meta.name || row.title || 'Untitled mixtape',
      title: row.title || meta.name || 'Untitled mixtape',
      description: row.description || meta.description || '',
      cover: meta.cover || row.cover_url || null,
      cover_url: row.cover_url || meta.cover || '',
      archived: !!row.archived,
      beatIds: beatIds || meta.beatIds || [],
      createdAt: meta.createdAt || fromIso(row.created_at)
    };
  }

  async function selectAll(table){
    const { data, error } = await client().from(table).select('*');
    if(error) throw error;
    return data || [];
  }
  function idsFromRelations(rows, parentKey){
    const map = new Map();
    (rows || []).forEach(r => {
      const parent = r[parentKey];
      if(!parent) return;
      if(!map.has(parent)) map.set(parent, []);
      map.get(parent).push({ beatId: r.beat_id, position: Number(r.position || 0) });
    });
    for(const [k, list] of map.entries()){
      map.set(k, list.sort((a,b)=>a.position-b.position).map(x=>x.beatId));
    }
    return map;
  }

  async function pullFromSupabase({force=false}={}){
    const st = appState();
    if(!st || !client()) { say('Supabase er ikke konfigurert.', 'warning'); return false; }
    if(isPullingFromSupabase) return false;

    isPullingFromSupabase = true;
    say('Henter felles data fra Supabase...', 'info');
    try{
      const [beatsRows, albumRows, mixtapeRows, albumBeatRows, mixtapeBeatRows] = await Promise.all([
        selectAll('beats'), selectAll('albums'), selectAll('mixtapes'), selectAll('album_beats'), selectAll('mixtape_beats')
      ]);

      const remoteIsEmpty = !beatsRows.length && !albumRows.length && !mixtapeRows.length;
      const localHasData = (st.beats?.length || st.albums?.length || st.mixtapes?.length);
      if(remoteIsEmpty && localHasData && !force){
        say('Supabase er tom. Logg inn som admin og trykk «Migrer lokale data til Supabase».', 'warning');
        return false;
      }

      const albumMap = idsFromRelations(albumBeatRows, 'album_id');
      const mixtapeMap = idsFromRelations(mixtapeBeatRows, 'mixtape_id');

      st.beats = beatsRows.map(unpackBeat);
      st.albums = albumRows.map(r => unpackAlbum(r, albumMap.get(r.id) || []));
      st.mixtapes = mixtapeRows.map(r => unpackMixtape(r, mixtapeMap.get(r.id) || []));
      st.settings = st.settings || {};
      st.demos = st.demos || [];
      st.versions = st.versions || [];

      try { localStorage.setItem(SK, JSON.stringify(st)); } catch{}
      if(typeof renderAll === 'function') renderAll();
      say(`Synket fra Supabase: ${st.beats.length} beats, ${st.albums.length} albumer, ${st.mixtapes.length} mixtapes.`, 'success');
      return true;
    }catch(err){
      console.error('Supabase pull-feil:', err);
      const hint = /metadata/i.test(err.message || '')
        ? ' Mangler metadata-kolonne. Kjør SQL-en som står under Supabase sync-panelet.'
        : '';
      say(`Kunne ikke hente fra Supabase: ${err.message || err}.${hint}`, 'error');
      return false;
    }finally{
      isPullingFromSupabase = false;
    }
  }

  async function deleteMissingRows(table, currentIds){
    const { data, error } = await client().from(table).select('id');
    if(error) throw error;
    const keep = new Set(currentIds || []);
    const missing = (data || []).map(r=>r.id).filter(id=>!keep.has(id));
    for(const id of missing){
      const del = await client().from(table).delete().eq('id', id);
      if(del.error) throw del.error;
    }
  }
  async function syncRelations(table, parentKey, collections){
    const ids = (collections || []).map(c=>c.id).filter(Boolean);
    for(const id of ids){
      const del = await client().from(table).delete().eq(parentKey, id);
      if(del.error) throw del.error;
    }
    const rows = [];
    (collections || []).forEach(col => {
      uniq(col.beatIds || []).forEach((beatId, index) => rows.push({ [parentKey]: col.id, beat_id: beatId, position: index }));
    });
    if(rows.length){
      const ins = await client().from(table).insert(rows);
      if(ins.error) throw ins.error;
    }
  }

  async function pushToSupabase({manual=false}={}){
    const st = appState();
    if(!st || !client()) { say('Supabase er ikke konfigurert.', 'warning'); return false; }
    if(!window.isAdminMode){
      if(manual) say('Du må være innlogget som admin for å skrive til Supabase.', 'warning');
      return false;
    }
    if(isPullingFromSupabase) return false;

    say('Lagrer til Supabase...', 'info');
    try{
      const beats = (st.beats || []).map(packBeat);
      const albums = (st.albums || []).map(packAlbum);
      const mixtapes = (st.mixtapes || []).map(packMixtape);

      await deleteMissingRows('beats', beats.map(x=>x.id));
      await deleteMissingRows('albums', albums.map(x=>x.id));
      await deleteMissingRows('mixtapes', mixtapes.map(x=>x.id));

      if(beats.length){ const r = await client().from('beats').upsert(beats, { onConflict:'id' }); if(r.error) throw r.error; }
      if(albums.length){ const r = await client().from('albums').upsert(albums, { onConflict:'id' }); if(r.error) throw r.error; }
      if(mixtapes.length){ const r = await client().from('mixtapes').upsert(mixtapes, { onConflict:'id' }); if(r.error) throw r.error; }

      await syncRelations('album_beats', 'album_id', st.albums || []);
      await syncRelations('mixtape_beats', 'mixtape_id', st.mixtapes || []);

      lastPushAt = Date.now();
      say(`Lagret til Supabase ${new Date(lastPushAt).toLocaleTimeString()}.`, 'success');
      if(manual) toast('✓ Lokale data migrert til Supabase');
      return true;
    }catch(err){
      console.error('Supabase push-feil:', err);
      const hint = /metadata/i.test(err.message || '')
        ? ' Mangler metadata-kolonne. Kjør SQL-en som står under Supabase sync-panelet.'
        : '';
      say(`Kunne ikke lagre til Supabase: ${err.message || err}.${hint}`, 'error');
      return false;
    }
  }

  function schedulePush(){
    if(isPullingFromSupabase || !canWrite()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(()=>pushToSupabase(), 900);
  }

  function installSyncPanel(){
    if(document.getElementById('supabaseDataSyncPanel')) return;
    const parent = document.getElementById('supabaseAdminPanel') || document.querySelector('#integrationsTab .content-panel') || document.body;
    parent.insertAdjacentHTML('afterend', `
      <div id="supabaseDataSyncPanel" class="settings-card supabase-sync-card">
        <h2>☁️ Supabase sync</h2>
        <p class="hint">Felles database for beats, albumer, mixtapes, arkivstatus og metadata. Lydfilene kan fortsatt ligge i Google Drive.</p>
        <div class="sync-actions">
          <button class="primary-btn" id="pullSupabaseBtn">Hent fra Supabase</button>
          <button class="ghost-btn" id="pushSupabaseBtn">Migrer lokale data til Supabase</button>
        </div>
        <p id="supabaseSyncStatus" class="hint sync-status">Ikke synket ennå.</p>
        <details class="hint" style="margin-top:10px">
          <summary>SQL hvis du får metadata-feil</summary>
          <pre style="white-space:pre-wrap;background:rgba(0,0,0,.25);padding:10px;border-radius:10px;margin-top:8px">alter table public.beats add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.albums add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.mixtapes add column if not exists metadata jsonb default '{}'::jsonb;</pre>
        </details>
      </div>
    `);
    if(!document.getElementById('supabaseDataSyncStyle')){
      const style = document.createElement('style');
      style.id = 'supabaseDataSyncStyle';
      style.textContent = `
        .supabase-sync-card{margin-bottom:14px;border:1px solid rgba(96,165,250,.18)!important;background:rgba(96,165,250,.055)!important}
        .sync-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
        .sync-status{min-height:18px;margin-top:10px}
        .sync-status[data-type="success"]{color:#34d399}.sync-status[data-type="warning"]{color:#fbbf24}.sync-status[data-type="error"]{color:#fb7185}
      `;
      document.head.appendChild(style);
    }
    document.getElementById('pullSupabaseBtn')?.addEventListener('click',()=>pullFromSupabase({force:false}));
    document.getElementById('pushSupabaseBtn')?.addEventListener('click',()=>pushToSupabase({manual:true}));
  }

  // Overstyr saveState slik at eksisterende knapper fortsatt fungerer, men også synker til Supabase.
  const originalSaveState = saveState;
  saveState = function(){
    originalSaveState();
    schedulePush();
  };

  // Etter admin-sjekk: oppdater sync-panelet og aktiver push når admin er innlogget.
  if(typeof updateAdminUi === 'function'){
    const originalUpdateAdminUi = updateAdminUi;
    updateAdminUi = async function(){
      await originalUpdateAdminUi();
      installSyncPanel();
      const btn = document.getElementById('pushSupabaseBtn');
      if(btn) btn.disabled = !window.isAdminMode;
    };
    window.updateAdminUi = updateAdminUi;
  }

  window.mvSupabaseSync = {
    pull: pullFromSupabase,
    push: pushToSupabase,
    schedulePush,
    isReady: () => !!client()
  };

  installSyncPanel();
  setTimeout(()=>pullFromSupabase(), 800);
})();
