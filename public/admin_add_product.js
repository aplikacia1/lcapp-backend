// public/admin_add_product.js
(() => {
  const API = window.API_BASE || "";
  const $ = (id) => document.getElementById(id);

  const form  = $("productForm");
  const sel   = $("categorySelect");
  const msg   = $("message");
  const tbody = $("productList");

  let editingProductId = null;
  const catNameById = new Map();

  // --- Pomocné ---
  const eurFmt = new Intl.NumberFormat("sk-SK", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const fmtPrice = (price, unit) => {
    const n = Number(price);
    if (!isFinite(n)) return "-";
    return `${eurFmt.format(n)}${unit ? ` / ${unit}` : ""}`;
  };
  const cleanUploadPath = (s = "") =>
    String(s).replace(/^\/?uploads[\\/]/i, "").replace(/^\/+/, "");

  const getCategoryIdFromURL = () => {
    const p = new URLSearchParams(location.search);
    return p.get("categoryId") || p.get("id") || "";
  };

  async function j(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(t || `${r.status} ${r.statusText}`);
    }
    return r.json();
  }

  // --- Kategórie do <select> ---
  async function loadCategories() {
    const cats = await j(`${API}/api/categories`);
    sel.innerHTML = "";
    catNameById.clear();
    const fromURL = getCategoryIdFromURL();

    for (const c of cats) {
      catNameById.set(c._id, c.name || "");
      const o = document.createElement("option");
      o.value = c._id;
      o.textContent = c.name || "(bez názvu)";
      if (fromURL && c._id === fromURL) o.selected = true;
      sel.appendChild(o);
    }
  }

  // --- Načítanie produktov podľa kategórie (robustne) ---
  async function loadProducts() {
    const catId = sel.value || getCategoryIdFromURL();
    tbody.innerHTML = "";

    if (!catId) {
      tbody.innerHTML = `<tr><td colspan="5">Vyberte kategóriu.</td></tr>`;
      return;
    }

    const urls = [
      `${API}/api/products?categoryId=${encodeURIComponent(catId)}`,
      `${API}/api/products?category=${encodeURIComponent(catId)}`
    ];

    let items = [];
    for (const u of urls) {
      try {
        const payload = await j(u);
        items = Array.isArray(payload) ? payload : (payload.items || []);
        if (Array.isArray(items)) break;
      } catch {
        // skúšame ďalší variant
      }
    }

    renderRows(items || []);
  }

  function renderRows(items) {
    tbody.innerHTML = "";
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5">Žiadne produkty v tejto kategórii.</td></tr>`;
      return;
    }

    for (const p of items) {
      const imgHTML = p.image
        ? `<img src="/uploads/${cleanUploadPath(p.image)}" alt="obrázok" height="40" onerror="this.src='img/placeholder.png'">`
        : "";

      const catName = p.categoryName || catNameById.get(p.categoryId) || catNameById.get(sel.value) || "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${imgHTML}${imgHTML ? "<br>" : ""}${p.name || ""}</td>
        <td>${p.code || "-"}</td>
        <td>${catName}</td>
        <td>${fmtPrice(p.price, p.unit)}</td>
        <td>
          <button class="action-btn" data-edit="${p._id}">Upraviť</button>
          <button class="action-btn" data-del="${p._id}">Vymazať</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  // --- Kliky v tabuľke (edit/delete) ---
  tbody.addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const delId  = t.dataset.del;
    const editId = t.dataset.edit;

    // Vymazanie
    if (delId) {
      if (!confirm("Naozaj vymazať produkt?")) return;
      try {
        await j(`${API}/api/products/${delId}`, { method: "DELETE" });
        await loadProducts();
      } catch (err) {
        alert("❌ Chyba pri mazaní: " + err.message);
      }
      return;
    }

    // Editácia – predvyplniť formulár
    if (editId) {
      try {
        const p = await j(`${API}/api/products/${editId}`);
        $("name").value        = p.name || "";
        $("code").value        = p.code || "";
        $("price").value       = p.price ?? "";
        $("unit").value        = p.unit || "";
        $("description").value = p.description || "";
        if (p.categoryId) sel.value = p.categoryId;

        editingProductId = editId;
        msg.textContent = "✏️ Úprava produktu – uložte zmeny.";
        msg.style.color = "orange";
      } catch (err) {
        console.error("❌ Načítanie produktu:", err);
        msg.textContent = "❌ Nepodarilo sa načítať produkt.";
        msg.style.color = "red";
      }
    }
  });

  // --- Submit (create/update) cez FormData – uloží sa aj obrázok ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Ukladám…";
    msg.style.color = "";

    try {
      const fd = new FormData(form);
      fd.set("categoryId", sel.value);

      const url = editingProductId
        ? `${API}/api/products/${editingProductId}`
        : `${API}/api/products`;
      const method = editingProductId ? "PUT" : "POST";

      const r = await fetch(url, { method, body: fd });
      if (!r.ok) throw new Error(await r.text().catch(() => "Nepodarilo sa uložiť produkt"));

      msg.textContent = editingProductId ? "✅ Produkt upravený." : "✅ Produkt pridaný.";
      msg.style.color = "lightgreen";
      form.reset();
      editingProductId = null;
      await loadProducts();
    } catch (err) {
      console.error(err);
      msg.textContent = "❌ " + err.message;
      msg.style.color = "red";
    }
  });

  // --- Zmena kategórie -> prepnúť zoznam produktov ---
  sel.addEventListener("change", loadProducts);

  // --- Štart ---
  (async () => {
    try {
      await loadCategories();
      await loadProducts();
    } catch (e) {
      console.error(e);
      msg.textContent = "❌ Chyba pri načítaní kategórií/produktov.";
      msg.style.color = "red";
    }
  })();
})();
