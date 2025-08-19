// public/product_detail.js (robust)
(function () {
  // === helpers ===
  function getParams() {
    const p = new URLSearchParams(location.search);
    return {
      id: p.get("id") || p.get("pid") || "",
      categoryId: p.get("categoryId") || p.get("cat") || "",
      email: p.get("email") || "",
    };
  }
  function $(s, r = document) { return r.querySelector(s); }
  function escapeHTML(s = "") {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  const cleanUploadPath = (s = "") => String(s).replace(/^\/?uploads[\\/]/i, "").replace(/^\/+/, "");

  const API_BASE = (window.API_BASE || "").replace(/\/+$/, "");
  const { id: productId, categoryId, email } = getParams();
  let selectedStars = 5;

  function goBack() {
    const url = categoryId
      ? `products.html?categoryId=${encodeURIComponent(categoryId)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
      : (email ? `catalog.html?email=${encodeURIComponent(email)}` : "catalog.html");
    location.href = url;
  }
  window.goBack = goBack;

  async function j(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  // === LOAD: produkt (vyskúšaj viac endpointov) ===
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
      } catch (e) { console.warn("[detail] product try failed:", u, e.message); }
    }
    throw new Error("Produkt sa nenašiel.");
  }

  // === LOAD: summary hodnotení (priemer + počet) ===
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
        if (isFinite(avg) || isFinite(count)) return { avg, count };
      } catch (e) { console.warn("[detail] summary try failed:", u, e.message); }
    }
    return { avg: 0, count: 0 };
  }

  // === LOAD: zoznam recenzií ===
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
      } catch (e) { console.warn("[detail] reviews try failed:", u, e.message); }
    }
    return [];
  }

  // === Render produktu ===
  async function loadProduct() {
    if (!productId) { alert("Chýba ID produktu."); return; }
    try {
      const p = await fetchProduct(productId);

      // názov
      const titleEl = $("#productTitle");
      if (titleEl) titleEl.textContent = p.name || "Produkt";

      // meta: cena + jednotka + kód
      const metaEl = $("#productMeta");
      if (metaEl) {
        const eur = new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
        const hasPrice = p.price != null && isFinite(Number(p.price));
        const priceTxt = hasPrice ? `${eur.format(Number(p.price))}${p.unit ? ` / ${p.unit}` : ""}` : "";
        const codeTxt = p.code ? ` · kód: ${p.code}` : "";
        metaEl.textContent = [priceTxt, codeTxt].filter(Boolean).join("");
      }

      // popis
      const descEl = $("#productDescription");
      if (descEl) descEl.textContent = p.description || "";

      // obrázok
      const imgEl = $("#productImage");
      if (imgEl) {
        const src = p.image ? `/uploads/${cleanUploadPath(p.image)}` : "/img/placeholder.png";
        imgEl.src = src;
        imgEl.alt = p.name || "Produkt";
        imgEl.onerror = () => { imgEl.src = "/img/placeholder.png"; };
      }
    } catch (e) {
      console.warn("[product]", e.message);
      $("#productTitle") && ($("#productTitle").textContent = "Produkt");
      $("#productMeta") && ($("#productMeta").textContent = "");
      $("#productDescription") && ($("#productDescription").textContent = "Produkt sa nenašiel.");
    }
  }

  // === Summary hodnotení ===
  async function loadSummary() {
    const avgEl = $("#ratingAverage");
    const cntEl = $("#ratingCount");
    try {
      const { avg, count } = await fetchSummary(productId);
      if (count > 0) {
        avgEl && (avgEl.textContent = `★ ${avg.toFixed(1)}`);
        cntEl && (cntEl.textContent = `${count} hodnotení`);
      } else {
        avgEl && (avgEl.textContent = "Zatiaľ bez hodnotení");
        cntEl && (cntEl.textContent = "");
      }
    } catch {
      avgEl && (avgEl.textContent = "Zatiaľ bez hodnotení");
      cntEl && (cntEl.textContent = "");
    }
  }

  // === Recenzie ===
  async function loadReviews() {
    try {
      const list = await fetchReviews(productId);
      const box = $("#reviewsList");
      if (!box) return;
      if (!Array.isArray(list) || !list.length) { box.innerHTML = ""; return; }

      box.innerHTML = list.map((r) => {
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
    } catch (e) { console.warn("[ratings list]", e.message); }
  }

  // === hviezdičky (výber) ===
  function bindStars() {
    const wrap = $("#rateStars");
    if (!wrap) return;
    const paint = () => {
      wrap.querySelectorAll("[data-star]").forEach((el) => {
        const v = Number(el.getAttribute("data-star"));
        el.style.opacity = v <= selectedStars ? "1" : ".35";
      });
    };
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-star]");
      if (!b) return;
      selectedStars = Number(b.getAttribute("data-star")) || 5;
      paint();
    });
    paint();
  }

  // === odoslanie hodnotenia ===
  async function sendRating() {
    if (!email) { alert("Musíte byť prihlásený."); return; }
    const comment = ($("#rateComment")?.value || "").trim();

    const btn = $("#rateSubmit");
    const msg = $("#rateMsg");
    const lock = (v) => { if (btn) { btn.disabled = v; btn.textContent = v ? "Odosielam…" : "Odoslať hodnotenie"; } };

    try {
      lock(true);
      const res = await fetch(`${API_BASE}/api/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email, stars: selectedStars, comment }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403) { msg && (msg.textContent = data?.message || "Najprv si v dashboarde nastav prezývku."); return; }
      if (res.status === 409) { msg && (msg.textContent = "Už ste tento produkt hodnotili."); return; }
      if (!res.ok)          { msg && (msg.textContent = data?.message || "Chyba pri odoslaní hodnotenia."); return; }

      if ($("#rateComment")) $("#rateComment").value = "";
      msg && (msg.textContent = "Hodnotenie bolo uložené. Ďakujeme!");
      await loadSummary();
      await loadReviews();
    } catch {
      msg && (msg.textContent = "Server neodpovedá.");
    } finally { lock(false); }
  }

  // === init ===
  document.addEventListener("DOMContentLoaded", async () => {
    if (!productId) { alert("Chýba ID produktu."); return; }

    $("#backBtn")   && $("#backBtn").addEventListener("click", (e) => { e.preventDefault(); goBack(); });
    $("#logoutBtn") && $("#logoutBtn").addEventListener("click", () => (location.href = "index.html"));

    bindStars();

    const sendBtn = $("#rateSubmit");
    sendBtn && sendBtn.addEventListener("click", (e) => { e.preventDefault(); sendRating(); });

    await loadProduct();
    await loadSummary();
    await loadReviews();
  });
})();
