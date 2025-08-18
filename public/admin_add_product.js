// public/admin_add_product.js
(() => {
  const API = window.API_BASE || "";
  const $ = (id) => document.getElementById(id);

  const form = $("productForm");
  const sel  = $("categorySelect");
  const msg  = $("message");
  const tbody= $("productList");

  let editingProductId = null;

  // --- pomocné ---
  const eurFmt = new Intl.NumberFormat('sk-SK', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const fmtPrice = (price, unit) => {
    const n = Number(price);
    if (!isFinite(n)) return "-";
    return `${eurFmt.format(n)}${unit ? ` / ${unit}` : ""}`;
  };
  const cleanUploadPath = (s="") => s.replace(/^\/?uploads[\\/]/i, "");

  const getCategoryIdFromURL = () => {
    const p = new URLSearchParams(location.search);
    return p.get("categoryId") || p.get("id") || "";
  };

  async function j(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(await r.text().catch(()=>"Chyba"));
    return r.json();
  }

  // --- načítaj kategórie do <select> ---
  async function loadCategories() {
    const cats = await j(`${API}/api/categories`);
    sel.innerHTML = "";
    const fromURL = getCategoryIdFromURL();

    for (const c of cats) {
      const o = document.createElement("option");
      o.value = c._id;
      o.textContent = c.name;
      if (fromURL && c._id === fromURL) o.selected = true;
      sel.appendChild(o);
    }
  }

  // --- načítaj produkty pre vybranú kategóriu (správny endpoint) ---
  async function loadProducts() {
    const catId = sel.value || getCategoryIdFromURL();
    tbody.innerHTML = "";
    if (!catId) {
      tbody.innerHTML = `<tr><td colspan="5">Vyberte kategóriu.</td></tr>`;
      return;
    }
    const payload = await j(`${API}/api/products?categoryId=${encodeURIComponent(catId)}`);
    const items = Array.isArray(payload) ? payload : (payload.items || []);
    renderRows(items);
  }

  function renderRows(items) {
    tbody.innerHTML = "";
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5">Žiadne produkty v tejto kategórii.</td></tr>`;
      return;
    }
    for (const p of items) {
      const img = p.image ? `<img src="/uploads/${cleanUploadPath(p.image)}" alt="obrázok" height="40">` : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${img}<br>${p.name || ""}</td>
        <td>${p.code || "-"}</td>
        <td>${p.categoryName || ""}</td>
        <td>${fmtPrice(p.price, p.unit)}</td>
        <td>
          <button class="action-btn" data-edit="${p._id}">Upraviť</button>
          <button class="action-btn" data-del="${p._id}">Vymazať</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  // --- kliky v tabuľke (edit/delete) ---
  tbody.addEventListener("click", async (e) => {
    const id = e.target?.dataset?.del || e.target?.dataset?.edit;
    if (!id) return;

    if (e.target?.dataset?.del) {
      if (!confirm("Naozaj vymazať produkt?")) return;
      try {
        await j(`${API}/api/products/${id}`, { method: "DELETE" });
        await loadProducts();
      } catch (err) {
        alert("❌ Chyba pri mazaní: " + err.message);
      }
      return;
    }

    // edit
    try {
      const p = await j(`${API}/api/products/${id}`);
      $("name").value = p.name || "";
      $("code").value = p.code || "";
      $("price").value = p.price ?? "";
      $("unit").value = p.unit || "";
      $("description").value = p.description || "";
      sel.value = p.categoryId || sel.value;
      editingProductId = id;
      msg.textContent = "✏️ Úprava produktu – uložte zmeny.";
      msg.style.color = "orange";
    } catch (err) {
      console.error("❌ Načítanie produktu:", err);
    }
  });

  // --- submit (create/update) cez FormData => uloží sa aj obrázok ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Ukladám...";
    msg.style.color = "";

    try {
      const fd = new FormData(form);
      fd.set("categoryId", sel.value);

      const url = editingProductId ? `${API}/api/products/${editingProductId}` : `${API}/api/products`;
      const method = editingProductId ? "PUT" : "POST";

      const r = await fetch(url, { method, body: fd });
      if (!r.ok) throw new Error(await r.text().catch(()=> "Nepodarilo sa uložiť produkt"));

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

  // --- zmena kategórie ---
  sel.addEventListener("change", loadProducts);

  // boot
  (async () => {
    try {
      await loadCategories();
      await loadProducts();
    } catch (e) {
      console.error(e);
      msg.textContent = "❌ Chyba pri načítaní kategórií/produktov.";
    }
  })();
})();
