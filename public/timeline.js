// ────────── Pomôcky ──────────
function getEmailFromURL() {
  const p = new URLSearchParams(location.search);
  return p.get("email") || "";
}
function $(s, r = document) { return r.querySelector(s); }
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[m]));
}
const scroller = document.scrollingElement || document.documentElement;
const isAdmin = new URLSearchParams(location.search).get("admin") === "1";

// fixný admin v zozname
const FIXED_ADMIN = { email: "bratislava@listovecentrum.sk", name: "Lištové centrum", online: true };

const userEmail = getEmailFromURL();
let userData = null;
if (!userEmail) location.href = "index.html";

// ────────── UI helpers ──────────
function setComposerPadding() {
  const bar = $("#composerBar"), main = $(".main-content");
  if (!bar || !main) return;
  main.style.paddingBottom = (bar.offsetHeight || 120) + 16 + "px";
}
function openMessages(toName = null) {
  const to = toName ? `&to=${encodeURIComponent(toName)}` : "";
  const url = `messages.html?email=${encodeURIComponent(userEmail)}${to}${isAdmin ? '&admin=1' : ''}`;
  location.href = url;
}

// toast (light verzia – môžeš nahradiť window.toast)
const toast = (msg) => alert(msg);

// ────────── Načítanie užívateľa ──────────
async function loadUserInfo() {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`);
    if (!res.ok) throw 0;
    userData = await res.json();
    const nice = (userData.name || '').trim() || "Anonym";
    const roleBadge = isAdmin ? " (admin mód)" : "";
    $("#loggedUser").textContent = `Prihlásený ako: ${nice}${roleBadge}`;
    if (isAdmin) {
      $("#composerBar").style.display = "none";
    }
  } catch {
    if (isAdmin) {
      userData = { email: userEmail, name: "Admin" };
      $("#loggedUser").textContent = `Prihlásený ako: Admin (admin mód)`;
      $("#composerBar").style.display = "none";
      return;
    }
    alert("Používateľ sa nenašiel. Prihlás sa znova.");
    location.href = "index.html";
  }
}

// ────────── Composer ──────────
function initComposer() {
  const form = $("#timelineForm");
  if (!form) return;

  const text = $("#postContent"),
    file = $("#postImage"),
    add = $("#postImageBtn"),
    btn = $("#postSubmit"),
    cnt = $("#composerCount");

  let selected = null;
  const MAX = 300;

  const up = () => {
    cnt.textContent = `${text.value.length} / ${MAX}`;
    btn.disabled = !text.value.trim() && !selected;
  };

  add.addEventListener("click", () => file.click());

  file.addEventListener("change", () => {
    selected = file.files?.[0] || null;
    up();
    setComposerPadding();
  });

  ["input", "keyup", "change"].forEach(ev =>
    text.addEventListener(ev, () => {
      if (text.value.length > MAX) text.value = text.value.slice(0, MAX);
      up();
    })
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = (text.value || "").trim();
    const img = file.files?.[0] || null;

    if (!userData?.name) {
      alert("Na príspevok potrebuješ prezývku.");
      return;
    }
    if (!t && !img) {
      alert("Prázdny príspevok.");
      return;
    }

    const fd = new FormData();
    fd.append("email", userEmail);
    fd.append("text", t);
    if (img) fd.append("image", img);

    btn.disabled = true;
    try {
      const r = await fetch("/api/timeline/add", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) {
        text.value = "";
        file.value = "";
        selected = null;
        up();
        loadPosts({ preserve: true });
      } else {
        alert(d.message || "Chyba pri ukladaní.");
      }
    } catch {
      alert("Server neodpovedá.");
    } finally {
      btn.disabled = false;
    }
  });

  up();
}

// ────────── Posts ──────────
function authorAvatarURL(name) {
  // (poznámka: avatar sa načítava cez /api/users/public/by-name priamo nižšie)
  return `/api/users/public/by-name/${encodeURIComponent(name)}`;
}

async function loadPosts(opts = {}) {
  const preserve = !!opts.preserve;
  const feed = $("#postFeed");
  const prevY = preserve ? (scroller.scrollTop || 0) : 0;

  try {
    const r = await fetch(`/api/timeline?email=${encodeURIComponent(userEmail)}`);
    const posts = await r.json();
    feed.innerHTML = "";

    posts.forEach(p => {
      const author = esc(p.author || "Anonym");
      const text = esc(p.text || "");
      const comments = Array.isArray(p.comments) ? p.comments : [];
      const canDel = isAdmin || (userData?.name && userData.name === p.author);

      const el = document.createElement("div");
      el.className = "post";
      el.dataset.id = p._id;
      el.innerHTML = `
        <div class="post-head">
          <div class="post-author">
            <img class="avatar" src="/img/avatar_default.png" alt="" data-author="${esc(p.author || 'Anonym')}">
            <strong>${author}</strong>
          </div>
          ${canDel ? `<button class="link-btn post-delete" data-id="${p._id}">Zmazať</button>` : ""}
        </div>
        ${text ? `<p>${text}</p>` : ""}
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-image" alt="Obrázok príspevku" loading="lazy">` : ""}
        <div class="comments">
          <ul>
            ${(comments || []).map(c => {
              const cDel = (isAdmin || (userData?.name && userData.name === c.author)) && c._id;
              return `<li>
                <span class="comment-text"><strong>${esc(c.author || "Anonym")}</strong>: ${esc(c.text || "")}</span>
                <span class="comment-actions">${cDel ? `<button class="link-btn comment-delete" data-post="${p._id}" data-id="${c._id}">Zmazať</button>` : ""}</span>
              </li>`;
            }).join("")}
          </ul>
          ${(!isAdmin && userData?.name) ? `
            <form class="commentForm" data-id="${p._id}">
              <input type="text" name="comment" placeholder="Komentár..." required maxlength="300">
              <button type="submit">Pridať</button>
            </form>` : (isAdmin ? "" : `<p>Len prihlásení s prezývkou môžu komentovať.</p>`)}
        </div>`;

      feed.appendChild(el);
    });

    // doplň avatary (GET public profil podľa mena)
    document.querySelectorAll('img.avatar[data-author]').forEach(async img => {
      const nick = img.getAttribute('data-author');
      if (!nick) return;
      try {
        const res = await fetch(`/api/users/public/by-name/${encodeURIComponent(nick)}`);
        if (!res.ok) return;
        const u = await res.json();
        if (u?.avatarUrl) img.src = u.avatarUrl;
      } catch { }
    });

    // vráť scroll
    if (preserve) {
      requestAnimationFrame(() => {
        scroller.scrollTo({ top: prevY, left: 0, behavior: "auto" });
      });
    }
    setComposerPadding();
  } catch (e) {
    console.error(e);
  }
}

// komentár submit
document.addEventListener("submit", async (e) => {
  const f = e.target;
  if (!f.classList?.contains("commentForm")) return;
  e.preventDefault();
  const id = f.dataset.id;
  const txt = (f.comment.value || "").trim();
  if (!txt) return;
  try {
    const r = await fetch(`/api/timeline/comment/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, text: txt })
    });
    const d = await r.json();
    if (r.ok) {
      loadPosts({ preserve: true });
    } else {
      alert(d.message || "Chyba pri ukladaní komentára.");
    }
  } catch {
    alert("Server neodpovedá.");
  }
});

