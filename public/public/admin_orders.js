document.addEventListener("DOMContentLoaded", init);

let ADMIN = { email: '', name: 'Lištové centrum' };
let inbox = [], outbox = [];
let participants = []; // { email, name }
let current = null;    // aktuálne otvorený email

async function init(){
  const warn = document.getElementById('warn');

  // zisti admin adresu zo servera
  const adrRes = await fetch('/api/messages/admin-address');
  const adr = await adrRes.json();
  if (!adr?.email) {
    warn.textContent = 'Upozornenie: ADMIN_EMAIL nie je nastavený na serveri.';
  }
  ADMIN = { email: adr.email || '', name: adr.name || 'Lištové centrum' };

  await loadBoxes();
  buildParticipants();
  renderThreads();
  autoOpenFirst();

  // refresh zoznamu každých 20s (ľahký polling)
  setInterval(async () => {
    const cur = current;
    await loadBoxes();
    buildParticipants();
    renderThreads();
    if (cur) openThread(cur);
  }, 20000);
}

async function loadBoxes(){
  const [inRes, outRes] = await Promise.all([
    fetch(`/api/messages/inbox/${encodeURIComponent(ADMIN.email)}`),
    fetch(`/api/messages/outbox/${encodeURIComponent(ADMIN.email)}`)
  ]);
  inbox  = inRes.ok ? await inRes.json() : [];
  outbox = outRes.ok ? await outRes.json() : [];
}

// zoznam účastníkov (okrem admina)
function buildParticipants(){
  const map = new Map();
  inbox.forEach(m => {
    const key = (m.fromEmail || '').toLowerCase();
    if (key && key !== ADMIN.email.toLowerCase()) {
      if (!map.has(key)) map.set(key, { email: m.fromEmail, name: m.fromName || m.fromEmail, last: new Date(m.createdAt).getTime() });
      else map.get(key).last = Math.max(map.get(key).last, new Date(m.createdAt).getTime());
    }
  });
  outbox.forEach(m => {
    const key = (m.toEmail || '').toLowerCase();
    if (key && key !== ADMIN.email.toLowerCase()) {
      if (!map.has(key)) map.set(key, { email: m.toEmail, name: m.toName || m.toEmail, last: new Date(m.createdAt).getTime() });
      else map.get(key).last = Math.max(map.get(key).last, new Date(m.createdAt).getTime());
    }
  });
  participants = Array.from(map.values()).sort((a,b)=>b.last-a.last);
}

function renderThreads(){
  const ul = document.getElementById('threadList');
  ul.innerHTML = participants.map(p => `
    <li class="thread-item ${current && current.toLowerCase()===p.email.toLowerCase() ? 'active':''}" data-email="${p.email}">
      <div class="thread-name">${escape(p.name)}</div>
      <div class="thread-sub">${escape(p.email)}</div>
    </li>
  `).join('') || `<li class="thread-item">Žiadne konverzácie.</li>`;

  ul.querySelectorAll('.thread-item[data-email]').forEach(li=>{
    li.addEventListener('click', () => openThread(li.getAttribute('data-email')));
  });
}

function autoOpenFirst(){
  if (!current && participants.length) {
    openThread(participants[0].email);
  } else {
    renderThread(); // ak prázdne, vyrenderuj aj tak
  }
}

// otvor thread s daným emailom
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
  hdr.textContent = `${who ? who.name : current} · ${current}`;

  // všetky správy s týmto účastníkom
  const thread = [
    ...inbox.filter(m => m.fromEmail.toLowerCase() === current.toLowerCase()),
    ...outbox.filter(m => m.toEmail.toLowerCase() === current.toLowerCase())
  ].sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));

  box.innerHTML = thread.map(m => `
    <div class="msg ${m.fromEmail.toLowerCase()===ADMIN.email.toLowerCase() ? 'me':''}">
      <div class="meta">
        ${escape(m.fromName || m.fromEmail)} → ${escape(m.toName || m.toEmail)}
        · ${new Date(m.createdAt).toLocaleString('sk-SK')}
      </div>
      <div>${escape(m.text)}</div>
    </div>
  `).join('') || `<div class="msg">Zatiaľ žiadne správy.</div>`;

  // auto-scroll na koniec
  box.scrollTop = box.scrollHeight;

  replyBox.style.display = 'grid';
  sendBtn.onclick = () => sendReply(current);
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

// helpers
function escape(s=''){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
