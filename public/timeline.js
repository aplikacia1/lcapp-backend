// frontend/public/timeline.js

// Pomôcky
function getEmailFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("email") || "";
}
function $(sel, root = document) { return root.querySelector(sel); }
function escapeHTML(str = "") {
  return String(str || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Admin mód cez ?admin=1
const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";

// Stav
const userEmail = getEmailFromURL(); // len z URL, žiadny storage
let userData = null;

// ak email chýba, pošleme na index
if (!userEmail) { window.location.href = "index.html"; }

// Dolný padding podľa výšky composeru
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

// Navigácia späť
function backToCatalog(){
  const e = userEmail;
  window.location.href = e ? `catalog.html?email=${encodeURIComponent(e)}` : `catalog.html`;
}

// 🔸 Správy
function openMessages(){
  const url = `messages.html?email=${encodeURIComponent(userEmail)}${isAdmin ? '&admin=1':''}`;
  location.href = url;
}

// 🔔 Badge neprečítaných správ
async function refreshUnreadBadge(){
  if(!userEmail) return;
  try{
    const r = await fetch(`/api/messages/unread-count/${encodeURIComponent(userEmail)}`);
    const j = r.ok ? await r.json() : { count: 0 };
    const n = Number(j?.count || 0);
    const b = document.getElementById('msgBadge');
    if(!b) return;
    if(n > 0){
      b.style.display = 'inline-flex';
      b.textContent = n > 99 ? '99+' : String(n);
    }else{
      b.style.display = 'none';
    }
  }catch{}
}

// Načítať údaje používateľa
async function loadUserInfo() {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`);
    if (!res.ok) throw new Error("Používateľ sa nenašiel");
    const data = await res.json();
    userData = data;

    const label = $("#loggedUser");
    const roleBadge = isAdmin ? " (admin mód)" : "";
    if (label) label.textContent = `Prihlásený ako: ${data.name || data.email}${roleBadge}`;

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

// Inicializácia
document.addEventListener("DOMContentLoaded", async () => {
  setComposerPadding();
  setPresenceBottom();
  window.addEventListener("resize", () => { setComposerPadding(); setPresenceBottom(); });

  await loadUserInfo();
  if (!isAdmin) initComposer();
  loadPosts();

  // Presence – heartbeat + refresh
  startPresenceHeartbeat();
  refreshPresence();
  setInterval(refreshPresence, 10000);

  // 🔔 badge neprečítaných – prvé načítanie + interval
  await refreshUnreadBadge();
  setInterval(refreshUnreadBadge, 20000);
});

// Nevhodné slová
const bannedWords = ["idiot", "debil", "hovno", "kurva", "kkt", "kokot"];
function containsBannedWords(text) {
  return bannedWords.some(word => String(text || '').toLowerCase().includes(word));
}

// Minimalistický composer (fixne dole)
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

    const text = textInput.value.trim();
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
        updateUI(); loadPosts();
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

// Načítať príspevky
async function loadPosts() {
  const postFeed = $("#postFeed");
  try {
    const res = await fetch("/api/timeline");
    const posts = await res.json();
    postFeed.innerHTML = "";

    posts.forEach(post => {
      const author = escapeHTML(post.author || "Neznámy");
      const text = escapeHTML(post.text || "");
      const comments = Array.isArray(post.comments) ? post.comments : [];

      const canDeletePost = isAdmin || (userData && userData.name && userData.name === post.author);

      const postEl = document.createElement("div");
      postEl.className = "post";
      postEl.innerHTML = `
        <div class="post-head">
          <strong>${author}</strong>
          ${canDeletePost ? `<button class="link-btn post-delete" data-id="${post._id}">Zmazať</button>` : ""}
        </div>
        <p>${text}</p>
        ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Obrázok príspevku">` : ""}
        <div class="comments">
          <ul>
            ${(comments || []).map(c => {
              const canDeleteComment = (isAdmin || (userData && userData.name && (userData.name === c.author))) && c._id;
              return `
                <li>
                  <span class="comment-text"><strong>${escapeHTML(c.author || "Anon")}</strong>: ${escapeHTML(c.text || "")}</span>
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
      postFeed.appendChild(postEl);
    });

    setComposerPadding(); setPresenceBottom();
  } catch (err) {
    console.error("Chyba pri načítaní príspevkov", err);
  }
}

// Komentovanie
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

      if (response.ok) loadPosts();
      else alert(data.message || "Chyba pri ukladaní komentára.");
    } catch (err) { alert("Server neodpovedá."); }
  }
});

// Mazanie príspevku / komentára (admin má vlastné endpointy)
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
      if (res.ok) loadPosts();
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
      if (res.ok) loadPosts();
      else alert((data && data.message) || "Mazanie komentára zlyhalo.");
    } catch { alert("Server neodpovedá."); }
  }
});

// ======= ONLINE PRESENCE =======
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
  }catch(e){}
}

function renderPresence(users){
  const ul = $("#presenceList");
  if(!ul) return;
  ul.innerHTML = users.map(u => `
    <li class="presence-item">
      <span class="dot ${u.online ? 'online':''}"></span>
      <span class="presence-name" title="${escapeHTML(u.email)}">
        ${escapeHTML(u.name || u.email)}${u.email === userEmail ? ' (ty)' : ''}
      </span>
    </li>
  `).join('');
}

// Odhlásenie (globálna funkcia z HTML)
window.logout = () => { window.location.href = "index.html"; };
