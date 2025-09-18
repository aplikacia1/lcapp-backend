// frontend/public/messages.js

/* ---------- helpers ---------- */
const $ = (s, r=document) => r.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>"']/g, m => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
));

/* ---------- URL params ---------- */
const params = new URLSearchParams(location.search);
const userEmail = params.get('email') || '';
const toParam   = params.get('to') || '';
if (!userEmail) location.href = 'index.html';

/* ---------- globals ---------- */
let userProfile = null;
let ADMIN = { email:'', name:'Lištové centrum' };
const ADMIN_FALLBACK = { email:'bratislava@listovecentrum.sk', name:'Lištové centrum' };
window.__ADMIN_EMAIL__ = ADMIN_FALLBACK.email; // pre HTML "Admin (broadcast)"

/* stav vlákna */
let currentOtherEmail = null;
let currentOtherLabel = null;
let lastThreadStamp = 0;

/* zoznam konverzácií – index */
let convIndex = new Map();  // otherEmail -> { el, unread, lastText, updatedAt }
let inflight = null;

/* koncepty */
let draftCache = "";

/* meno cache (email -> name) + helpery */
const nameCache = new Map();

async function getNameByEmail(email){
  if (!email) return null;
  if (nameCache.has(email)) return nameCache.get(email);
  try{
    const r = await fetch(`/api/users/${encodeURIComponent(email)}`);
    const j = r.ok ? await r.json() : null;
    const name = j?.name || null;
    if (name) nameCache.set(email, name);
    return name;
  }catch{ return null; }
}

async function ensureLabelForEmail(email, label){
  // ak label vyzerá ako meno, nechaj; ak je to email alebo chýba, doplň z DB
  if (label && !label.includes('@')) return label;
  const n = await getNameByEmail(email);
  return n || label || email;
}

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
  // šípka späť → timeline.html s email parametrom
  $('#backBtn')?.addEventListener('click', () => {
    const url = userEmail ? `timeline.html?email=${encodeURIComponent(userEmail)}` : 'timeline.html';
    location.href = url;
  });

  // ak by niekde bol logoutBtn (napr. v menu), ponechajme podporu
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

/* ---------- LIST: konverzácie (diff) ---------- */
function renderConvItem(item){
  const root = document.createElement('div');
  root.className = 'conv-item';
  root.dataset.email = item.otherEmail;
  root.onclick = ()=> openThread(item.otherEmail, item.otherName || item.otherEmail, { reset:true });

  const name = document.createElement('div');
  name.className = 'conv-name';

  // rýchly label: cache -> otherName -> email
  const initialLabel = nameCache.get(item.otherEmail) || item.otherName || item.otherEmail;
  name.textContent = initialLabel;

  // ak je zobrazený e-mail, skús doplniť meno lazy
  if (!item.otherName || initialLabel.includes('@')){
    getNameByEmail(item.otherEmail).then(n=>{
      if (n && name.firstChild) name.firstChild.textContent = n;
    }).catch(()=>{});
  }

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

  // aktualizuj label, ak treba
  const labelNode = name?.childNodes?.[0];
  const currentText = labelNode?.textContent || '';
  if (currentText.includes('@') && item.otherName){
    labelNode.textContent = item.otherName;
    nameCache.set(item.otherEmail, item.otherName);
  }
}
function highlightActive(){
  document.querySelectorAll('.conv-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.email === currentOtherEmail);
  });
  // zvýrazni admin tile, ak je aktívny admin chat
  const adminTile = $('#adminTile');
  if (adminTile && ADMIN?.email){
    const on = (currentOtherEmail||'').toLowerCase() === ADMIN.email.toLowerCase();
    adminTile.classList.toggle('active', on);
  }
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
      if (rows.length) box.appendChild(frag);
      else box.insertAdjacentHTML('beforeend','<div style="opacity:.8">Zatiaľ žiadne konverzácie.</div>');
      highlightActive();
      return;
    }

    const nextKeys = new Set(rows.map(r => r.otherEmail));

    for (const [key, val] of convIndex){
      if (!nextKeys.has(key)){ val.el.remove(); convIndex.delete(key); }
    }

    for (const item of rows){
      const cached = convIndex.get(item.otherEmail);
      if (!cached){
        const node = renderConvItem(item);
        const anchor = $('#adminTile');
        if (anchor && anchor.parentElement) {
          anchor.parentElement.insertBefore(node, anchor.nextSibling);
        } else {
          box.insertBefore(node, box.firstChild);
        }
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
    if (anyUnreadIncrease) ding();
  }catch{}
}

