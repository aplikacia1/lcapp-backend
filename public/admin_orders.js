document.addEventListener("DOMContentLoaded", init);

let ADMIN = { email: '', name: 'Lištové centrum' };
let inbox = [], outbox = [];
let participants = []; // { email, name, last }
let current = null;

async function init(){
  const warn = document.getElementById('warn');

  // 1) admin adresa + fallback
  try{
    const adrRes = await fetch('/api/messages/admin-address');
    const adr = adrRes.ok ? await adrRes.json() : null;
    const fb = (window.__ADMIN_FALLBACK__ || {});
    ADMIN = {
      email: (adr && adr.email) || fb.email || 'bratislava@listovecentrum.sk',
      name:  (adr && adr.name)  || fb.name  || 'Lištové centrum'
    };
    warn.textContent = (adr && adr.email) ? '' :
      'Upozornenie: ADMIN_EMAIL nie je nastavený na serveri (používam fallback).';
  }catch{
    const fb = (window.__ADMIN_FALLBACK__ || {});
    ADMIN = { email: fb.email || 'bratislava@listovecentrum.sk', name: fb.name || 'Lištové centrum' };
    warn.textContent = 'Upozornenie: ADMIN_EMAIL nie je nastavený na serveri (používam fallback).';
  }

  // 2) UI akcie
  document.getElementById('openNewBtn')?.addEventListener('click', async () => {
    const raw = (document.getElementById('newToEmail')?.value || '').trim();
    if (!raw) return;
    const email = await resolveEmail(raw);
    if (!email) { alert('Používateľ neexistuje.'); return; }
    openThread(email);
  });
  document.getElementById('broadcastBtn')?.addEventListener('click', sendBroadcast);

  await loadBoxes();
  buildParticipants();
  renderThreads();
  autoOpenFirst();

  setInterval(async () => {
    const cur = current;
    await loadBoxes();
    buildParticipants();
    renderThreads();
    if (cur) openThread(cur);
  }, 20000);
}

async function resolveEmail(input){
  const v = String(input).trim();
  if (!v) return null;
  if (v.includes('@')) return v;

  try {
    const res = await fetch('/api/messages/search-users?q=' + encodeURIComponent(v));
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || !rows.length) return null;
    const exact = rows.find(r => (r.name || '').toLocaleLowerCase('sk') === v.toLocaleLowerCase('sk'));
    return (exact || rows[0]).email || null;
  } catch {
    return null;
  }
}

async function loadBoxes(){
  const [inRes, outRes] = await Promise.all([
    fetch(`/api/messages/inbox/${encodeURIComponent(ADMIN.email)}`),
    fetch(`/api/messages/outbox/${encodeURIComponent(ADMIN.email)}`)
  ]);
  inbox  = inRes.ok ? await inRes.json() : [];
  outbox = outRes.ok ? await outRes.json() : [];
}

function buildParticipants(){
  const map = new Map();
  inbox.forEach(m => {
    const key = (m.fromEmail || '').toLowerCase();
    if (key && key !== ADMIN.email.toLowerCase()) {
      const t = new Date(m.createdAt).getTime();
      if (!map.has(key)) map.set(key, { email: m.fromEmail, name: m.fromName || m.fromEmail, last: t });
      else map.get(key).last = Math.max(map.get(key).last, t);
    }
  });
  outbox.forEach(m => {
    const key = (m.toEmail || '').toLowerCase();
    if (key && key !== ADMIN.email.toLowerCase()) {
      const t = new Date(m.createdAt).getTime();
      if (!map.has(key)) map.set(key, { email: m.toEmail, name: m.toName || m.toEmail, last: t });
      else map.get(key).last = Math.max(map.get(key).last, t);
    }
  });
  participants = Array.from(map.values()).sort((a,b)=>b.last-a.last);
}

