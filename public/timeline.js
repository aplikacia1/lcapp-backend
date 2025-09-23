// ───────────────────── Pomôcky ─────────────────────
function getEmailFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("email") || "";
}
function $(sel, root = document) { return root.querySelector(sel); }
function escapeHTML(str = "") {
  return String(str || "").replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
  );
}
const scroller = document.scrollingElement || document.documentElement;

// Admin mód cez ?admin=1
const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";

// FIXED admin položka – interne držíme email kvôli backendu, ale NEzobrazujeme ho
const FIXED_ADMIN = {
  email: "bratislava@listovecentrum.sk",
  name: "Lištové centrum",
  online: true
};

// Stav
const userEmail = getEmailFromURL(); // len z URL, žiadny storage
let userData = null;
let userScrollActive = false;
let scrollIdleTO = null;

if (!userEmail) { window.location.href = "index.html"; }

// ───────────────── Dolný padding podľa výšky composeru ─────────────────
function setComposerPadding() {
  const bar = $("#composerBar");
  const main = $(".main-content");
  if (!bar || !main) return;
  const h = bar.offsetHeight || 120;
  main.style.paddingBottom = (h + 16) + "px";
}
function setPresenceBottom() {
  const bar = $("#composerBar");
  const panel = $("#presencePanel");
  if (!bar || !panel) return;
  const h = bar.offsetHeight || 120;
  panel.style.maxHeight = `calc(100vh - var(--header-h) - ${h + 24}px)`;
}

// Navigácia
function openMessages(){
  const url = `messages.html?email=${encodeURIComponent(userEmail)}${isAdmin ? '&admin=1':''}`;
  location.href = url;
}

// → Otvorenie súkromného chatu podľa PREZÝVKY (nie e-mailu)
function openPrivateChat(targetNickname){
  if (!targetNickname) {
    alert("Tento používateľ nemá nastavenú prezývku. Najprv ju musí pridať v nastaveniach účtu.");
    return;
  }
  const url = `messages.html?email=${encodeURIComponent(userEmail)}&to=${encodeURIComponent(targetNickname)}${isAdmin ? '&admin=1':''}`;
  window.location.href = url;
}

// 🔔 Badge – mapovanie podľa prezývky (lowercase)
function formatBadge(n){
  const num = Number(n||0);
  if (num <= 0) return '';
  return num > 9 ? '9+' : String(num);
}
function applyPresenceBadgesByName(mapByNameLower){
  document.querySelectorAll('.presence-badge').forEach(el=>{
    const key = String(el.dataset.key || '').toLowerCase(); // key = nameLower
    const n = Number(mapByNameLower.get(key) || 0);
    const text = formatBadge(n);
    if (text){
      el.textContent = text;
      el.setAttribute('aria-label', `Neprečítané správy: ${n}`);
      el.style.display = 'inline-flex';
    }else{
      el.textContent = '';
      el.removeAttribute('aria-label');
      el.style.display = 'none';
    }
  });
}
async function refreshPresenceCounts(){
  if(!userEmail) return;
  try{
    const res = await fetch(`/api/messages/conversations/${encodeURIComponent(userEmail)}`);
    const rows = res.ok ? await res.json() : [];
    // mapujeme podľa otherName (prezývka), nie podľa emailu
    const m = new Map();
    rows.forEach(r=>{
      const key = String(r.otherName || '').toLocaleLowerCase('sk');
      const v = Number(r.unread || 0);
      if (key) m.set(key, v);
    });
    applyPresenceBadgesByName(m);
  }catch{}
}

