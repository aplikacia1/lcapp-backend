// frontend/public/messages.js
const $ = (s, r=document) => r.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const params = new URLSearchParams(location.search);
const userEmail = params.get('email') || '';
if (!userEmail) location.href = 'index.html';

let userProfile = null;
let ADMIN = { email:'', name:'Lištové centrum' };
let currentOther = null; // email druhej strany v zobrazenom vlákne

/* --------- nav --------- */
function wireNav(){
  $('#backBtn').onclick     = () => location.href = `catalog.html?email=${encodeURIComponent(userEmail)}`;
  $('#timelineBtn').onclick = () => location.href = `timeline.html?email=${encodeURIComponent(userEmail)}`;
  $('#logoutBtn').onclick   = () => location.href = 'index.html';
}

/* --------- load self + admin --------- */
async function loadSelf(){
  const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`);
  if (!res.ok) { alert('Používateľ sa nenašiel.'); location.href='index.html'; return; }
  userProfile = await res.json();
  $('#who').textContent = userProfile?.name || userEmail;
  $('#logoutBtn').style.display = 'inline-flex';
}
async function loadAdmin(){
  try{
    const r = await fetch('/api/messages/admin-address'); const j = await r.json();
    ADMIN = { email: j?.email || '', name: j?.name || 'Lištové centrum' };
    $('#hint').textContent = ADMIN.email ? `Tip: môžete napísať aj „${ADMIN.name}“.` : '';
  }catch{}
}

/* --------- konverzácie (ľavý panel) --------- */
async function loadConversations(){
  const box = $('#convList');
  box.innerHTML = 'Načítavam…';
  const res = await fetch(`/api/messages/conversations/${encodeURIComponent(userEmail)}`);
  const rows = res.ok ? await res.json() : [];
  if (!rows.length){ box.innerHTML = '<div style="opacity:.8;">Zatiaľ žiadne konverzácie.</div>'; return; }

  box.innerHTML = '';
  rows.forEach(item=>{
    const el = document.createElement('div');
    el.className = 'conv-item' + (item.otherEmail === currentOther ? ' active' : '');
    el.dataset.email = item.otherEmail;
    el.innerHTML = `
      <div class="conv-top">
        <div class="conv-name">${esc(item.otherName || item.otherEmail)}</div>
        ${item.unread > 0 ? `<span class="badge">${item.unread}</span>` : ''}
      </div>
      <div class="conv-last">${esc(item.lastText || '')}</div>
    `;
    el.onclick = ()=> openThread(item.otherEmail, item.otherName || item.otherEmail);
    box.appendChild(el);
  });
}

/* --------- vlákno s partnerom --------- */
async function openThread(otherEmail, otherLabel){
  currentOther = otherEmail;
  $('#threadHead').textContent = `${otherLabel} — ${otherEmail}`;
  $('#replyBox').style.display = 'block';
  $('#thread').innerHTML = 'Načítavam…';

  const url = `/api/messages/thread?email=${encodeURIComponent(userEmail)}&with=${encodeURIComponent(otherEmail)}`;
  const res = await fetch(url);
  const list = res.ok ? await res.json() : [];

  const t = $('#thread');
  t.innerHTML = '';
  if (!list.length){ t.innerHTML = '<div style="opacity:.8;">Zatiaľ žiadne správy.</div>'; }

  list.forEach(m=>{
    const el = document.createElement('div');
    el.className = 'msg';
    el.innerHTML = `
      <div class="meta">
        <span>${esc(m.fromName || m.fromEmail)} → ${esc(m.toName || m.toEmail)} · ${new Date(m.createdAt).toLocaleString('sk-SK')}</span>
        <span>
          <button class="btn btn--accent" data-reply>Odpovedať</button>
          <button class="btn btn--danger" data-del>Zmazať</button>
        </span>
      </div>
      <div>${esc(m.text || '')}</div>
    `;
    el.querySelector('[data-reply]').onclick = ()=>{
      $('#replyText').value = '';
      $('#replyText').focus();
      window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
    };
    el.querySelector('[data-del]').onclick = ()=> deleteMessage(m._id);
    t.appendChild(el);
  });

  // refresh ľavý panel (odráta unread)
  await loadConversations();
}

async function deleteMessage(id){
  if (!confirm('Zmazať túto správu?')) return;

  const encId = encodeURIComponent(String(id || ''));
  // primárna cesta: DELETE s telom
  let ok = false, msg = '';
  try{
    const r = await fetch(`/api/messages/${encId}`, {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requesterEmail: userEmail })
    });
    const j = await r.json().catch(()=>({}));
    ok = r.ok; msg = j?.message || '';
  }catch{}

  // fallback: requesterEmail v query
  if (!ok){
    try{
      const r2 = await fetch(`/api/messages/delete/${encId}?requesterEmail=${encodeURIComponent(userEmail)}`, { method:'DELETE' });
      const j2 = await r2.json().catch(()=>({}));
      ok = r2.ok; msg = j2?.message || msg;
    }catch{}
  }

  if (!ok){ alert(msg || 'Mazanie zlyhalo.'); return; }
  if (currentOther) await openThread(currentOther, currentOther);
}

/* --------- nová správa / odpoveď --------- */
async function sendNew(){
  const toName = $('#toName').value.trim();
  const text   = $('#newText').value.trim();
  if (!toName || !text){ alert('Doplňte komu a text.'); return; }

  const r = await fetch('/api/messages/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ fromEmail: userEmail, toName, text })
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok){ alert(j?.message || 'Chyba pri odoslaní.'); return; }

  $('#newText').value = '';
  // ak posielame práve tomu, koho máme otvoreného, dočítaj vlákno
  const toEmail = (await resolveEmailByName(toName)) || null;
  await loadConversations();
  if (toEmail && toEmail === currentOther) await openThread(currentOther, toName);
}

async function sendReply(){
  if (!currentOther){ alert('Vyberte konverzáciu.'); return; }
  const text = $('#replyText').value.trim();
  if (!text){ return; }

  // z odpovede posielame podľa prezývky (ak je k dispozícii niekde v hlavičke)
  const head = $('#threadHead').textContent || currentOther;
  const nice = head.split(' — ')[0] || currentOther;

  const r = await fetch('/api/messages/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ fromEmail: userEmail, toName: nice, text })
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok){ alert(j?.message || 'Chyba pri odoslaní.'); return; }

  $('#replyText').value = '';
  await openThread(currentOther, nice);
}

/* --------- pomocník – získať email partnera z názvu (ak treba) --------- */
async function resolveEmailByName(name){
  try{
    const q = encodeURIComponent(name.trim());
    const r = await fetch(`/api/messages/search-users?q=${q}`);
    const list = r.ok ? await r.json() : [];
    const row = list.find(x => (x.name || '').toLowerCase() === name.trim().toLowerCase());
    return row?.email || null;
  }catch{ return null; }
}

/* --------- init --------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  wireNav();
  await loadSelf();
  await loadAdmin();

  $('#sendBtn').onclick  = sendNew;
  $('#replySend').onclick = sendReply;

  await loadConversations();
});