// mazanie post/komentár + klik na používateľa (profil)
document.addEventListener("click", async (e) => {
  const pBtn = e.target.closest(".post-delete");
  if (pBtn) {
    const id = pBtn.dataset.id;
    if (!confirm("Zmazať tento príspevok?")) return;
    const url = isAdmin ? `/api/admin/timeline/posts/${id}` : `/api/timeline/${id}`;
    try {
      const r = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: isAdmin ? undefined : JSON.stringify({ email: userEmail })
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        loadPosts({ preserve: true });
      } else {
        alert(d.message || "Mazanie zlyhalo.");
      }
    } catch {
      alert("Server neodpovedá.");
    }
    return;
  }

  const cBtn = e.target.closest(".comment-delete");
  if (cBtn) {
    const postId = cBtn.dataset.post, cid = cBtn.dataset.id;
    if (!confirm("Zmazať tento komentár?")) return;
    const url = isAdmin
      ? `/api/admin/timeline/posts/${postId}/comments/${cid}`
      : `/api/timeline/comment/${postId}/${cid}`;
    try {
      const r = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: isAdmin ? undefined : JSON.stringify({ email: userEmail })
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        loadPosts({ preserve: true });
      } else {
        alert(d.message || "Mazanie komentára zlyhalo.");
      }
    } catch {
      alert("Server neodpovedá.");
    }
    return;
  }

  // klik na používateľa v pravej lište → PROFIL
  const li = e.target.closest(".presence-item");
  if (li) {
    const targetNick = (li.dataset.name || "").trim();
    if (!targetNick) return;
    openProfileCard(targetNick);
  }
});

