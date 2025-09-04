// frontend/public/messages.js
const $ = (s, r=document) => r.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>"']/g, m => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
));

const params = new URLSearchParams(location.search);
const userEmail = params.get('email') || '';
const toParam   = params.get('to') || '';
if (!userEmail) location.href = 'index.html';

let userProfile = null;
let ADMIN = { email:'', name:'Lištové centrum' };
const ADMIN_FALLBACK = { email:'bratislava@listovecentrum.sk', name:'Lištové centrum' };
window.__ADMIN_EMAIL__ = ADMIN_FALLBACK.email; // pre HTML click

let currentOtherEmail = null;
let currentOtherLabel = null;

// incremental state
let lastThreadStamp = 0;
let convIndex = new Map();  // otherEmail -> { el, unread, lastText, updatedAt }
let inflight = null;

// draft cache
let draftCache = "";

/* ---------- DING (zvuk) ---------- */
let dingCtx = null;
let dingEnabled = false;
function initDing(){
  try{
    dingCtx = new (window.AudioContext || window.webkitAudioContext)();
    dingEnabled = true;
  }catch{}
}
function ding(){
  if (!dingEnabled || !dingCtx) return;
  const ctx = dingCtx;
  if (ctx.state === 'suspended') { ctx.resume().catch(()=>{}); }
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = 880;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.30);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.32);
}
window.addEventListener('pointerdown', initDing, { once:true });
window.addEventListener('keydown', initDing, { once:true });

/* ---------- NAV / HEADER ---------- */
function wireHeader(){
  $('#logoutBtn')?.addEventListener('click', () => location.href = 'index.html');
}