// Načítať údaje používateľa (bez zobrazovania e-mailu)
async function loadUserInfo() {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`);
    if (!res.ok) throw new Error("Používateľ sa nenašiel");
    const data = await res.json();
    userData = data;

    const label = $("#loggedUser");
    const roleBadge = isAdmin ? " (admin mód)" : "";
    const nice = (data.name && data.name.trim()) ? data.name.trim() : "Anonym";
    if (label) label.textContent = `Prihlásený ako: ${nice}${roleBadge}`;

    const logoutBtn = document.querySelector(".btn.btn--danger");
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
  } catch (err) {
    if (isAdmin) {
      userData = { email: userEmail, name: "Admin" };
      const label = $("#loggedUser");
      if (label) label.textContent = `Prihlásený ako: Admin (admin mód)`;
      const bar = $("#composerBar");
      if (bar) bar.style.display = "none";
    } else {
      console.error("Chyba pri načítaní používateľa:", err);
      alert("Používateľ sa nenašiel. Musíte sa znova prihlásiť.");
      window.location.href = "index.html";
      return;
    }
    const logoutBtn = document.querySelector(".btn.btn--danger");
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
  }
}

// Nevhodné slová
const bannedWords = ["idiot", "debil", "hovno", "kurva", "kkt", "kokot"];
function containsBannedWords(text) {
  return bannedWords.some(word => String(text || '').toLowerCase().includes(word));
}

// ───────────────── Composer ─────────────────
function initComposer() {
  const form = $("#timelineForm");
  if (!form) return;

  const textInput = $("#postContent");
  const fileInput = $("#postImage");
  const attachBtn = $("#postImageBtn");
  const submitBtn = $("#postSubmit");
  const cnt = $("#composerCount");

  const MAX = 300;
  let selectedFile = null;

  const updateUI = () => {
    cnt.textContent = `${textInput.value.length} / ${MAX}`;
    submitBtn.disabled = !textInput.value.trim() && !selectedFile;
  };

  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    updateUI();
    setComposerPadding(); setPresenceBottom();
  });

  ["input","keyup","change"].forEach(ev => {
    textInput.addEventListener(ev, () => {
      if (textInput.value.length > MAX) textInput.value = textInput.value.slice(0, MAX);
      updateUI();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = (textInput.value || '').trim();
    const image = fileInput.files[0] || null;

    if (!userData || !userData.name || userData.name.trim() === "") {
      alert("Na príspevok musíte mať vytvorenú prezývku v nastaveniach účtu.");
      return;
    }
    if (!text && !image) { alert("Príspevok nemôže byť prázdny."); return; }
    if (containsBannedWords(text)) { alert("Príspevok obsahuje nevhodné slová."); return; }

    const formData = new FormData();
    formData.append("email", userEmail);
    formData.append("text", text);
    if (image) formData.append("image", image);

    submitBtn.disabled = true;
    try {
      const res = await fetch("/api/timeline/add", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        textInput.value = ""; fileInput.value = ""; selectedFile = null;
        updateUI(); loadPosts({ preserveScroll: true });
      } else {
        alert(data.message || "Chyba pri ukladaní príspevku.");
      }
    } catch (err) {
      console.error("Chyba:", err);
      alert("Server neodpovedá.");
    } finally {
      submitBtn.disabled = false;
    }
  });

  updateUI();
}

// ── Drafty komentárov
function collectCommentDrafts(){
  const drafts = {};
  document.querySelectorAll('form.commentForm').forEach(f=>{
    const postId = f.getAttribute('data-id');
    const val = (f.comment?.value || '').trim();
    if (postId && val) drafts[postId] = val;
  });
  return drafts;
}
function applyCommentDrafts(drafts = {}){
  Object.entries(drafts).forEach(([postId, val])=>{
    const form = document.querySelector(`form.commentForm[data-id="${postId}"]`);
    if (form && form.comment) form.comment.value = val;
  });
}

// ───────────────── Načítať príspevky ─────────────────
async function loadPosts(opts = {}) {
  const preserveScroll = !!opts.preserveScroll;
  const postFeed = $("#postFeed");

  const drafts = collectCommentDrafts();
  const prevScrollY = preserveScroll ? (scroller.scrollTop || 0) : 0;

  try {
    const res = await fetch("/api/timeline");
    const posts = await res.json();
    postFeed.innerHTML = "";

    posts.forEach(post => {
      const author   = escapeHTML(post.author || "Anonym");
      const text     = escapeHTML(post.text || "");
      const comments = Array.isArray(post.comments) ? post.comments : [];

      const canDeletePost = isAdmin || (userData && userData.name && userData.name === post.author);

      const el = document.createElement("div");
      el.className = "post";
      el.dataset.id = post._id;

      el.innerHTML = `
        <div class="post-head">
          <strong>${author}</strong>
          ${canDeletePost ? `<button class="link-btn post-delete" data-id="${post._id}">Zmazať</button>` : ""}
        </div>
        ${text ? `<p>${text}</p>` : ""}
        ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Obrázok príspevku" loading="lazy">` : ""}
        <div class="comments">
          <ul>
            ${(comments || []).map(c => {
              const canDeleteComment = (isAdmin || (userData && userData.name && (userData.name === c.author))) && c._id;
              return `
                <li>
                  <span class="comment-text"><strong>${escapeHTML(c.author || "Anonym")}</strong>: ${escapeHTML(c.text || "")}</span>
                  <span class="comment-actions">
                    ${canDeleteComment ? `<button class="link-btn comment-delete" data-post="${post._id}" data-id="${c._id}">Zmazať</button>` : ""}
                  </span>
                </li>`;
            }).join("")}
          </ul>
          ${(!isAdmin && userData && userData.name) ? `
            <form class="commentForm" data-id="${post._id}">
              <input type="text" name="comment" placeholder="Komentár..." required maxlength="300">
              <button type="submit">Pridať</button>
            </form>` : (isAdmin ? '' : `<p>Len prihlásení používatelia s prezývkou môžu komentovať.</p>`)}
        </div>
      `;
      postFeed.appendChild(el);
    });

    setComposerPadding();
    setPresenceBottom();

    applyCommentDrafts(drafts);

    if (preserveScroll) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scroller.scrollTo({ top: prevScrollY, left: 0, behavior: "auto" });
        });
      });
    }
  } catch (err) {
    console.error("Chyba pri načítaní príspevkov", err);
  }
}

// ───────────────── Komentovanie / mazanie ─────────────────
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (form.classList && form.classList.contains("commentForm")) {
    e.preventDefault();
    const postId = form.getAttribute("data-id");
    const commentText = (form.comment.value || "").trim();

    if (containsBannedWords(commentText)) { alert("Komentár obsahuje nevhodné slová."); return; }

    try {
      const response = await fetch(`/api/timeline/comment/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, text: commentText })
      });
      const data = await response.json();

      if (response.ok) loadPosts({ preserveScroll: true });
      else alert(data.message || "Chyba pri ukladaní komentára.");
    } catch (err) { alert("Server neodpovedá."); }
  }
});

