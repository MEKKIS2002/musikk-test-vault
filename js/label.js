// === label.js ===
// Label dashboard — sidebar + detaljpanel (Versjon C)
// Kun synlig for brukere med package = 'label'

(function(){
  'use strict';

  const SB_URL = 'https://ylvqkfdvijqnecuqznyr.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdnFrZmR2aWpxbmVjdXF6bnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzA4MzIsImV4cCI6MjA5MzkwNjgzMn0.bYPTaxQK8n7I7w5Ri2DVYW5_LbFHg2IXkuhHsLTDDqc';

  function sbH(token){
    const t = token || SB_KEY;
    return {'apikey':SB_KEY,'Authorization':'Bearer '+t,'Content-Type':'application/json'};
  }

  async function getToken(){
    const {data:{session}} = await window.supabaseClient.auth.getSession();
    return session?.access_token || SB_KEY;
  }

  async function getUid(){
    return window._mvCurrentUserId || sessionStorage.getItem('mv_user_id');
  }

  // ── Installer label-tab ─────────────────────────────────────────────────
  function installLabelTab(){
    const pkg = sessionStorage.getItem('mv_package');
    if(pkg !== 'label' && pkg !== 'admin') return;

    // Vis tab-knappen
    const tabBtn = document.querySelector('.tab-btn[data-tab="label"]');
    if(tabBtn) tabBtn.style.display = '';

    // Fyll tab-seksjonen med innhold
    const section = document.getElementById('labelTab');
    if(section && !section.querySelector('.label-dashboard')){
      section.innerHTML = buildDashboardShell();
    }

    installLabelStyles();
    console.log('[Label] Dashboard installert for', pkg);
  }

  function buildDashboardShell(){
    return `
    <div class="label-dashboard">
      <div class="label-topbar">
        <div class="label-topbar-left">
          <span class="label-icon">🏷</span>
          <span id="labelName" class="label-title">Label</span>
        </div>
        <button class="ghost-btn label-invite-btn" onclick="window.labelOpenInvite()">
          + Inviter artist
        </button>
      </div>

      <div class="label-body">
        <!-- Sidebar -->
        <div class="label-sidebar" id="labelSidebar">
          <div class="label-sidebar-hd">Artister</div>
          <div id="labelArtistList"><div class="label-loading">Laster...</div></div>
        </div>

        <!-- Detail pane -->
        <div class="label-detail" id="labelDetail">
          <div class="label-detail-empty">
            <div style="font-size:32px;margin-bottom:8px">👈</div>
            <div>Velg en artist fra listen</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite modal -->
    <div id="labelInviteModal" style="display:none;position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
      <div style="background:#1a1612;border:1px solid rgba(255,255,255,.12);max-width:400px;width:90%;padding:28px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="font-size:16px;font-weight:800;margin:0">Inviter artist</h2>
          <button onclick="window.labelCloseInvite()" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:20px;cursor:pointer;line-height:1">×</button>
        </div>
        <input id="labelInviteUsername" placeholder="Brukernavn" 
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:none;border-bottom:2px solid rgba(244,164,67,.3);color:#f4ede4;padding:10px 12px;font-size:14px;font-family:system-ui;outline:none;margin-bottom:12px"
          onfocus="this.style.borderBottomColor='rgba(244,164,67,.8)'"
          onblur="this.style.borderBottomColor='rgba(244,164,67,.3)'"
        />
        <button onclick="window.labelSendInvite()" style="width:100%;background:linear-gradient(135deg,#f4a443,#cb6e1a);border:none;color:#000;font-size:14px;font-weight:900;padding:12px;cursor:pointer;font-family:system-ui;letter-spacing:.06em;text-transform:uppercase">Send invitasjon</button>
        <div id="labelInviteStatus" style="font-size:12px;text-align:center;margin-top:10px;min-height:16px;font-family:system-ui;color:rgba(255,255,255,.5)"></div>
      </div>
    </div>`;
  }

  function installLabelStyles(){
    if(document.getElementById('label-css')) return;
    const s = document.createElement('style');
    s.id = 'label-css';
    s.textContent = `
.label-dashboard { display:flex;flex-direction:column;height:100%;min-height:600px;font-family:system-ui }
.label-topbar { display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.08) }
.label-topbar-left { display:flex;align-items:center;gap:10px }
.label-icon { font-size:18px }
.label-title { font-size:16px;font-weight:800;color:#f4ede4;letter-spacing:-.02em }
.label-invite-btn { font-size:12px !important;padding:7px 14px !important }
.label-body { display:flex;flex:1;min-height:0 }

/* Sidebar */
.label-sidebar { width:200px;flex-shrink:0;border-right:1px solid rgba(255,255,255,.08);overflow-y:auto }
.label-sidebar-hd { font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.35);padding:14px 16px 8px }
.label-artist-row { display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;transition:background .12s;border-left:3px solid transparent }
.label-artist-row:hover { background:rgba(255,255,255,.04) }
.label-artist-row.active { background:rgba(244,164,67,.08);border-left-color:#f4a443 }
.label-avatar { width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0 }
.label-artist-name { font-size:13px;font-weight:700;color:#f4ede4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis }
.label-artist-sub { font-size:10px;color:rgba(255,255,255,.4) }
.label-pending-row { display:flex;align-items:center;gap:10px;padding:9px 16px;opacity:.5 }

/* Detail pane */
.label-detail { flex:1;min-width:0;overflow-y:auto;padding:20px }
.label-detail-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;color:rgba(255,255,255,.3);font-size:13px;text-align:center }
.label-detail-header { display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.08) }
.label-detail-avatar { width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;flex-shrink:0 }
.label-detail-name { font-size:18px;font-weight:900;color:#f4ede4;letter-spacing:-.03em;margin-bottom:2px }
.label-detail-meta { font-size:12px;color:rgba(255,255,255,.4) }
.label-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px }
.label-stat { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);padding:12px;text-align:center }
.label-stat-n { font-size:22px;font-weight:900;color:#f4ede4;letter-spacing:-.04em;line-height:1 }
.label-stat-l { font-size:10px;color:rgba(255,255,255,.4);margin-top:3px;text-transform:uppercase;letter-spacing:.1em }
.label-section-hd { font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:10px }
.label-album-row { display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05) }
.label-album-row:last-child { border-bottom:none }
.label-album-cover { width:38px;height:38px;flex-shrink:0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:16px }
.label-album-name { font-size:13px;font-weight:700;color:#f4ede4;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis }
.label-album-meta { font-size:11px;color:rgba(255,255,255,.4);margin-top:1px }
.label-progress { height:3px;background:rgba(255,255,255,.1);overflow:hidden;min-width:60px }
.label-progress-fill { height:100%;background:#f4a443 }
.label-badge { display:inline-block;font-size:10px;font-weight:800;padding:2px 7px;letter-spacing:.04em }
.badge-master { background:rgba(244,164,67,.15);color:#f4a443 }
.badge-ferdig { background:rgba(52,211,153,.15);color:#34d399 }
.badge-skriving { background:rgba(96,165,250,.15);color:#60a5fa }
.badge-ide { background:rgba(168,85,247,.15);color:#a855f7 }
.badge-mixing { background:rgba(249,115,22,.15);color:#f97316 }
.label-loading { padding:20px 16px;font-size:12px;color:rgba(255,255,255,.4);text-align:center }
.label-empty { padding:20px 16px;font-size:12px;color:rgba(255,255,255,.4);text-align:center }
    `;
    document.head.appendChild(s);
  }

  // ── Hent og render artistliste ──────────────────────────────────────────
  async function loadArtists(){
    const uid = await getUid();
    const token = await getToken();

    // Hent label_artists rader
    const res = await fetch(
      `${SB_URL}/rest/v1/label_artists?label_id=eq.${uid}&select=*&order=invited_at.desc`,
      {headers: sbH(token)}
    );
    if(!res.ok) return [];
    const rows = await res.json();

    // Hent profiler for alle artister
    const artistIds = rows.filter(r=>r.artist_id).map(r=>r.artist_id);
    let profiles = {};
    if(artistIds.length){
      const pr = await fetch(
        `${SB_URL}/rest/v1/profiles?id=in.(${artistIds.join(',')})&select=id,username,email,package`,
        {headers: sbH(token)}
      );
      if(pr.ok){
        const pdata = await pr.json();
        pdata.forEach(p => profiles[p.id] = p);
      }
    }

    return rows.map(r => ({...r, profile: profiles[r.artist_id] || null}));
  }

  const AVATAR_COLORS = [
    {bg:'rgba(244,164,67,.18)',color:'#f4a443'},
    {bg:'rgba(96,165,250,.18)',color:'#60a5fa'},
    {bg:'rgba(52,211,153,.18)',color:'#34d399'},
    {bg:'rgba(168,85,247,.18)',color:'#a855f7'},
    {bg:'rgba(249,115,22,.18)',color:'#f97316'},
  ];

  function avatarColor(i){ return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

  async function renderArtistList(){
    const list = document.getElementById('labelArtistList');
    if(!list) return;
    list.innerHTML = '<div class="label-loading">Laster artister...</div>';

    const artists = await loadArtists();
    window._labelArtists = artists;

    // Hent label-navn
    const uid = await getUid();
    const token = await getToken();
    const lpRes = await fetch(`${SB_URL}/rest/v1/label_profiles?id=eq.${uid}&select=name`, {headers:sbH(token)});
    if(lpRes.ok){
      const lp = await lpRes.json();
      const nameEl = document.getElementById('labelName');
      if(nameEl && lp[0]?.name) nameEl.textContent = lp[0].name;
      else if(nameEl){
        const profile = window._labelProfile;
        if(!profile){
          const pRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${uid}&select=username`, {headers:sbH(token)});
          if(pRes.ok){ const pd = await pRes.json(); if(nameEl && pd[0]) nameEl.textContent = pd[0].username; }
        }
      }
    }

    if(!artists.length){
      list.innerHTML = '<div class="label-empty">Ingen artister ennå.<br>Inviter din første artist.</div>';
      return;
    }

    const accepted = artists.filter(a => a.status === 'accepted');
    const pending  = artists.filter(a => a.status === 'invited' || a.status === 'pending');
    const left     = artists.filter(a => a.status === 'left' && a.access_expires_at && new Date(a.access_expires_at) > new Date());

    let html = '';

    accepted.forEach((a, i) => {
      const name = a.profile?.username || a.artist_id?.slice(0,8) || '?';
      const initials = name.slice(0,2).toUpperCase();
      const col = avatarColor(i);
      html += `<div class="label-artist-row" data-id="${a.artist_id}" onclick="window.labelSelectArtist('${a.artist_id}')">
        <div class="label-avatar" style="background:${col.bg};color:${col.color}">${initials}</div>
        <div style="min-width:0">
          <div class="label-artist-name">${name}</div>
          <div class="label-artist-sub">Aktiv</div>
        </div>
      </div>`;
    });

    if(pending.length){
      html += `<div class="label-sidebar-hd" style="margin-top:8px">Venter</div>`;
      pending.forEach(a => {
        const name = a.profile?.username || 'Ukjent';
        html += `<div class="label-pending-row">
          <div class="label-avatar" style="background:rgba(255,255,255,.06);color:rgba(255,255,255,.4)">?</div>
          <div style="min-width:0">
            <div class="label-artist-name">${name}</div>
            <div class="label-artist-sub">Invitert</div>
          </div>
        </div>`;
      });
    }

    if(left.length){
      html += `<div class="label-sidebar-hd" style="margin-top:8px">Forlatt</div>`;
      left.forEach(a => {
        const name = a.profile?.username || 'Ukjent';
        const daysLeft = Math.ceil((new Date(a.access_expires_at) - new Date()) / (1000*60*60*24));
        html += `<div class="label-pending-row" style="opacity:.6">
          <div class="label-avatar" style="background:rgba(251,113,133,.1);color:rgba(251,113,133,.5)">✕</div>
          <div style="min-width:0">
            <div class="label-artist-name">${name}</div>
            <div class="label-artist-sub" style="color:rgba(251,113,133,.5)">${daysLeft}d tilgang igjen</div>
          </div>
        </div>`;
      });
    }

    list.innerHTML = html;

    // Auto-velg første accepted artist
    if(accepted.length) window.labelSelectArtist(accepted[0].artist_id);
  }

  // ── Artistdetalj ────────────────────────────────────────────────────────
  window.labelSelectArtist = async function(artistId){
    // Marker aktiv i sidebar
    document.querySelectorAll('.label-artist-row').forEach(r => {
      r.classList.toggle('active', r.dataset.id === artistId);
    });

    const detail = document.getElementById('labelDetail');
    if(!detail) return;
    detail.innerHTML = '<div class="label-detail-empty"><div class="label-loading">Laster artistdata...</div></div>';

    const token = await getToken();

    // Hent beats, albums, mixtapes for artisten
    const [beatsRes, albumsRes, mixtapesRes, profileRes] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/beats?owner_id=eq.${artistId}&archived=eq.false&select=id,title,metadata`, {headers:sbH(token)}),
      fetch(`${SB_URL}/rest/v1/albums?owner_id=eq.${artistId}&archived=eq.false&select=*`, {headers:sbH(token)}),
      fetch(`${SB_URL}/rest/v1/mixtapes?owner_id=eq.${artistId}&archived=eq.false&select=id,title,metadata`, {headers:sbH(token)}),
      fetch(`${SB_URL}/rest/v1/profiles?id=eq.${artistId}&select=id,username,email,package`, {headers:sbH(token)})
    ]);

    const beats    = beatsRes.ok    ? await beatsRes.json()    : [];
    const albums   = albumsRes.ok   ? await albumsRes.json()   : [];
    const mixtapes = mixtapesRes.ok ? await mixtapesRes.json() : [];
    const profiles = profileRes.ok  ? await profileRes.json()  : [];
    const profile  = profiles[0] || {};

    const name = profile.username || artistId.slice(0,8);
    const initials = name.slice(0,2).toUpperCase();
    const idx = (window._labelArtists||[]).findIndex(a=>a.artist_id===artistId);
    const col = avatarColor(idx >= 0 ? idx : 0);

    // Beregn snitt ferdigstillelse
    const doneVals = beats.map(b => Number((b.metadata||{}).done || 0));
    const avgDone = doneVals.length ? Math.round(doneVals.reduce((a,b)=>a+b,0)/doneVals.length) : 0;

    // Badge per album
    const statusBadge = (status) => {
      const map = {
        'Master':'badge-master','Ferdig':'badge-ferdig','Mixing':'badge-mixing',
        'Innspilling':'badge-mixing','Skriving':'badge-skriving','Idé':'badge-ide'
      };
      return `<span class="label-badge ${map[status]||'badge-ide'}">${status||'Idé'}</span>`;
    };

    const albumRows = albums.map(a => {
      const meta = a.metadata || {};
      const done = Number(meta.done || 0);
      const status = meta.status || a.status || 'Idé';
      const cover = meta.cover || '';
      const beatCount = (a.beat_ids || meta.beatIds || []).length;
      return `<div class="label-album-row">
        <div class="label-album-cover">${cover ? `<img src="${cover}" style="width:100%;height:100%;object-fit:cover">` : '🎵'}</div>
        <div style="flex:1;min-width:0">
          <div class="label-album-name">${a.title || meta.name || 'Untitled'}</div>
          <div class="label-album-meta">${beatCount} sanger</div>
        </div>
        <div style="min-width:80px">
          <div class="label-progress"><div class="label-progress-fill" style="width:${done}%"></div></div>
          <div style="font-size:10px;color:rgba(255,255,255,.4);margin-top:2px;text-align:right">${done}%</div>
        </div>
        ${statusBadge(status)}
      </div>`;
    }).join('');

    detail.innerHTML = `
      <div class="label-detail-header">
        <div class="label-detail-avatar" style="background:${col.bg};color:${col.color}">${initials}</div>
        <div style="flex:1;min-width:0">
          <div class="label-detail-name">${name}</div>
          <div class="label-detail-meta">${profile.email || ''}</div>
        </div>
        <button class="ghost-btn" style="font-size:12px" onclick="window.labelPitchArtist('${artistId}')">📄 Pitch</button>
        <button class="ghost-btn" style="font-size:12px;color:rgba(251,113,133,.7)" onclick="window.labelRemoveArtist('${artistId}','${name}')">✕ Fjern</button>
      </div>

      <div class="label-stats">
        <div class="label-stat"><div class="label-stat-n">${albums.length}</div><div class="label-stat-l">Albumer</div></div>
        <div class="label-stat"><div class="label-stat-n">${mixtapes.length}</div><div class="label-stat-l">Mixtapes</div></div>
        <div class="label-stat"><div class="label-stat-n">${beats.length}</div><div class="label-stat-l">Sanger</div></div>
      </div>

      ${avgDone > 0 ? `
      <div style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.1em">Snitt ferdigstillelse</span>
          <span style="font-size:11px;color:#f4a443;font-weight:800">${avgDone}%</span>
        </div>
        <div class="label-progress" style="height:5px"><div class="label-progress-fill" style="width:${avgDone}%"></div></div>
      </div>` : ''}

      ${albums.length ? `
      <div class="label-section-hd">Albumer</div>
      <div style="margin-bottom:20px">${albumRows}</div>` : '<div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:16px">Ingen albumer ennå.</div>'}

      ${mixtapes.length ? `
      <div class="label-section-hd">Mixtapes</div>
      <div>${mixtapes.map(m=>{
        const meta = m.metadata||{};
        return `<div class="label-album-row">
          <div class="label-album-cover">📼</div>
          <div class="label-album-name">${m.title||meta.name||'Untitled'}</div>
        </div>`;
      }).join('')}</div>` : ''}
    `;
  };

  // ── Inviter artist ──────────────────────────────────────────────────────
  window.labelOpenInvite = function(){
    const m = document.getElementById('labelInviteModal');
    if(m){ m.style.display='flex'; document.getElementById('labelInviteUsername')?.focus(); }
  };

  window.labelCloseInvite = function(){
    const m = document.getElementById('labelInviteModal');
    if(m) m.style.display='none';
    const st = document.getElementById('labelInviteStatus');
    if(st) st.textContent='';
  };

  window.labelSendInvite = async function(){
    const username = document.getElementById('labelInviteUsername')?.value?.trim().toLowerCase();
    const status   = document.getElementById('labelInviteStatus');
    if(!username){ if(status) status.textContent='Skriv inn et brukernavn.'; return; }

    const token = await getToken();
    const uid   = await getUid();

    // Finn artist via brukernavn
    const pr = await fetch(
      `${SB_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id,username`,
      {headers: sbH(token)}
    );
    const profiles = pr.ok ? await pr.json() : [];
    if(!profiles.length){ if(status){ status.style.color='#fb7185'; status.textContent=`Finner ingen bruker med brukernavn "${username}".`; } return; }
    const artistId = profiles[0].id;
    if(artistId === uid){ if(status){ status.style.color='#fb7185'; status.textContent='Du kan ikke invitere deg selv.'; } return; }

    // Hent label-navn
    const lnRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${uid}&select=username`, {headers:sbH(token)});
    const lnData = lnRes.ok ? await lnRes.json() : [];
    const labelName = lnData[0]?.username || 'Et label';

    // Opprett label_artists rad
    const ir = await fetch(`${SB_URL}/rest/v1/label_artists`, {
      method:'POST',
      headers:{...sbH(token),'Prefer':'resolution=merge-duplicates'},
      body: JSON.stringify({
        label_id: uid,
        artist_id: artistId,
        status: 'invited',
        invited_by: uid,
        label_name: labelName,
        invited_at: new Date().toISOString()
      })
    });
    if(!ir.ok){ if(status){ status.style.color='#fb7185'; status.textContent='Noe gikk galt. Prøv igjen.'; } return; }

    // Send varsel til artisten
    await fetch(`${SB_URL}/rest/v1/notifications`, {
      method:'POST',
      headers:{...sbH(token),'Prefer':'return=minimal'},
      body: JSON.stringify({
        recipient_id: artistId,
        sender_id: uid,
        type: 'label_invite',
        content_id: uid,
        content_name: labelName,
        role: 'artist',
        read: false
      })
    });

    if(status){ status.style.color='#34d399'; status.textContent=`✓ Invitasjon sendt til ${username}.`; }
    document.getElementById('labelInviteUsername').value = '';
    setTimeout(()=>{ window.labelCloseInvite(); renderArtistList(); }, 1500);
  };

  // ── Fjern artist ────────────────────────────────────────────────────────
  window.labelRemoveArtist = async function(artistId, name){
    if(!confirm(`Fjerne ${name} fra labelen?`)) return;
    const token = await getToken();
    const uid   = await getUid();
    await fetch(
      `${SB_URL}/rest/v1/label_artists?label_id=eq.${uid}&artist_id=eq.${artistId}`,
      {method:'DELETE', headers:{...sbH(token),'Prefer':'return=minimal'}}
    );
    if(typeof window.showToast==='function') window.showToast(`✓ ${name} fjernet fra labelen`);
    renderArtistList();
    const detail = document.getElementById('labelDetail');
    if(detail) detail.innerHTML = '<div class="label-detail-empty"><div>Velg en artist fra listen</div></div>';
  };

  // ── Pitch for artist ────────────────────────────────────────────────────
  window.labelPitchArtist = function(artistId){
    if(typeof window.showToast==='function') window.showToast('Pitch-funksjon kommer snart');
  };

  // ── Håndter label-invitasjon i varsel-panelet ───────────────────────────
  // Patch openNotifPanel til å vise aksepter/avslå på label_invite-varsler
  const _origOpenNotif = window.openNotifPanel;
  window.openNotifPanel = function(){
    if(_origOpenNotif) _origOpenNotif();
    // Gi litt tid til panelet å rendres, så patcher vi label_invite-varsler
    setTimeout(patchLabelInviteNotifs, 100);
  };

  function patchLabelInviteNotifs(){
    const panel = document.getElementById('mvNotifPanel');
    if(!panel) return;
    const notifs = window._mvNotifications || [];
    notifs.forEach((n, i) => {
      if(n.type !== 'label_invite' || n._patched) return;
      // Finn det i-te notif-kortet
      const cards = panel.querySelectorAll('[style*="padding:12px"]');
      const card = cards[i];
      if(!card) return;
      n._patched = true;
      if(!n.read) {
        const actDiv = document.createElement('div');
        actDiv.style.cssText = 'display:flex;gap:8px;margin-top:8px';
        actDiv.innerHTML = `
          <button onclick="window.labelRespondInvite('${n.content_id}','${n.id}',true)" style="background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.3);color:#34d399;font-size:11px;font-weight:800;padding:4px 12px;cursor:pointer;font-family:system-ui">✓ Aksepter</button>
          <button onclick="window.labelRespondInvite('${n.content_id}','${n.id}',false)" style="background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.3);color:#fb7185;font-size:11px;font-weight:800;padding:4px 12px;cursor:pointer;font-family:system-ui">✕ Avslå</button>
        `;
        card.appendChild(actDiv);
      }
    });
  }

  window.labelRespondInvite = async function(labelId, notifId, accept){
    const token = await getToken();
    const uid   = await getUid();

    if(accept){
      await fetch(
        `${SB_URL}/rest/v1/label_artists?label_id=eq.${labelId}&artist_id=eq.${uid}`,
        {method:'PATCH', headers:{...sbH(token),'Prefer':'return=minimal'},
         body: JSON.stringify({status:'accepted', accepted_at: new Date().toISOString()})}
      );
      if(typeof window.showToast==='function') window.showToast('✓ Du er nå del av labelen!');
    } else {
      await fetch(
        `${SB_URL}/rest/v1/label_artists?label_id=eq.${labelId}&artist_id=eq.${uid}`,
        {method:'DELETE', headers:{...sbH(token),'Prefer':'return=minimal'}}
      );
      if(typeof window.showToast==='function') window.showToast('Invitasjon avslått.');
    }

    // Slett varselet etter svar
    await fetch(`${SB_URL}/rest/v1/notifications?id=eq.${notifId}&recipient_id=eq.${uid}`,
      {method:'DELETE', headers:{...sbH(token),'Prefer':'return=minimal'}}
    );

    // Oppdater lokal cache og lukk panel
    if(window._mvNotifications){
      window._mvNotifications = window._mvNotifications.filter(n=>n.id!=notifId);
    }
    const panel = document.getElementById('mvNotifPanel');
    if(panel) panel.style.display='none';
    if(typeof window.loadNotifications==='function') window.loadNotifications();

    // Vis "Del av label"-banner for artisten etter aksept
    if(accept) installLabelBanner(labelId);
  };

  // ── Oppdater varsel-typeLabels til å inkludere label_invite ─────────────
  // (label.js lastes etter app.js, så vi patcher direkte)
  const _origOpenNotif2 = window.openNotifPanel;

  // ── Label-tilhørighet for artister ──────────────────────────────────────
  async function installLabelBanner(labelId){
    // Ikke vis banner — bruk gear-menyen istedenfor
    const token = await getToken();
    const res = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${labelId}&select=username`, {headers:sbH(token)});
    const data = res.ok ? await res.json() : [];
    const labelName = data[0]?.username || 'Et label';

    // Cache for gear-menyen
    window._mvCurrentLabelId   = labelId;
    window._mvCurrentLabelName = labelName;

    // Oppdater gear-meny
    if(typeof window.mvUpdateGearMenu === 'function') window.mvUpdateGearMenu(labelId, labelName);
    else setTimeout(()=>{ if(typeof window.mvUpdateGearMenu==='function') window.mvUpdateGearMenu(labelId, labelName); }, 1000);
  }

  window.leaveLabel = async function(labelId, labelName){
    if(!confirm(`Forlate ${labelName}?\n\nLabelen vil beholde visningstilgang til innholdet ditt i 14 dager.`)) return;

    const token = await getToken();
    const uid   = await getUid();
    const expiresAt = new Date(Date.now() + 14*24*60*60*1000).toISOString();

    // Oppdater label_artists
    await fetch(
      `${SB_URL}/rest/v1/label_artists?label_id=eq.${labelId}&artist_id=eq.${uid}`,
      {method:'PATCH', headers:{...sbH(token),'Prefer':'return=minimal'},
       body: JSON.stringify({
         status: 'left',
         ended_at: new Date().toISOString(),
         access_expires_at: expiresAt
       })
      }
    );

    // Send varsel til label
    const prRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${uid}&select=username`, {headers:sbH(token)});
    const prData = prRes.ok ? await prRes.json() : [];
    const artistName = prData[0]?.username || 'En artist';

    await fetch(`${SB_URL}/rest/v1/notifications`, {
      method:'POST',
      headers:{...sbH(token),'Prefer':'return=minimal'},
      body: JSON.stringify({
        recipient_id: labelId,
        sender_id: uid,
        type: 'label_left',
        content_id: uid,
        content_name: artistName,
        role: 'artist',
        read: false
      })
    });

    // Fjern "Forlat label" fra gear-menyen
    const item = document.getElementById('mvGearLabelItem');
    if(item) item.style.display = 'none';
    window._mvCurrentLabelId = null;
    window._mvCurrentLabelName = null;
    if(typeof window.showToast==='function') window.showToast(`Du har forlatt ${labelName}. De beholder visningstilgang i 14 dager.`);
  };

  // Sjekk om bruker allerede er i et label ved innlogging
  async function checkExistingLabelMembership(){
    const uid = await getUid();
    if(!uid) return;
    const pkg = sessionStorage.getItem('mv_package');
    if(pkg === 'label') return; // label-bruker trenger ikke banner

    const token = await getToken();
    const res = await fetch(
      `${SB_URL}/rest/v1/label_artists?artist_id=eq.${uid}&status=eq.accepted&select=label_id`,
      {headers:sbH(token)}
    );
    if(!res.ok) return;
    const rows = await res.json();
    if(rows.length) installLabelBanner(rows[0].label_id);
  }

  // ── Installer når label-tab åpnes ───────────────────────────────────────
  document.addEventListener('click', e => {
    if(e.target.closest('.tab-btn[data-tab="label"]')){
      setTimeout(renderArtistList, 80);
    }
  });

  // ── Installer ved oppstart ──────────────────────────────────────────────
  function tryInstall(){
    const pkg = sessionStorage.getItem('mv_package');
    if(pkg === 'label' || pkg === 'admin'){
      installLabelTab();
    }
  }

  if(document.readyState !== 'loading') setTimeout(tryInstall, 600);
  else document.addEventListener('DOMContentLoaded', ()=>setTimeout(tryInstall, 600));

  // Sjekk eksisterende label-medlemskap for artister
  setTimeout(checkExistingLabelMembership, 1500);

  // Eksponér for å trigges etter innlogging
  window.installLabelDashboard = installLabelTab;
  window.labelRenderArtistList = renderArtistList;

})();