/* ---------- LOAD SELF + ADMIN ---------- */
async function loadSelf(){
  const labelEl = document.getElementById('userChip') || document.getElementById('userLabel');
  try{
    const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`);
    userProfile = res.ok ? await res.json() : null;
    if (labelEl) labelEl.textContent = `Prihlásený: ${userProfile?.name || userEmail}`;
  }catch{
    if (labelEl) labelEl.textContent = `Prihlásený: ${userEmail}`;
  }
}
async function loadAdmin(){
  try{
    const r = await fetch('/api/messages/admin-address');
    const j = r.ok ? await r.json() : null;
    ADMIN = {
      email: j?.email || ADMIN_FALLBACK.email,
      name:  j?.name  || ADMIN_FALLBACK.name
    };
  }catch{
    ADMIN = { ...ADMIN_FALLBACK };
  }
  window.__ADMIN_EMAIL__ = ADMIN.email;
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
  lastThreadStamp = 0;
  const t = $('#thread');
  if (t){
    t.innerHTML = '';
    delete t.dataset.threadOf;
  }
  const title = $('#threadTitle');
  if (title) title.textContent = 'Vyberte konverzáciu';
}

// export pre „Nová konverzácia“
window.startNewConversation = function(){
  setModeList();
  const f = $('#toName');
  if (f){ f.value=''; f.focus(); }
};

/* ---------- HELPERS ---------- */
function normalizeBase(s){
  // zníženie, odstránenie diakritiky a zbytočných medzier
  return (s||'')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/\s+/g,' ');
}
function isAdminAlias(raw){
  const n = normalizeBase(raw);
  return (
    n.startsWith('adm') ||          // chytí admin, admn…
    n.includes('admin') ||
    n.includes('listove centrum') ||
    n.includes('listove-centrum') ||
    n.includes('listovecentrum') ||
    n.includes('listove')
  );
}

/* ---------- LIST: konverzácie (diff) ---------- */
function renderConvItem(item){
  const root = document.createElement('div');
  root.className = 'conv-item';
  root.dataset.email = item.otherEmail;
  root.onclick = ()=> openThread(item.otherEmail, item.otherName || item.otherEmail, { reset:true });

  const name = document.createElement('div');
  name.className = 'conv-name';
  name.textContent = item.otherName || item.otherEmail;

  if (item.unread > 0){
    const bdg = document.createElement('span');
    bdg.className = 'badge';
    bdg.textContent = item.unread;
    name.appendChild(bdg);
  }

  const last = document.createElement('div');
  last.className = 'conv-last';
  last.textContent = item.lastText || '';

  root.appendChild(name);
  root.appendChild(last);
  return root;
}
function patchConvItem(node, item){
  const name = node.querySelector('.conv-name');
  const last = node.querySelector('.conv-last');
  let bdg = name ? name.querySelector('.badge') : null;
  if (item.unread > 0){
    if (!bdg && name){
      bdg = document.createElement('span');
      bdg.className = 'badge';
      name.appendChild(bdg);
    }
    if (bdg) bdg.textContent = String(item.unread);
  }else if (bdg){
    bdg.remove();
  }
  if (last) last.textContent = item.lastText || '';
}
function highlightActive(){
  document.querySelectorAll('.conv-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.email === currentOtherEmail);
  });
}
function syncPeopleList(){
  const dl = $('#peopleList');
  if (!dl) return;
  const seen = new Set();
  const opts = [];

  if (ADMIN?.name && !seen.has(ADMIN.name)){ opts.push(`<option value="${esc(ADMIN.name)}"></option>`); seen.add(ADMIN.name); }
  if (ADMIN?.email && !seen.has(ADMIN.email)){ opts.push(`<option value="${esc(ADMIN.email)}"></option>`); seen.add(ADMIN.email); }

  for (const [email, obj] of convIndex){
    const nameEl = obj.el.querySelector('.conv-name');
    const label = (nameEl?.childNodes[0]?.textContent || '').trim() || email;
    if (!seen.has(label)){ opts.push(`<option value="${esc(label)}"></option>`); seen.add(label); }
  }
  dl.innerHTML = opts.join('');
}
async function refreshConversationsDiff(){
  const box = $('#convList');
  if (!box) return;
  try{
    const res = await fetch(`/api/messages/conversations/${encodeURIComponent(userEmail)}`);
    const rows = res.ok ? await res.json() : [];
    let anyUnreadIncrease = false;

    if (!box.hasChildNodes()){
      const frag = document.createDocumentFragment();
      rows.forEach(item=>{
        const node = renderConvItem(item);
        frag.appendChild(node);
        convIndex.set(item.otherEmail, { el: node, unread: item.unread, lastText: item.lastText, updatedAt: item.updatedAt });
      });
      box.innerHTML = '';
      if (rows.length) box.appendChild(frag);
      else box.innerHTML = '<div style="opacity:.8">Zatiaľ žiadne konverzácie.</div>';
      highlightActive(); syncPeopleList(); return;
    }

    const nextKeys = new Set(rows.map(r => r.otherEmail));

    for (const [key, val] of convIndex){
      if (!nextKeys.has(key)){ val.el.remove(); convIndex.delete(key); }
    }

    for (const item of rows){
      const cached = convIndex.get(item.otherEmail);
      if (!cached){
        const node = renderConvItem(item);
        box.insertBefore(node, box.firstChild);
        convIndex.set(item.otherEmail, { el: node, unread: item.unread, lastText: item.lastText, updatedAt: item.updatedAt });
      }else{
        if (item.unread > cached.unread && item.otherEmail !== currentOtherEmail){
          anyUnreadIncrease = true;
        }
        if (cached.unread !== item.unread || cached.lastText !== item.lastText){
          patchConvItem(cached.el, item);
          cached.unread = item.unread; cached.lastText = item.lastText; cached.updatedAt = item.updatedAt;
        }
      }
    }
    highlightActive();
    syncPeopleList();
    if (anyUnreadIncrease) ding();
  }catch{}
}

/* ---------- THREAD (bez miešania) ---------- */
function msgKey(m){
  return String(m._id || `${m.fromEmail}|${m.createdAt}|${m.text}`); 
}
async function openThread(otherEmail, otherLabel, { reset=false } = {}){
  const t = $('#thread'); if (!t) return;

  const wasFor = (t.dataset.threadOf || '').toLowerCase();
  const willBeFor = String(otherEmail || '').toLowerCase();
  const switching = wasFor && wasFor !== willBeFor;

  currentOtherEmail = otherEmail;
  currentOtherLabel = otherLabel;

  if (switching || reset){
    t.innerHTML = '<div style="opacity:.8">Načítavam…</div>';
    lastThreadStamp = 0;
    t.dataset.threadOf = otherEmail;
  }else if (!t.dataset.threadOf){
    t.dataset.threadOf = otherEmail;
  }

  const title = $('#threadTitle');
  if (title) title.textContent = `${otherLabel} — ${otherEmail}`;
  setModeThread();
  highlightActive();

  try{
    const sincePart = lastThreadStamp ? `&since=${encodeURIComponent(lastThreadStamp)}` : '';
    const url = `/api/messages/thread?email=${encodeURIComponent(userEmail)}&with=${encodeURIComponent(otherEmail)}${sincePart}`;
    const res = await fetch(url);
    const list = res.ok ? await res.json() : [];

    if (t.firstChild && /Zatiaľ|Načítavam/.test(t.firstChild.textContent||'')) t.innerHTML = '';

    const seen = new Set(Array.from(t.querySelectorAll('.msg')).map(el => el.dataset.key));
    let appended = 0, hadIncoming = false;
    const frag = document.createDocumentFragment();

    for (const m of list){
      const key = msgKey(m);
      if (seen.has(key)) continue;

      const isMe = String(m.fromEmail).toLowerCase()===String(userEmail).toLowerCase();
      const el = document.createElement('div');
      el.className = 'msg' + (isMe ? ' me' : '');
      el.dataset.key = key;
      const when = m.createdAt ? new Date(m.createdAt).toLocaleString('sk-SK') : '';
      el.innerHTML = `
        <div class="meta">
          <span>${esc(m.fromName || m.fromEmail)} → ${esc(m.toName || m.toEmail)}</span>
          <span>${when}</span>
        </div>
        <div>${esc(m.text || '')}</div>
      `;
      frag.appendChild(el);

      const ts = m.createdAt ? new Date(m.createdAt).getTime() : Date.now();
      if (ts > lastThreadStamp) lastThreadStamp = ts;
      appended++; if (!isMe) hadIncoming = true;
    }

    if (appended){
      const nearBottom = (t.scrollHeight - t.scrollTop - t.clientHeight) < 40;
      t.appendChild(frag);
      if (nearBottom) requestAnimationFrame(()=> t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' }));
      if (hadIncoming) ding();
    }else if (!t.children.length){
      t.innerHTML = '<div style="opacity:.8">Zatiaľ žiadne správy.</div>';
    }

    await refreshConversationsDiff();
  }catch{}
}

/* ---------- Odosielanie ---------- */
async function sendMessage(){
  const area = $('#composerText'); if (!area) return;
  const rawText = area.value; const text = rawText.trim();
  if (!text) return;

  let toName = null;

  if (currentOtherEmail){
    toName = currentOtherLabel || currentOtherEmail;
  }else{
    const toField = $('#toName');
    toName = (toField?.value || '').trim();
    if (!toName){ alert('Doplňte komu (prezývku).'); return; }

    // Admin alias → posielame priamo na email
    if (isAdminAlias(toName)){
      toName = ADMIN.email || ADMIN_FALLBACK.email;
    }
  }

  // optimistická bublina iba ak sme v konkrétnom vlákne
  const optimisticKey = `opt_${Date.now()}`;
  const t = $('#thread');
  if (t && currentOtherEmail){
    const opt = document.createElement('div');
    opt.className = 'msg me';
    opt.dataset.key = optimisticKey;
    opt.innerHTML = `
      <div class="meta">
        <span>${esc(userProfile?.name || userEmail)} → ${esc(toName)}</span>
        <span>odosielam…</span>
      </div>
      <div>${esc(text)}</div>
    `;
    t.appendChild(opt);
    t.scrollTo({ top: t.scrollHeight });
  }

  const r = await fetch('/api/messages/send', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ fromEmail: userEmail, toName, text })
  });
  const j = await r.json().catch(()=>({}));

  if (!r.ok){
    alert(j?.message || 'Chyba pri odoslaní.');
    const lastMeta = $('#thread')?.lastElementChild?.querySelector('.meta span:last-child');
    if (lastMeta) lastMeta.textContent = 'chyba odoslania';
    return;
  }

  area.value = '';
  draftCache = "";

  const optEl = $('#thread')?.querySelector(`.msg[data-key="${optimisticKey}"]`);
  if (optEl) optEl.remove();

  if (currentOtherEmail){
    await openThread(currentOtherEmail, currentOtherLabel, { reset:false });
  }else{
    // rozlúštiť email a rovno otvoriť vlákno (Admin aj bežní používatelia)
    const resolved = await resolveEmailByName(toName);
    const label = isAdminAlias(toName) ? ADMIN.name : toName;
    const email = resolved || ADMIN.email || ADMIN_FALLBACK.email;
    if (email){ await openThread(email, label, { reset:true }); }
    await refreshConversationsDiff();
  }
}

/* Enter = send, Shift+Enter = newline + počítadlo */
function wireComposerKeys(){
  const area = $('#composerText');
  const counter = $('#composerCount');
  const syncCount = () => { if (area && counter) counter.textContent = `${(area.value||'').length} / ${area.maxLength || 2000}`; };
  area?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
  });
  area?.addEventListener('input', ()=>{ draftCache = area.value; syncCount(); });
  syncCount();
}

/* Pomocník – rozlúštiť email z prezývky (ak treba) */
async function resolveEmailByName(name){
  const raw = (name||'').trim();
  if (!raw) return null;
  if (raw.includes('@')) return raw;
  if (isAdminAlias(raw)) return ADMIN.email || ADMIN_FALLBACK.email;

  try{
    const q = encodeURIComponent(raw);
    const r = await fetch(`/api/messages/search-users?q=${q}`);
    const list = r.ok ? await r.json() : [];
    const n = normalizeBase(raw);
    const row = list.find(x => normalizeBase(x.name || '') === n) || list.find(x => normalizeBase(x.email || '') === n);
    return row?.email || null;
  }catch{ return null; }
}

/* ---------- SAFE REFRESH ---------- */
async function safeRefresh(){
  try{
    inflight?.abort?.(); inflight = new AbortController();
    await refreshConversationsDiff();
    if (currentOtherEmail){
      const preserve = $('#composerText'); const saved = preserve ? preserve.value : '';
      await openThread(currentOtherEmail, currentOtherLabel);
      if (preserve) preserve.value = saved; draftCache = saved;
    }
  }catch{}
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  wireHeader();
  wireComposerKeys();

  $('#sendBtn')?.addEventListener('click', sendMessage);

  await loadSelf();
  await loadAdmin();
  await refreshConversationsDiff();

  if (toParam) {
    const isEmail = toParam.includes('@');
    const toEmail = isEmail ? toParam : (await resolveEmailByName(toParam));
    if (toEmail) await openThread(toEmail, toParam || toEmail, { reset:true });
  } else {
    const first = document.querySelector('#convList .conv-item');
    if (first) first.click();
  }

  setInterval(()=> { if (!document.hidden) safeRefresh(); }, 4000);
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) safeRefresh(); });

  if (draftCache && $('#composerText')) $('#composerText').value = draftCache;
});
