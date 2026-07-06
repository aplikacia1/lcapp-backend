// public/product_detail.js
(function () {
  function getParams() {
    const p = new URLSearchParams(location.search);
    return {
      id: p.get("id") || p.get("pid") || "",
      categoryId: p.get("categoryId") || p.get("cat") || "",
      email: p.get("email") || "",
      from: p.get("from") || "",
      zis: p.get("zis") || "",
    };
  }
  function $(s, r = document) { return r.querySelector(s); }
  function escapeHTML(s = "") {
    return String(s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  const cleanUploadPath = (s = "") =>
    String(s).replace(/^\/?uploads[\\/]/i, "").replace(/^\/+/, "");

  // ✅ inline placeholder obrázok
  const IMG_PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">
         <rect width="100%" height="100%" fill="#0b1c45"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               font-family="Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.85">
           Bez obrázka
         </text>
       </svg>`
    );

  const API_BASE = (window.API_BASE || "").replace(/\/+$/, "");
  const {
  id: productId,
  categoryId,
  email,
  from,
  zis
} = getParams();
  let selectedStars = 5;

  // 🔹 uloženie categoryId pre návrat
  if (categoryId) {
    try {
      sessionStorage.setItem("lastCategoryId", categoryId);
    } catch (_) {}
  }

  function goBack() {
    if (from === "zis" && zis) {

  let url =
    "zis_detail.html?id=" +
    encodeURIComponent(zis);

  if (email) {
    url +=
      "&email=" +
      encodeURIComponent(email);
  }

  location.href = url;
  return;
}
    const cat = categoryId || (function () {
      try { return sessionStorage.getItem("lastCategoryId") || ""; }
      catch (_) { return ""; }
    })();

    const url = cat
      ? `products.html?categoryId=${encodeURIComponent(cat)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
      : (email ? `catalog.html?email=${encodeURIComponent(email)}` : "catalog.html");

    location.href = url;
  }
  window.goBack = goBack;

  // ✅ next URL (návrat na tento produkt po login/registrácii)
  function buildNextUrlWithEmail(nextEmail) {
    const p = new URLSearchParams(location.search);
    // vždy chceme mať id
    p.set("id", productId);
    if (categoryId) p.set("categoryId", categoryId);
    if (nextEmail) p.set("email", nextEmail);
    // vrátime relatívnu URL
    return `product_detail.html?${p.toString()}`;
  }

  function buildNextParam() {
    // pre návštevníka bez emailu: uložíme návratovú URL bez emailu,
    // login/register si po úspechu typicky doplní email do návratu (ak to podporuje).
    const p = new URLSearchParams(location.search);
    p.set("id", productId);
    if (categoryId) p.set("categoryId", categoryId);
    p.delete("email");
    return encodeURIComponent(`product_detail.html?${p.toString()}`);
  }

  async function j(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  async function fetchProduct(id) {
    const urls = [
      `${API_BASE}/api/products/${encodeURIComponent(id)}`,
      `${API_BASE}/api/product/${encodeURIComponent(id)}`,
      `${API_BASE}/api/products?id=${encodeURIComponent(id)}`,
      `${API_BASE}/api/products/by-id/${encodeURIComponent(id)}`
    ];
    for (const u of urls) {
      try {
        const data = await j(u);
        const obj = Array.isArray(data) ? data[0] : data;
        if (obj && typeof obj === "object") {
          console.log("[detail] product from", u);
          return obj;
        }
      } catch (e) {
        console.warn("[detail] product try failed:", u, e.message);
      }
    }
    throw new Error("Produkt sa nenašiel.");
  }

  async function fetchSummary(id) {
    const urls = [
      `${API_BASE}/api/ratings/summary/${encodeURIComponent(id)}`,
      `${API_BASE}/api/ratings/summary?productId=${encodeURIComponent(id)}`,
      `${API_BASE}/api/products/${encodeURIComponent(id)}/ratings/summary`,
      `${API_BASE}/api/ratings/avg/${encodeURIComponent(id)}`
    ];
    for (const u of urls) {
      try {
        const s = await j(u);
        console.log("[detail] summary from", u, s);
        const avg = Number(s?.average ?? s?.avg ?? s?.averageRating ?? 0);
        const count = Number(s?.count ?? s?.ratingCount ?? 0);
        return { avg: isFinite(avg) ? avg : 0, count: isFinite(count) ? count : 0 };
      } catch (e) {
        console.warn("[detail] summary try failed:", u, e.message);
      }
    }
    return { avg: 0, count: 0 };
  }

  async function fetchReviews(id) {
    const urls = [
      `${API_BASE}/api/ratings/list/${encodeURIComponent(id)}`,
      `${API_BASE}/api/ratings?productId=${encodeURIComponent(id)}`,
      `${API_BASE}/api/products/${encodeURIComponent(id)}/ratings`,
      `${API_BASE}/api/products/${encodeURIComponent(id)}/reviews`,
      `${API_BASE}/api/reviews?productId=${encodeURIComponent(id)}`
    ];
    for (const u of urls) {
      try {
        const list = await j(u);
        const arr = Array.isArray(list) ? list
          : Array.isArray(list?.items) ? list.items
          : Array.isArray(list?.reviews) ? list.reviews
          : null;
        if (arr) {
          console.log("[detail] reviews from", u, arr.length);
          return arr;
        }
      } catch (e) {
        console.warn("[detail] reviews try failed:", u, e.message);
      }
    }
    return [];
  }

  async function loadProduct() {
    if (!productId) {
      alert("Chýba ID produktu.");
      return;
    }
    try {
      const p = await fetchProduct(productId);

      $("#productTitle") && ($("#productTitle").textContent = p.name || "Produkt");

      const metaEl = $("#productMeta");
      if (metaEl) {
        const eur = new Intl.NumberFormat("sk-SK", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 2
        });
        const hasPrice = p.price != null && isFinite(Number(p.price));
        const priceTxt = hasPrice
          ? `${eur.format(Number(p.price))}${p.unit ? ` / ${p.unit}` : ""}`
          : "";
        const codeTxt = p.code ? ` · kód: ${p.code}` : "";
        metaEl.textContent = [priceTxt, codeTxt].filter(Boolean).join("");
      }

      $("#productDescription") && ($("#productDescription").textContent = p.description || "");

      const imgEl = $("#productImage");
      if (imgEl) {
        const src = p.image ? `/uploads/${cleanUploadPath(p.image)}` : IMG_PLACEHOLDER;
        imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = IMG_PLACEHOLDER; };
        imgEl.src = src;
        imgEl.alt = p.name || "Produkt";
      }

      // ✅ tlačidlá „Technický list“ / „Kúpiť v e-shope“
      const actions = $("#productActions");
      if (actions) {
        const norm = (v) => (v && String(v).trim()) || "";

        const techUrl =
          norm(p.techSheetUrl || p.techSheet || p.technicalSheetUrl || p.technicalUrl);
        const shopUrl =
          norm(p.shopUrl || p.eShopUrl || p.eshopUrl || p.shopLink || p.eShopLink);

        const parts = [];
        if (techUrl) {
          parts.push(
            `<a href="${techUrl}" target="_blank" rel="noopener noreferrer">
               <span class="icon">📄</span><span>Technický list</span>
             </a>`
          );
        }
        if (shopUrl) {
          parts.push(
            `<a href="${shopUrl}" target="_blank" rel="noopener noreferrer">
               <span class="icon">🛒</span><span>Kúpiť v e-shope</span>
             </a>`
          );
        }

        if (parts.length) {
          actions.innerHTML = parts.join("");
          actions.style.display = "";
        } else {
          actions.innerHTML = "";
          actions.style.display = "none";
        }
      }
    } catch (e) {
      console.warn("[product]", e.message);
      $("#productTitle") && ($("#productTitle").textContent = "Produkt");
      $("#productMeta") && ($("#productMeta").textContent = "");
      $("#productDescription") && ($("#productDescription").textContent = "Produkt sa nenašiel.");
      const imgEl = $("#productImage");
      if (imgEl) { imgEl.onerror = null; imgEl.src = IMG_PLACEHOLDER; }
    }
  }

  async function loadSummary() {
    const { avg, count } = await fetchSummary(productId);
    const avgEl = $("#ratingAverage"), cntEl = $("#ratingCount");
    if (count > 0) {
      avgEl && (avgEl.textContent = `★ ${avg.toFixed(1)}`);
      cntEl && (cntEl.textContent = `${count} hodnotení`);
    } else {
      avgEl && (avgEl.textContent = "Zatiaľ bez hodnotení");
      cntEl && (cntEl.textContent = "");
    }
  }

  async function loadReviews() {
    const list = await fetchReviews(productId);
    const box = $("#reviewsList"); if (!box) return;
    if (!Array.isArray(list) || !list.length) { box.innerHTML = ""; return; }
    box.innerHTML = list.map(r => {
      const who = escapeHTML(r.authorName || r.userName || "Anonym");
      const stars = Number(r.stars ?? r.rating ?? 0);
      const when = r.createdAt || r.date || r.updatedAt;
      const whenTxt = when ? new Date(when).toLocaleString("sk-SK") : "";
      const comment = r.comment || r.text || "";
      return `
        <article class="review">
          <div class="head">
            <div class="who">${who}</div>
            <div class="when">${whenTxt}</div>
          </div>
          <div class="stars">★${stars}</div>
          ${comment ? `<div class="text">${escapeHTML(comment)}</div>` : ""}
        </article>
      `;
    }).join("");
  }

  function bindStars() {
    const wrap = $("#rateStars"); if (!wrap) return;
    const paint = () =>
      wrap.querySelectorAll("[data-star]").forEach(el => {
        const v = Number(el.getAttribute("data-star"));
        el.style.opacity = (v <= selectedStars) ? "1" : ".35";
      });
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-star]"); if (!b) return;
      selectedStars = Number(b.getAttribute("data-star")) || 5;
      paint();
    });
    paint();
  }

  // ===== Auth modal helpers =====
  function openAuthModal() {
    const modal = $("#authPrompt");
    if (modal) modal.style.display = "flex";
  }

  function wireAuthModal() {
    const authModal = $("#authPrompt");
    if (!authModal) return;

    const closeBtn = authModal.querySelector("[data-auth-close]");
    const login = authModal.querySelector("[data-auth-login]");
    const register = authModal.querySelector("[data-auth-register]");

    const hide = () => { authModal.style.display = "none"; };

    closeBtn && closeBtn.addEventListener("click", hide);
    authModal.addEventListener("click", (e) => { if (e.target === authModal) hide(); });

    // ✅ Presmerovanie s next parametrom
    login && login.addEventListener("click", () => {
      location.href = `login.html?next=${buildNextParam()}`;
    });
    register && register.addEventListener("click", () => {
      location.href = `register.html?next=${buildNextParam()}`;
    });
  }

  // ===== Nickname modal =====
  function openNickModal() {
    const modal = $("#nickPrompt");
    if (modal) modal.style.display = "flex";
  }
  function closeNickModal() {
    const modal = $("#nickPrompt");
    if (modal) modal.style.display = "none";
  }

  async function saveNickname(nickname) {
    const msg = $("#nickMsg");
    const btn = document.querySelector("[data-nick-save]");

    const setMsg = (t) => { if (msg) msg.textContent = t || ""; };
    const lock = (v) => {
      if (btn) btn.disabled = !!v;
      if (btn) btn.textContent = v ? "Ukladám…" : "Uložiť prezývku";
    };

    const clean = String(nickname || "").trim();
    if (!clean || clean.length < 2) {
      setMsg("Zadajte prezývku (min. 2 znaky).");
      return false;
    }

    try {
      lock(true);
      setMsg("");

      // Skúsime viac možností endpointu, aby to fungovalo aj pri odlišnej implementácii
      const candidates = [
        {
          url: `${API_BASE}/api/users/${encodeURIComponent(email)}`,
          method: "PUT",
          body: { name: clean }
        },
        {
          url: `${API_BASE}/api/users/${encodeURIComponent(email)}`,
          method: "PATCH",
          body: { name: clean }
        },
        {
          url: `${API_BASE}/api/users/update`,
          method: "POST",
          body: { email, name: clean }
        }
      ];

      let lastErr = null;
      for (const c of candidates) {
        try {
          const res = await fetch(c.url, {
            method: c.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c.body)
          });
          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            // typicky: 409 konflikt prezývky, 400 validácia, 403 atď.
            lastErr = data?.message || `Chyba ${res.status}`;
            continue;
          }

          // úspech
          setMsg("Prezývka uložená ✅");
          await loadUserLabel(); // nech sa hneď ukáže v hlavičke
          return true;
        } catch (e) {
          lastErr = e?.message || "Server neodpovedá";
        }
      }

      setMsg(lastErr || "Nepodarilo sa uložiť prezývku.");
      return false;
    } finally {
      lock(false);
    }
  }

  function wireNickModal() {
    const modal = $("#nickPrompt");
    if (!modal) return;

    const close = modal.querySelector("[data-nick-close]");
    const later = modal.querySelector("[data-nick-later]");
    const save = modal.querySelector("[data-nick-save]");
    const input = $("#nickInput");

    const hide = () => closeNickModal();

    close && close.addEventListener("click", hide);
    later && later.addEventListener("click", hide);
    modal.addEventListener("click", (e) => { if (e.target === modal) hide(); });

    save && save.addEventListener("click", async () => {
      const ok = await saveNickname(input?.value || "");
      if (ok) closeNickModal();
    });

    input && input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const ok = await saveNickname(input.value || "");
        if (ok) closeNickModal();
      }
    });
  }

  // ✅ načítanie používateľa do hlavičky + zistenie prezývky
  async function fetchUser(emailAddr) {
    const urls = [
      `/api/users/${encodeURIComponent(emailAddr)}`,
      `${API_BASE}/api/users/${encodeURIComponent(emailAddr)}`
    ];
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (!res.ok) continue;
        return await res.json();
      } catch (_) {}
    }
    return null;
  }

  async function loadUserLabel() {
    const el = $("#userGreeting");
    if (!el) return;

    if (!email) {
      el.textContent = "Neprihlásený návštevník (len náhľad produktu)";
      return;
    }

    try {
      const u = await fetchUser(email);
      if (!u) {
        el.textContent = email;
        return;
      }
      const nick = (u.name || "").trim();
      if (nick) {
        el.textContent = `Prihlásený ako: ${nick}`;
      } else {
        el.textContent = email;
      }
    } catch {
      el.textContent = email;
    }
  }

  // ✅ po návrate: ak je prihlásený, ale nemá prezývku → otvor modal
  async function maybePromptNickname() {
    if (!email) return;

    const u = await fetchUser(email);
    const nick = (u?.name || "").trim();
    if (!nick) {
      // otvor iba raz za načítanie (aby to neotravovalo)
      openNickModal();
      const inp = $("#nickInput");
      if (inp) setTimeout(() => inp.focus(), 50);
    }
  }

  async function sendRating() {
    // 🔔 ak nie je email, ukáž prihlásenie/registráciu s návratom
    if (!email) {
      openAuthModal();
      return;
    }

    const comment = ($("#rateComment")?.value || "").trim();
    const btn = $("#rateSubmit"), msg = $("#rateMsg");
    const lock = v => {
      if (btn) {
        btn.disabled = v;
        btn.textContent = v ? "Odosielam…" : "Odoslať";
      }
    };

    try {
      lock(true);
      const res = await fetch(`${API_BASE}/api/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email, stars: selectedStars, comment })
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        // ✅ Ak server povie "nemáš prezývku" → otvor modal a rovno nastav
        msg && (msg.textContent = data?.message || "Najprv si nastav prezývku.");
        openNickModal();
        const inp = $("#nickInput");
        if (inp) setTimeout(() => inp.focus(), 50);
        return;
      }
      if (res.status === 409) {
        msg && (msg.textContent = "Už ste tento produkt hodnotili.");
        return;
      }
      if (!res.ok) {
        msg && (msg.textContent = data?.message || "Chyba pri odoslaní hodnotenia.");
        return;
      }

      $("#rateComment") && ($("#rateComment").value = "");
      msg && (msg.textContent = "Hodnotenie bolo uložené. Ďakujeme!");
      await loadSummary();
      await loadReviews();
    } catch {
      msg && (msg.textContent = "Server neodpovedá.");
    } finally {
      lock(false);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!productId) {
      alert("Chýba ID produktu.");
      return;
    }

    bindStars();
    $("#rateSubmit") && $("#rateSubmit").addEventListener("click", e => {
      e.preventDefault();
      sendRating();
    });

    wireAuthModal();
    wireNickModal();

    await loadUserLabel();
    await loadProduct();
    await loadSummary();
    await loadReviews();

    // ✅ po načítaní: ak je prihlásený, ale bez prezývky → rovno ponúkni nastavenie
    await maybePromptNickname();
  });
})();