function renderThreads(){
  const ul = document.getElementById('threadList');
  ul.innerHTML = participants.map(p => `
    <li class="thread-item ${current && current.toLowerCase()===p.email.toLowerCase() ? 'active':''}" data-email="${escapeAttr(p.email)}">
      <div class="thread-name">${escapeHtml(p.name)}</div>
      <div class="thread-sub">${escapeHtml(p.email)}</div>
    </li>
  `).join('') || `<li class="thread-item">Žiadne konverzácie.</li>`;

  ul.querySelectorAll('.thread-item[data-email]').forEach(li=>{
    li.addEventListener('click', () => openThread(li.getAttribute('data-email')));
  });
}

function autoOpenFirst(){
  if (!current && participants.length) openThread(participants[0].email);
  else renderThread();
}

function openThread(email){
  current = email;
  renderThreads();
  renderThread();
}

function renderThread(){
  const hdr = document.getElementById('threadHeader');
  const box = document.getElementById('msgs');
  const replyBox = document.getElementById('replyBox');
  const sendBtn = document.getElementById('sendBtn');

  if (!current){
    hdr.textContent = 'Vyberte konverzáciu vľavo';
    box.innerHTML = '';
    replyBox.style.display = 'none';
    return;
  }

  const who = participants.find(p => p.email.toLowerCase()===current.toLowerCase());
  hdr.innerHTML = `
    ${escapeHtml(who ? who.name : current)} — ${escapeHtml(current)}
    <button id="deleteConvBtn" style="margin-left:8px; padding:2px 6px; font-size:12px; cursor:pointer;">🗑️ Vymazať</button>
  `;

  const thread = [
    ...inbox.filter(m => (m.fromEmail||'').toLowerCase() === current.toLowerCase()),
    ...outbox.filter(m => (m.toEmail||'').toLowerCase()   === current.toLowerCase())
  ].sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));

  box.innerHTML = thread.map(m => `
    <div class="msg ${ (m.fromEmail||'').toLowerCase()===ADMIN.email.toLowerCase() ? 'me':''}">
      <div class="meta">
        ${escapeHtml(m.fromName || m.fromEmail)} → ${escapeHtml(m.toName || m.toEmail)}
        · ${new Date(m.createdAt).toLocaleString('sk-SK')}
      </div>
      <div>${escapeHtml(m.text||'')}</div>
    </div>
  `).join('') || `<div class="msg">Zatiaľ žiadne správy.</div>`;

  box.scrollTop = box.scrollHeight;
  replyBox.style.display = 'grid';
  sendBtn.onclick = () => sendReply(current);

  document.getElementById('deleteConvBtn')?.addEventListener('click', () => deleteConversation(current));
}

async function sendReply(toEmail){
  const ta = document.getElementById('replyText');
  const text = (ta.value || '').trim();
  if (!text) { alert('Správa je prázdna.'); return; }
  const res = await fetch('/api/messages/send-by-email', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ fromEmail: ADMIN.email, toEmail, text })
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok){ alert(data?.message || 'Chyba pri odoslaní.'); return; }
  ta.value = '';
  await loadBoxes();
  renderThread();
}

async function sendBroadcast(){
  const ta = document.getElementById('broadcastText');
  const text = (ta.value || '').trim();
  if (!text) return;
  const res = await fetch('/api/messages/broadcast', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ fromEmail: ADMIN.email, text })
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok){ alert(data?.message || 'Broadcast zlyhal.'); return; }
  ta.value = '';
  alert(`Odoslané všetkým. Počet: ${data?.sent ?? '—'}`);
}

async function deleteConversation(otherEmail){
  if (!confirm(`Naozaj chcete vymazať celú konverzáciu s ${otherEmail}? Zmaže sa u oboch strán.`)) return;
  try{
    const url = `/api/messages/conversation?user=${encodeURIComponent(ADMIN.email)}&other=${encodeURIComponent(otherEmail)}`;
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json().catch(()=>({}));
    if (!res.ok){ alert(data?.message || 'Mazanie zlyhalo.'); return; }
    alert(`Vymazané správy: ${data.deleted ?? 0}`);
    await loadBoxes();
    buildParticipants();
    renderThreads();
    current = null;
    renderThread();
  }catch(e){
    alert('Server neodpovedá.');
  }
}

// helpers
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s=''){ return String(s).replace(/"/g,'&quot;'); }
