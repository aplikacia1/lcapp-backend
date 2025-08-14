// frontend/public/shared.js
function lcGetEmailFromURL(){ const p=new URLSearchParams(location.search); return p.get('email')||''; }
function lcIsAdmin(){ return new URLSearchParams(location.search).get('admin')==='1'; }

async function lcFetchUser(email){
  const r=await fetch(`/api/users/${encodeURIComponent(email)}`);
  if(!r.ok) throw new Error('user not found');
  return r.json();
}

async function lcInitHeader(){
  const email=lcGetEmailFromURL();
  const lbl=document.getElementById('loggedUser');
  const logoutBtn=document.getElementById('headerLogoutBtn')||document.querySelector('.btn.btn--danger');
  const msgBtn=document.getElementById('headerMsgBtn');

  if(!email){ lbl && (lbl.textContent=''); return; }

  try{
    const u=await lcFetchUser(email);
    lbl && (lbl.textContent=`Prihlásený ako: ${u.name||u.email}${lcIsAdmin()?' (admin mód)':''}`);
    logoutBtn && (logoutBtn.style.display='inline-flex', logoutBtn.onclick=()=>location.href='index.html');
    if(msgBtn){
      msgBtn.style.display='inline-flex';
      lcRefreshUnreadBadge(email);
      setInterval(()=>lcRefreshUnreadBadge(email), 20000);
    }
  }catch(e){
    if(lcIsAdmin()){
      lbl && (lbl.textContent='Prihlásený ako: Admin (admin mód)');
      logoutBtn && (logoutBtn.style.display='inline-flex', logoutBtn.onclick=()=>location.href='admin_login.html');
    }
  }
}

async function lcRefreshUnreadBadge(email){
  const badge=document.getElementById('msgBadge');
  if(!badge) return;
  try{
    const res=await fetch(`/api/messages/unread-count/${encodeURIComponent(email)}`);
    const {count=0}=await res.json();
    if(count>0){ badge.textContent=String(count); badge.style.display='inline-flex'; }
    else{ badge.textContent=''; badge.style.display='none'; }
  }catch{}
}
