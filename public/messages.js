// frontend/public/messages.js
const $ = (s, r=document) => r.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const params = new URLSearchParams(location.search);
const userEmail = params.get('email') || '';
if (!userEmail) location.href = 'index.html';

let userProfile = null;
let ADMIN = { email:'', name:'Lištové centrum' };

let currentOtherEmail = null;
let currentOtherLabel = null;

// draft cache (aby sa nestratil text pri refreshoch)
let draftCache = "";

/* ---------- NAV / HEADER ---------- */
function wireHeader(){
  $('#catalogBtn').onclick  = () => location.href = `catalog.html?email=${encodeURIComponent(userEmail)}`;
  $('#timelineBtn').onclick = () => location.href = `timeline.html?email=${encodeURIComponent(userEmail)}`;
  $('#logoutBtn').onclick   = () => location.href = 'index.html';
  $('#backBtn').onclick     = () => setModeList();
}

/* ---------- LOAD SELF + ADMIN ---------- */
async function loadSelf(){
  try{
    const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`);
    if (!res.ok) throw new Error();
    userProfile = await res.json();
    $('#userLabel').textContent = `Prihlásený: ${userProfile?.name || userEmail}`;
  }catch{
    $('#userLabel').textContent = `Prihlásený: ${userEmail}`;
  }
}
async function loadAdmin(){
  try{
    const r = await fetch('/api/messages/admin-address');
    const j = await r.json();
    ADMIN = { email: j?.email || '', name: j?.name || 'Lištové centrum' };
  }catch{}
}

/* ---------- MODE TOGGLING ---------- */
function setModeThread(){
  document.body.classList.remove('mode-list');
  document.body.classList.add('mode-thread');
}
function setModeList(){
  document.body.classList.remove('mode-thread');
  document.body.classList.add('mode-list');
  currentOtherEmail = null;
  currentOtherLabel = null;
  $('#threadTitle').textContent = 'Vyberte konverzáciu';
  $('#thread').innerHTML = '';
  $('#toName').value = '';
}

/* ---------- LIST: konverzácie ---------- */
async function loadConversations(){
  const box = $('#convList');
  try{
    const res = await fetch(`/api/messages/conversations/${encodeURIComponent(userEmail)}`);
    const rows = res.ok ? await res.json() : [];
    if (!rows.length){ box.innerHTML = '<div style="opacity:.8">Zatiaľ žiadne konverzácie.</div>'; return; }

    box.innerHTML = '';
    rows.forEach(item=>{
      const root = document.createElement('div');
      root.className = 'conv-item' + (item.otherEmail===currentOtherEmail ? ' active' : '');
      root.onclick = ()=> openThread(item.otherEmail, item.otherName || item.otherEmail);

      const name = document.createElement('div');
      name.className = 'conv-name' + (item.unread>0 ? ' unread' : '');
      name.textContent = item.otherName || item.otherEmail;

      const last = document.createElement('div');
      last.className = 'conv-last';
      last.textContent = item.lastText || '';

      root.appendChild(name);
      if (item.unread>0){
        const bdg = document.createElement('span');
        bdg.className = 'badge';
        bdg.textContent = item.unread;
        name.appendChild(bdg);
      }
      root.appendChild(last);
      box.appendChild(root);
    });
  }catch{
    box.innerHTML = '<div style="opacity:.8">Chyba pri načítaní.</div>';
  }
}

/* ---------- THREAD: načítanie & render ---------- */
async function openThread(otherEmail, otherLabel){
  currentOtherEmail = otherEmail;
  currentOtherLabel = otherLabel;
  $('#threadTitle').textContent = `${otherLabel} — ${otherEmail}`;
  $('#thread').innerHTML = 'Načítavam…';
  setModeThread();

  try{
    const url = `/api/messages/thread?email=${encodeURIComponent(userEmail)}&with=${encodeURIComponent(otherEmail)}`;
    const res = await fetch(url);
    const list = res.ok ? await res.json() : [];

    const t = $('#thread');
    t.innerHTML = '';
    if (!list.length){
      t.innerHTML = '<div style="opacity:.8">Zatiaľ žiadne správy.</div>';
    }else{
      list.forEach(m=>{
        const el = document.createElement('div');
        el.className = 'msg' + (String(m.fromEmail).toLowerCase()===String(userEmail).toLowerCase() ? ' me' : '');
        const when = m.createdAt ? new Date(m.createdAt).toLocaleString('sk-SK') : '';
        el.innerHTML = `
          <div class="meta">
            <span>${esc(m.fromName || m.fromEmail)} → ${esc(m.toName || m.toEmail)}</span>
            <span>${when}</span>
          </div>
          <div>${esc(m.text || '')}</div>
        `;
        t.appendChild(el);
      });
    }

    // autoscroll na koniec
    requestAnimationFrame(()=> t.scrollTo({ top: t.scrollHeight, behavior:'instant' }));

    // reload ľavého panelu (odráta unread)
    await loadConversations();
  }catch{
    $('#thread').innerHTML = '<div style="opacity:.8">Chyba pri načítaní vlákna.</div>';
  }
}

/* ---------- Odosielanie ---------- */
async function sendMessage(){
  const rawText = $('#composerText').value;
  const text = rawText.trim();
  if (!text) return;

  let toName = null;
  if (currentOtherEmail){
    toName = currentOtherLabel || currentOtherEmail;
  }else{
    toName = ($('#toName').value || '').trim();
    if (!toName){ alert('Doplňte komu (prezývku).'); return; }
  }

  const r = await fetch('/api/messages/send', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ fromEmail: userEmail, toName, text })
  });
  const j = await r.json().catch(()=>({}));

  if (!r.ok){
    alert(j?.message || 'Chyba pri odoslaní.');
    return;
  }

  $('#composerText').value = '';
  draftCache = "";

  if (currentOtherEmail){
    await openThread(currentOtherEmail, currentOtherLabel);
  }else{
    const resolved = await resolveEmailByName(toName);
    if (resolved){
      await openThread(resolved, toName);
    }else{
      await loadConversations();
    }
  }
}

/* Enter = send, Shift+Enter = newline */
function wireComposerKeys(){
  const area = $('#composerText');
  area.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });
  // cache draft pri písaní
  area.addEventListener('input', ()=>{
    draftCache = area.value;
  });
}

/* Pomocník – rozlúštiť email z prezývky (ak treba) */
async function resolveEmailByName(name){
  try{
    const q = encodeURIComponent(name.trim());
    const r = await fetch(`/api/messages/search-users?q=${q}`);
    const list = r.ok ? await r.json() : [];
    const row = list.find(x => (x.name || '').toLowerCase() === name.trim().toLowerCase());
    return row?.email || null;
  }catch{
    return null;
  }
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  wireHeader();
  wireComposerKeys();

  $('#sendBtn').onclick = sendMessage;

  await loadSelf();
  await loadAdmin();
  await loadConversations();

  // ⏳ auto-refresh každých 6 sekúnd
  setInterval(async ()=>{
    await loadConversations();
    if (currentOtherEmail){
      const preserve = $('#composerText');
      const saved = preserve.value; // zachovať rozpísaný text
      await openThread(currentOtherEmail, currentOtherLabel);
      preserve.value = saved;
      draftCache = saved;
    }
  }, 6000);

  // načítanie draftu po reloade (ak je)
  if (draftCache){
    $('#composerText').value = draftCache;
  }
});
