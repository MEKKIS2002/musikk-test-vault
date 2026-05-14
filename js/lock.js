// === main-script-0 ===
// Prevent browser from auto-restoring scroll (conflicts with per-tab scroll memory)
if(history.scrollRestoration) history.scrollRestoration = 'manual';

// ── Username → Supabase email mapping ──────────────────────────────────────
// Add entries here for each admin user: { username: 'email@example.com' }
const USERNAME_MAP = {
  'marcus': 'marcus.aas.mekiassen@gmail.com',
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

  // Show/hide viewer login button
  const viewerBtn = document.getElementById('viewerLoginBtn');
  if(viewerBtn) viewerBtn.style.display = isViewer ? 'flex' : 'none';

  // Show/hide role badge (hide in viewer mode)
  const badge = document.getElementById('roleBadge');
  if(badge) badge.style.display = isViewer ? 'none' : '';

  if(isViewer){
    // Viewer: beats + mixtapes only, no lyrics, no albums, no admin actions
    document.querySelectorAll('.tab-btn').forEach(b=>{
      const tab = b.dataset.tab;
      b.style.display = (tab === 'beats' || tab === 'mixtapes') ? '' : 'none';
    });
    // Show mixtapes as default tab
    document.querySelectorAll('.tab-view').forEach(v=>v.classList.add('hidden'));
    const mix = document.getElementById('mixtapesTab');
    if(mix){ mix.classList.remove('hidden'); }
    // Activate mixtapes tab button
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
  document.body.classList.remove('producer-mode','viewer-mode');
  document.body.classList.remove('admin-mode');
  // Reset tab visibility and viewer button
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
  // Sync admin-mode class and flag with role
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

// Tab switcher on lock screen
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
    adminBtn.style.cssText += active;
    viewerBtn.style.cssText += inactive;
    document.getElementById('adminUsername')?.focus();
  } else {
    adminCard.style.display='none';
    viewerCard.style.display='grid';
    viewerBtn.style.cssText += active;
    adminBtn.style.cssText += inactive;
  }
}

// Username/password login — maps username to email, then uses Supabase auth
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
    // Use Supabase auth
    if(window.supabaseClient){
      const {data, error} = await window.supabaseClient.auth.signInWithPassword({email, password});
      if(error) throw error;
      // Check admin role
      const {data: profile} = await window.supabaseClient.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if(profile?.role === 'admin'){
        window.isAdminMode = true;
        window.currentAdminUser = data.user;
        document.body.classList.add('admin-mode');
        // Store username so it appears on uploaded beats
        sessionStorage.setItem('mv_username', username);
        unlockAs('admin');
        if(typeof window.mvSupabaseSync?.pull === 'function') window.mvSupabaseSync.pull();
        if(typeof window.updateAdminUi === 'function') window.updateAdminUi();
      } else {
        if(errEl){errEl.textContent='Brukeren mangler admin-tilgang.';errEl.style.display='block';}
        await window.supabaseClient.auth.signOut();
      }
    } else {
      if(errEl){errEl.textContent='Supabase ikke konfigurert.';errEl.style.display='block';}
    }
  } catch(e) {
    if(errEl){errEl.textContent=e.message||'Innlogging feilet.';errEl.style.display='block';}
  } finally {
    if(btn){btn.disabled=false;btn.textContent='Logg inn';}
  }
}

// Legacy stubs — kept i tilfelle noe kaller dem fra gammelt state
// loginProducer: ikke i bruk (produsentmodus er fjernet fra innloggingen)
// checkPw: ikke i bruk (erstattet av loginWithUsername via Supabase)
function loginProducer(){unlockAs('producer');}
async function checkPw(){} // no-op

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