document.addEventListener("click", async (e) => {
  const postBtn = e.target.closest(".post-delete");
  if (postBtn) {
    const id = postBtn.getAttribute("data-id");
    if (!confirm("Zmazať tento príspevok?")) return;
    const url = isAdmin ? `/api/admin/timeline/posts/${id}` : `/api/timeline/${id}`;
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type":"application/json" },
        body: isAdmin ? undefined : JSON.stringify({ email: userEmail })
      });
      const data = await res.json().catch(()=>({}));
      if (res.ok) loadPosts({ preserveScroll: true });
      else alert((data && data.message) || "Mazanie príspevku zlyhalo.");
    } catch { alert("Server neodpovedá."); }
  }

  const cBtn = e.target.closest(".comment-delete");
  if (cBtn) {
    const postId = cBtn.getAttribute("data-post");
    const commentId = cBtn.getAttribute("data-id");
    if (!confirm("Zmazať tento komentár?")) return;
    const url = isAdmin ? `/api/admin/timeline/posts/${postId}/comments/${commentId}`
                        : `/api/timeline/comment/${postId}/${commentId}`;
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type":"application/json" },
        body: isAdmin ? undefined : JSON.stringify({ email: userEmail })
      });
      const data = await res.json().catch(()=>({}));
      if (res.ok) loadPosts({ preserveScroll: true });
      else alert((data && data.message) || "Mazanie komentára zlyhalo.");
    } catch { alert("Server neodpovedá."); }
  }

  // Klik v pravom zozname → otvor chat podľa prezývky
  const presenceItem = e.target.closest(".presence-item");
  if (presenceItem) {
    const targetNick = (presenceItem.dataset.name || '').trim();
    if (!targetNick) return;
    // klik na seba → otvoríme všeobecné správy
    const selfNick = (userData?.name || '').trim();
    if (selfNick && targetNick.toLocaleLowerCase('sk') === selfNick.toLocaleLowerCase('sk')) {
      openMessages();
    } else {
      openPrivateChat(targetNick);
    }
  }
});

// ───────────────── Online presence ─────────────────
async function startPresenceHeartbeat(){
  const ping = async () => {
    try{
      await fetch('/api/presence/ping', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: userEmail })
      });
    }catch{}
  };
  await ping();
  setInterval(ping, 30000);
}
async function refreshPresence(){
  try{
    const res = await fetch('/api/presence');
    if(!res.ok) return;
    const users = await res.json();
    renderPresence(users);
    // doplň badge z konverzácií (podľa prezývky)
    refreshPresenceCounts();
  }catch(e){}
}
function renderPresence(users){
  const ul = $("#presenceList");
  if(!ul) return;

  const seen = new Set();
  const unique = [];
  ([FIXED_ADMIN, ...(Array.isArray(users)?users:[])]).forEach(u=>{
    if (!u) return;
    const key = String(u.email || u.name || Math.random()).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(u);
  });

  ul.innerHTML = unique.map(u => {
    const rawName = String(u.name || '').trim();
    const display = rawName || "Anonym"; // nikdy nezobraz email
    const nameLower = display.toLocaleLowerCase('sk');

    // data-key = nameLower (na párovanie badge), data-name = display (na navigáciu)
    return `
      <li class="presence-item"
          data-name="${escapeHTML(display)}"
          data-key="${escapeHTML(nameLower)}">
        <span class="dot ${u.online ? 'online':''}"></span>
        <span class="presence-name">${escapeHTML(display)}${(userData?.name && display === userData.name) ? ' (ty)' : ''}</span>
        <span class="presence-badge" data-key="${escapeHTML(nameLower)}"></span>
      </li>
    `;
  }).join('');
}

// Odhlásenie
window.logout = () => { window.location.href = "index.html"; };

// Auto-refresh guardy
function isTyping() {
  const a = document.activeElement;
  if (!a) return false;
  const tag = (a.tagName || '').toLowerCase();
  return (tag === 'input' || tag === 'textarea');
}
window.addEventListener('scroll', () => {
  userScrollActive = true;
  clearTimeout(scrollIdleTO);
  scrollIdleTO = setTimeout(() => { userScrollActive = false; }, 400);
}, { passive: true });

// ───────────────── Inicializácia ─────────────────
document.addEventListener("DOMContentLoaded", async () => {
  setComposerPadding();
  setPresenceBottom();
  window.addEventListener("resize", () => { setComposerPadding(); setPresenceBottom(); });

  await loadUserInfo();
  if (!isAdmin) initComposer();
  await loadPosts();

  // Presence
  startPresenceHeartbeat();
  refreshPresence();
  setInterval(refreshPresence, 10000);

  // 🔔 badge neprečítaných (globál)
  // (globálnu pilulku/číslo necháva tvoj /js/unread-badge.js)
});