/* ---------- THREAD ---------- */
function msgKey(m){
  return String(m._id || `${m.fromEmail}|${m.createdAt}|${m.text}`);
}

function setThreadHeaderActions(otherEmail, displayLabel){
  const head = $('#threadHead');
  const title = $('#threadTitle');
  if (!head || !title) return;

  // nastav text
  title.textContent = (displayLabel && displayLabel !== otherEmail)
    ? `${displayLabel} — ${otherEmail}`
    : otherEmail;

  // odstráň staré tlačidlo, ak existuje
  const oldBtn = $('#deleteConvBtn');
  if (oldBtn) oldBtn.remove();

  // pridaj nové len keď máme platného adresáta
  if (otherEmail){
    const btn = document.createElement('button');
    btn.id = 'deleteConvBtn';
    btn.type = 'button';
    btn.textContent = '🗑️ Vymazať';
    btn.style.marginLeft = '8px';
    btn.style.padding = '2px 6px';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => deleteConversationUser(otherEmail, displayLabel));
    head.appendChild(btn);
  }
}

async function openThread(otherEmail, otherLabel, { reset=false } = {}){
  const t = $('#thread'); if (!t) return;

  const wasFor = (t.dataset.threadOf || '').toLowerCase();
  const willBeFor = String(otherEmail || '').toLowerCase();
  const switching = wasFor && wasFor !== willBeFor;

  currentOtherEmail = otherEmail;
  const displayLabel = await ensureLabelForEmail(otherEmail, otherLabel);
  currentOtherLabel = displayLabel;

  if (switching || reset){
    t.innerHTML = '<div style="opacity:.8">Načítavam…</div>';
    lastThreadStamp = 0;
    t.dataset.threadOf = otherEmail;
  }else if (!t.dataset.threadOf){
    t.dataset.threadOf = otherEmail;
  }

  // explicitný recipient pre odoslanie
  t.dataset.recipientEmail = otherEmail;
  t.dataset.recipientNick  = displayLabel;

  // header + delete button
  setThreadHeaderActions(otherEmail, displayLabel);

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
      const fromLabel = m.fromName || m.fromEmail;
      const toLabel   = m.toName   || m.toEmail;
      el.innerHTML = `
        <div class="meta">
          <span>${esc(fromLabel)} → ${esc(toLabel)}</span>
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
      if (nearBottom || reset) requestAnimationFrame(()=> t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' }));
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

  if (!currentOtherEmail && !$('#thread')?.dataset?.recipientEmail){
    alert('Vyberte najprv konverzáciu vľavo.');
    return;
  }

  const toEmail = $('#thread')?.dataset?.recipientEmail || currentOtherEmail;
  const toName  = currentOtherLabel || $('#thread')?.dataset?.recipientNick || toEmail;

  const optimisticKey = `opt_${Date.now()}`;
  const t = $('#thread');
  if (t){
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
    body: JSON.stringify({
      fromEmail: userEmail,
      toEmail,
      toName,
      text
    })
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

  await openThread(toEmail, toName, { reset:false });
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

/* ---------- DELETE CONVERSATION (user) ---------- */
async function deleteConversationUser(otherEmail, otherLabel){
  if (!otherEmail) return;
  const lbl = otherLabel && !otherLabel.includes('@') ? otherLabel : otherEmail;
  if (!confirm(`Naozaj chcete vymazať celú konverzáciu s ${lbl}? Zmaže sa u oboch strán.`)) return;

  try{
    const url = `/api/messages/conversation?user=${encodeURIComponent(userEmail)}&other=${encodeURIComponent(otherEmail)}`;
    const res = await fetch(url, { method:'DELETE' });
    const data = await res.json().catch(()=>({}));
    if (!res.ok){
      alert(data?.message || 'Mazanie zlyhalo.');
      return;
    }
    alert(`Vymazané správy: ${data.deleted ?? 0}`);

    // Reset UI
    currentOtherEmail = null;
    currentOtherLabel = null;
    lastThreadStamp = 0;

    const t = $('#thread');
    if (t){
      t.innerHTML = '<div style="opacity:.8">Vyberte konverzáciu vľavo.</div>';
      t.dataset.threadOf = '';
      t.dataset.recipientEmail = '';
      t.dataset.recipientNick  = '';
    }
    const title = $('#threadTitle');
    if (title) title.textContent = 'Vyberte konverzáciu';

    const oldBtn = $('#deleteConvBtn');
    if (oldBtn) oldBtn.remove();

    await refreshConversationsDiff();
  }catch(e){
    alert('Server neodpovedá.');
  }
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

  // ak prišiel ?to= (email alebo prezývka) → otvor vlákno s danou osobou
  if (toParam) {
    const isEmail = toParam.includes('@');
    let toEmail = null;
    if (isEmail) {
      toEmail = toParam;
    } else {
      const norm = s => (s||'').trim().toLowerCase();
      if (norm(toParam) === norm(ADMIN.name)) {
        toEmail = ADMIN.email;
      } else {
        try{
          const q = encodeURIComponent(toParam);
          const r = await fetch(`/api/messages/search-users?q=${q}`);
          const list = r.ok ? await r.json() : [];
          const nrm = (s)=> (s||'').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ');
          const row = list.find(x => nrm(x.name) === nrm(toParam)) || list.find(x => nrm(x.email) === nrm(toParam));
          toEmail = row?.email || null;
        }catch{}
      }
    }
    if (toEmail) await openThread(toEmail, toParam || toEmail, { reset:true });
  } else {
    // 🖥️ IBA DESKTOP: automaticky otvor prvú konverzáciu
    const isDesktop = window.matchMedia('(min-width: 901px)').matches;
    if (isDesktop){
      const first = document.querySelector('#convList .conv-item');
      if (first){
        const email = first.dataset.email;
        const label = first.querySelector('.conv-name')?.childNodes?.[0]?.textContent || email;
        if (email && label && !label.includes('@')) nameCache.set(email, label);
        first.click();
      }
    }
    // 📱 MOBILE: nič neotvárame – používateľ prišiel z timeline s ?to=
  }

  setInterval(()=> { if (!document.hidden) safeRefresh(); }, 4000);
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) safeRefresh(); });

  if (draftCache && $('#composerText')) $('#composerText').value = draftCache;
});

/* ---------- PUBLIC API pre HTML admin tile ---------- */
window.openThreadForRecipient = async ({ email, nick }) => {
  const label = nick || email;
  await openThread(email, label, { reset:true });
};

window.addEventListener('thread:open', async (e)=>{
  const d = e?.detail || {};
  if (!d.email) return;
  await openThread(d.email, d.nick || d.email, { reset:true });
});

window.addEventListener('compose:send', async (e)=>{
  const d = e?.detail || {};
  if (!d.recipientEmail) return;
  if (d.text && $('#composerText')) $('#composerText').value = d.text;
  $('#thread').dataset.recipientEmail = d.recipientEmail;
  if (d.recipientNick) $('#thread').dataset.recipientNick = d.recipientNick;
  currentOtherEmail = d.recipientEmail;
  currentOtherLabel = d.recipientNick || d.recipientEmail;
  await sendMessage();
});
