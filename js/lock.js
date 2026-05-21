// === main-script-0 ===
if(history.scrollRestoration) history.scrollRestoration = 'manual';

// ── Username → Supabase email mapping ──────────────────────────────────────
// Legg til nye brukere her: { brukernavn: 'epost@example.com' }
const USERNAME_MAP = {
  'marcus':   'marcus.aas.mekiassen@gmail.com',
  'erik':     'erikalfsen11@gmail.com',
  // ── Testbrukere per pakke ─────────────────────────────────────
  'artist':   'artist@test.no',
  'producer': 'producer@test.no',
  'lyricist': 'lyricist@test.no',
  'label':    'label@test.no',
  'viewer':   'viewer@test.no',
};
// ───────────────────────────────────────────────────────────────────────────

function getUserRole(){return sessionStorage.getItem('mv_role')||'';}
function isProducerUser(){return getUserRole()==='producer';}
function isViewerUser(){return getUserRole()==='viewer';}

function applyRoleMode(){
  const role = getUserRole();
  const isViewer = role === 'viewer';
  const isProducer = role === 'producer';

  document.body.classList.toggle('producer-mode', isProducer);
  document.body.classList.toggle('viewer-mode', isViewer);

  const viewerBtn = document.getElementById('viewerLoginBtn');
  if(viewerBtn) viewerBtn.style.display = isViewer ? 'flex' : 'none';

  const badge = document.getElementById('roleBadge');
  if(badge) badge.style.display = isViewer ? 'none' : '';

  // Pakke-systemet håndterer tab-synlighet for innloggede pakke-brukere
  if(typeof window.applyPackage === 'function'){
    window.applyPackage();
    return;
  }

  // Fallback for viewer/producer uten pakke-system
  if(isViewer){
    document.querySelectorAll('.tab-btn').forEach(b=>{
      const tab = b.dataset.tab;
      b.style.display = (tab === 'beats' || tab === 'mixtapes') ? '' : 'none';
    });
    document.querySelectorAll('.tab-view').forEach(v=>v.classList.add('hidden'));
    const mix = document.getElementById('mixtapesTab');
    if(mix){ mix.classList.remove('hidden'); }
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab==='mixtapes'));
  } else if(isProducer){
    const active=document.querySelector('.tab-btn.active');
    const activeTab=active?.dataset?.tab||'mixtapes';
    const allowed=['mixtapes','pipeline','beats'];
    const target=allowed.includes(activeTab)?activeTab:'mixtapes';
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===target));
    document.querySelectorAll('.tab-view').forEach(v=>v.classList.add('hidden'));
    const view=document.getElementById(`${target}Tab`);if(view)view.classList.remove('hidden');
  }
}

function returnToPasswordScreen(){
  sessionStorage.removeItem('mv_unlocked');
  sessionStorage.removeItem('mv_role');
  sessionStorage.removeItem('mv_package');
  sessionStorage.removeItem('mv_username');
  document.body.classList.remove('producer-mode','viewer-mode','admin-mode');
  Object.keys(window.MV_PACKAGES||{}).forEach(k=>document.body.classList.remove('pkg-'+k));
  document.querySelectorAll('.tab-btn').forEach(b=>b.style.display='');
  const vBtn = document.getElementById('viewerLoginBtn');
  if(vBtn) vBtn.style.display = 'none';
  const lock=document.getElementById('lockScreen');
  if(lock)lock.style.display='flex';
  setTimeout(()=>document.getElementById('adminUsername')?.focus(),60);
}

function unlockAs(role){
  sessionStorage.setItem('mv_unlocked','1');
  sessionStorage.setItem('mv_role',role);
  const lock = document.getElementById('lockScreen');
  if(lock) lock.style.display='none';
  if(role === 'admin'){
    window.isAdminMode = true;
    document.body.classList.add('admin-mode');
  } else {
    window.isAdminMode = false;
    document.body.classList.remove('admin-mode');
  }
  applyRoleMode();
}

function loginViewer(){
  unlockAs('viewer');
}

