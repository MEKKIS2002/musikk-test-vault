const PW_HASH="961d21fae317a30cebd9998665d05708f29cecda65918b28640e0a348a957f79";
// Simple non-crypto fallback for file:// contexts
function simpleHash(s){let h=0;for(let i=0;i<s.length;i++){h=Math.imul(31,h)+s.charCodeAt(i)|0;}return(h>>>0).toString(16);}
const SIMPLE_PW="Mekkis123";
function getUserRole(){return sessionStorage.getItem('mv_role')||'';}
function isProducerUser(){return getUserRole()==='producer';}
function applyRoleMode(){
  const producer=isProducerUser();
  document.body.classList.toggle('producer-mode',producer);
  if(producer){
    const active=document.querySelector('.tab-btn.active');
    const activeTab=active?.dataset?.tab||'mixtapes';
    const allowed=['mixtapes','pipeline'];
    const target=allowed.includes(activeTab)?activeTab:'mixtapes';
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===target));
    document.querySelectorAll('.tab-view').forEach(v=>v.classList.add('hidden'));
    const view=document.getElementById(`${target}Tab`);if(view)view.classList.remove('hidden');
  }
}
function returnToPasswordScreen(){
  sessionStorage.removeItem('mv_unlocked');
  sessionStorage.removeItem('mv_role');
  document.body.classList.remove('producer-mode');
  const lock=document.getElementById('lockScreen');
  if(lock)lock.style.display='flex';
  const pw=document.getElementById('pwInput');
  if(pw){pw.value='';setTimeout(()=>pw.focus(),60);}
}
function unlockAs(role){
  sessionStorage.setItem('mv_unlocked','1');
  sessionStorage.setItem('mv_role',role);
  document.getElementById('lockScreen').style.display='none';
  document.getElementById('pwError').style.display='none';
  applyRoleMode();
}
function loginProducer(){unlockAs('producer');}
async function checkPw(){
  const val=document.getElementById('pwInput').value;
  let ok=false;
  try{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(val));
    const h=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    ok=(h===PW_HASH || val===SIMPLE_PW);
  }catch(e){
    // Fallback for file:// contexts where crypto.subtle may be unavailable
    ok=(val===SIMPLE_PW);
  }
  if(ok){
    unlockAs('admin');
  }else{
    document.getElementById('pwError').style.display='block';
    document.getElementById('pwInput').value='';
    document.getElementById('pwInput').focus();
  }
}
function initLock(){
  if(sessionStorage.getItem('mv_unlocked')==='1'){
    document.getElementById('lockScreen').style.display='none';
    applyRoleMode();
    return;
  }
  document.getElementById('pwInput').focus();
}
initLock();