// ────────── Presence ──────────
async function startPresenceHeartbeat() {
  const ping = async () => {
    try {
      await fetch('/api/presence/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
    } catch { }
  };
  await ping();
  setInterval(ping, 30000);
}
async function refreshPresence() {
  try {
    const r = await fetch('/api/presence');
    if (!r.ok) return;
    const users = await r.json();
    renderPresence(users);
  } catch { }
}
function renderPresence(users) {
  const ul = $("#presenceList");
  if (!ul) return;
  const seen = new Set();
  const list = [FIXED_ADMIN, ...(Array.isArray(users) ? users : [])];
  const unique = [];
  list.forEach(u => {
    if (!u) return;
    const key = String(u.email || u.name || Math.random()).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(u);
  });
  const selfNick = (userData?.name || "").trim();
  ul.innerHTML = unique.map(u => {
    const display = (String(u.name || "").trim()) || "Anonym";
    const nameLower = display.toLocaleLowerCase('sk');
    return `<li class="presence-item" data-name="${esc(display)}" data-key="${esc(nameLower)}">
      <span class="dot ${u.online ? 'online' : ''}"></span>
      <span class="presence-name">${esc(display)}${(selfNick && display === selfNick) ? ' (ty)' : ''}</span>
      <span class="presence-badge" data-key="${esc(nameLower)}"></span>
    </li>`;
  }).join('');
}

// ────────── PROFIL – modal ──────────
function showProfileModal() {
  const b = $("#profileBackdrop");
  if (b) b.style.display = "flex";
}
function hideProfileModal() {
  const b = $("#profileBackdrop");
  if (b) b.style.display = "none";
}
$("#profileCloseBtn")?.addEventListener("click", hideProfileModal);
$("#profileBackdrop")?.addEventListener("click", (e) => {
  if (e.target.id === "profileBackdrop") hideProfileModal();
});

async function openProfileCard(nick) {
  try {
    const res = await fetch(`/api/users/public/by-name/${encodeURIComponent(nick)}`);
    let data = null;
    if (res.ok) data = await res.json();

    // 🔹 Rozdelenie polí:
    const city = data?.city || "";
    const bio = data?.bio || "";
    const company =
      data?.company ||
      data?.companyName ||
      data?.firma ||
      data?.firm ||
      "";

    const websiteRaw =
      data?.website ||
      data?.web ||
      data?.url ||
      "";

    $("#profileName").textContent = data?.name || nick;
    $("#profileCity").textContent = city || "—";

    $("#profileCompany").textContent = company;
    $("#profileBio").textContent = bio;

    // Web – klikateľný odkaz, ak existuje
    const websiteEl = $("#profileWebsite");
    if (websiteRaw) {
      let url = String(websiteRaw).trim();
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      websiteEl.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(websiteRaw)}</a>`;
    } else {
      websiteEl.textContent = "";
    }

    $("#profileCompanyRow").style.display = company ? "" : "none";
    $("#profileWebsiteRow").style.display = websiteRaw ? "" : "none";
    $("#profileBioRow").style.display = bio ? "" : "none";

    $("#profileEmptyRow").style.display =
      (data && (city || bio || company || websiteRaw || data.avatarUrl))
        ? "none" : "";

    const avatar = data?.avatarUrl || "/img/avatar_default.png";
    $("#profileAvatar").src = avatar;

    // tlačidlá
    $("#profileMsgBtn").onclick = (e) => {
      e.stopPropagation();
      openMessages(nick);
    };
    // BLOKOVAŤ používateľa
    const blockBtn = $("#profileBlockBtn");
    if (blockBtn) {
      blockBtn.onclick = async (e) => {
      e.stopPropagation();
      try {        

      const r = await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          targetEmail: data?.email
        })
      });

      if (!r.ok) throw 0;

      toast("Používateľ bol zablokovaný");
      hideProfileModal();

    } catch {
      toast("Blokovanie sa nepodarilo");
    }
  };
}
    $("#profileEditBtn").style.display =
      (userData?.name && userData.name.toLocaleLowerCase('sk') === nick.toLocaleLowerCase('sk'))
        ? "" : "none";
    $("#profileEditBtn").onclick = () => location.href = `dashboard.html?email=${encodeURIComponent(userEmail)}`;

    showProfileModal();
  } catch {
    $("#profileName").textContent = nick;
    $("#profileCity").textContent = "—";
    $("#profileAvatar").src = "/img/avatar_default.png";
    $("#profileCompanyRow").style.display = "none";
    $("#profileWebsiteRow").style.display = "none";
    $("#profileBioRow").style.display = "none";
    $("#profileEmptyRow").style.display = "";
    showProfileModal();
  }
}

// ────────── Init ──────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadUserInfo();
  if (!isAdmin) initComposer();
  await loadPosts();

  startPresenceHeartbeat();
  refreshPresence();
  setInterval(refreshPresence, 10000);
  setComposerPadding();
});

// =======================================================
// Reklamný popup – spoločná logika pre timeline
// =======================================================
(function () {
  const AD_DISMISS_KEY = "lcAdDismissedDate";

  function shouldShowByTime() {
    const now = new Date();
    const hour = now.getHours();
    // zobrazovať okolo 9:00, 12:00 a 18:00
    return hour === 9 || hour === 12 || hour === 18;
  }

  function isDismissedToday() {
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      return localStorage.getItem(AD_DISMISS_KEY) === today;
    } catch (_) {
      return false;
    }
  }

  function markDismissedToday() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(AD_DISMISS_KEY, today);
    } catch (_) {
      // nič, len sa nepodarilo uložiť
    }
  }

  async function fetchCurrentAd() {
    try {
      const res = await fetch("/api/ads/current", {
        credentials: "include",
      });
      if (!res.ok) return null;
      const ad = await res.json();
      if (!ad || !ad.imageUrl) return null;
      return ad;
    } catch (e) {
      console.warn("Ad fetch failed:", e);
      return null;
    }
  }

  function createAdPopup(ad, forceTest) {
    // overlay pozadie
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0, 0, 0, 0.55)";
    overlay.style.zIndex = "99998";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.backdropFilter = "blur(3px)";

    // okno
    const box = document.createElement("div");
    box.style.background = "#ffffff";
    box.style.borderRadius = "16px";
    box.style.boxShadow = "0 12px 40px rgba(0,0,0,.35)";
    box.style.maxWidth = "480px";
    box.style.width = "90vw";
    box.style.maxHeight = "90vh";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.overflow = "hidden";
    box.style.position = "relative";

    // horný panel s krížikom
    const topBar = document.createElement("div");
    topBar.style.display = "flex";
    topBar.style.justifyContent = "flex-end";
    topBar.style.alignItems = "center";
    topBar.style.padding = "6px 10px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "Zavrieť reklamu");
    closeBtn.style.border = "none";
    closeBtn.style.background = "transparent";
    closeBtn.style.fontSize = "20px";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.color = "#333";

    topBar.appendChild(closeBtn);

    // obrázok reklamy
    const link = document.createElement("a");
    link.href = ad.targetUrl || "#";
    if (ad.targetUrl) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.style.display = "block";

    const img = document.createElement("img");
    img.src = ad.imageUrl;
    img.alt = "Reklama";
    img.style.display = "block";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.objectFit = "contain";
    img.style.background = "#0b1c45";

    link.appendChild(img);

    // spodný text
    const footer = document.createElement("div");
    footer.textContent = ad.targetUrl || "Reklama Lištového centra";
    footer.style.fontSize = "12px";
    footer.style.padding = "6px 10px";
    footer.style.color = "#444";
    footer.style.background = "#f3f6ff";

    box.appendChild(topBar);
    box.appendChild(link);
    box.appendChild(footer);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function closePopup() {
      overlay.remove();
      if (!forceTest) {
        markDismissedToday();
      }
    }

    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePopup();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closePopup();
      }
    });
  }

  async function initAdPopup() {
    const params = new URLSearchParams(window.location.search);
    const forceTest = params.get("showAdTest") === "1";

    if (!forceTest) {
      // bežný režim – skúsime až po splnení podmienok
      if (!shouldShowByTime()) return;
      if (isDismissedToday()) return;
    }

    const ad = await fetchCurrentAd();
    if (!ad) return;

    createAdPopup(ad, forceTest);
  }

  // spusti po načítaní stránky (timeline)
  document.addEventListener("DOMContentLoaded", () => {
    initAdPopup();
  });
})();