function switchLockTab(tab){
  const adminCard   = document.getElementById('lockCardAdmin');
  const viewerCard  = document.getElementById('lockCardViewer');
  const adminBtn    = document.getElementById('lockTabAdmin');
  const viewerBtn   = document.getElementById('lockTabViewer');
  const active = 'background:linear-gradient(135deg,#f4a443,#cb6e1a);color:#fff;';
  const inactive = 'background:transparent;color:#aaa4bd;';
  if(tab==='admin'){
    adminCard.style.display='grid';
    viewerCard.style.display='none';
    if(adminBtn) adminBtn.style.cssText += active;
    if(viewerBtn) viewerBtn.style.cssText += inactive;
    document.getElementById('adminUsername')?.focus();
  } else {
    adminCard.style.display='none';
    viewerCard.style.display='grid';
    if(viewerBtn) viewerBtn.style.cssText += active;
    if(adminBtn) adminBtn.style.cssText += inactive;
  }
}

// ── Innlogging med brukernavn ─────────────────────────────────────────────
async function loginWithUsername(){
  const username = (document.getElementById('adminUsername')?.value||'').trim().toLowerCase();
  const password = document.getElementById('adminPassword')?.value||'';
  const errEl = document.getElementById('lockError');
  const btn = document.getElementById('lockLoginBtn');

  if(!username || !password){
    if(errEl){errEl.textContent='Fyll inn brukernavn og passord.';errEl.style.display='block';}
    return;
  }

  const email = USERNAME_MAP[username];
  if(!email){
    if(errEl){errEl.textContent='Ukjent brukernavn.';errEl.style.display='block';}
    return;
  }

  if(btn){btn.disabled=true;btn.textContent='Logger inn...';}
  if(errEl){errEl.style.display='none';}

  try {
    if(!window.supabaseClient){
      if(errEl){errEl.textContent='Supabase ikke konfigurert.';errEl.style.display='block';}
      return;
    }

    const {data, error} = await window.supabaseClient.auth.signInWithPassword({email, password});
    if(error) throw error;

    // Hent rolle OG pakke fra profiles
    const {data: profile} = await window.supabaseClient
      .from('profiles')
      .select('role, package')
      .eq('id', data.user.id)
      .maybeSingle();

    const role = profile?.role || 'user';
    const pkg  = profile?.package || (role === 'admin' ? 'admin' : 'viewer');

    // Lagre i sessionStorage
    sessionStorage.setItem('mv_username', username);
    sessionStorage.setItem('mv_package', pkg);

    if(role === 'admin'){
      // Full admin-tilgang
      window.isAdminMode = true;
      window.currentAdminUser = data.user;
      document.body.classList.add('admin-mode');
      unlockAs('admin');
      if(typeof window.mvSupabaseSync?.pull === 'function') window.mvSupabaseSync.pull();
      if(typeof window.updateAdminUi === 'function') window.updateAdminUi();
    } else {
      // Pakke-bruker: kan logge inn men er ikke admin
      window.isAdminMode = false;
      window.currentAdminUser = data.user;
      document.body.classList.remove('admin-mode');
      unlockAs('user');
      // Pull data fra Supabase for å vise innhold
      if(typeof window.mvSupabaseSync?.pull === 'function') window.mvSupabaseSync.pull();
    }

    // Anvend pakke-begrensninger
    if(typeof window.setPackage === 'function') window.setPackage(pkg);

  } catch(e) {
    if(errEl){errEl.textContent=e.message||'Innlogging feilet.';errEl.style.display='block';}
    // Logg ut hvis noe gikk galt
    window.supabaseClient?.auth.signOut().catch(()=>{});
  } finally {
    if(btn){btn.disabled=false;btn.textContent='Logg inn';}
  }
}

function loginProducer(){unlockAs('producer');}
async function checkPw(){}

function initLock(){
  if(sessionStorage.getItem('mv_unlocked')==='1'){
    document.getElementById('lockScreen').style.display='none';
    const role = sessionStorage.getItem('mv_role') || '';
    if(role === 'admin'){
      window.isAdminMode = true;
      document.body.classList.add('admin-mode');
    }
    applyRoleMode();
    return;
  }
  setTimeout(()=>document.getElementById('adminUsername')?.focus(), 60);
}
initLock();
