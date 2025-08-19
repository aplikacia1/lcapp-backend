// public/admin_add_product.js — robustná verzia

// 🔍 ID kategórie z URL
function getCategoryIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("categoryId") || params.get("id") || "";
}
const categoryId = getCategoryIdFromURL();
let editingProductId = null;

/* € formát */
const eurFmt = new Intl.NumberFormat("sk-SK", {
  style: "currency", currency: "EUR", minimumFractionDigits: 2
});
function priceEUR(price, unit) {
  const n = Number(price);
  return isFinite(n) ? `${eurFmt.format(n)}${unit ? ` / ${unit}` : ""}` : "-";
}
const cleanUploadPath = (s="") => String(s).replace(/^\/?uploads[\\/]/i,"").replace(/^\/+/,"");

// --- pomocníci na fetch + filter ---
async function tryFetchArray(url){
  try{
    const r = await fetch(url);
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const data = await r.json();
    if(Array.isArray(data)) return data;
    if(Array.isArray(data?.items)) return data.items;
    if(Array.isArray(data?.products)) return data.products;
    return [];
  }catch(e){
    console.warn("[admin] fetch failed:", url, e.message);
    return [];
  }
}
function filterByCategory(list, catId){
  const id = String(catId);
  return list.filter(p=>{
    const v = p?.categoryId;
    if(!v) return false;
    if(typeof v === "string") return v === id;
    if(typeof v === "object"){
      if(v._id)  return String(v._id)  === id;
      if(v.$oid) return String(v.$oid) === id;
    }
    return false;
  });
}

// === Načítanie kategórií do <select> + štart ===
document.addEventListener("DOMContentLoaded", async () => {
  try{
    const cats = await tryFetchArray("/api/categories");
    const sel = document.getElementById("categorySelect");
    cats.forEach(c=>{
      const o = document.createElement("option");
      o.value = c._id; o.textContent = c.name;
      if(c._id === categoryId) o.selected = true;
      sel.appendChild(o);
    });
  }catch(e){ console.error("❌ Načítanie kategórií:", e); }
  await loadProducts();
});

// === Submit (create / update) ===
document.getElementById("productForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  fd.set("categoryId", document.getElementById("categorySelect").value);

  const url = editingProductId ? `/api/products/${editingProductId}` : "/api/products";
  const method = editingProductId ? "PUT" : "POST";
  const msg = document.getElementById("message");

  try{
    const r = await fetch(url, { method, body: fd });
    const json = await r.json().catch(()=>({}));
    if(!r.ok){
      msg.textContent = "❌ " + (json?.message || "Nepodarilo sa uložiť produkt.");
      msg.style.color = "orange";
      return;
    }
    msg.textContent = editingProductId ? "✅ Produkt upravený." : "✅ Produkt pridaný.";
    msg.style.color = "lightgreen";
    form.reset(); editingProductId = null;
    await loadProducts();
  }catch(err){
    console.error(err);
    msg.textContent = "❌ Chyba pri odosielaní.";
    msg.style.color = "red";
  }
});

// === Načítať produkty v kategórii ===
async function loadProducts(){
  const tbody = document.getElementById("productList");
  tbody.innerHTML = "";

  try{
    // 1) primárny a funkčný route
    let items = await tryFetchArray(`/api/categories/items/${encodeURIComponent(categoryId)}`);

    // 2) fallback: všetky produkty -> filter na FE
    if(!items || items.length === 0){
      const all = await tryFetchArray(`/api/products`);
      items = filterByCategory(all, categoryId);
    }

    if(!items.length){
      tbody.innerHTML = `<tr><td colspan="5">Žiadne produkty v tejto kategórii.</td></tr>`;
      return;
    }

    items.forEach(p=>{
      const tr = document.createElement("tr");
      const img = p.image ? `<img src="/uploads/${cleanUploadPath(p.image)}" alt="obrázok" height="40" onerror="this.src='img/placeholder.png'">` : "";
      tr.innerHTML = `
        <td>${img}${img?"<br>":""}${p.name || ""}</td>
        <td>${p.code || "-"}</td>
        <td>${p.categoryName || ""}</td>
        <td>${priceEUR(p.price, p.unit)}</td>
        <td>
          <button class="action-btn" onclick="editProduct('${p._id}')">Upraviť</button>
          <button class="action-btn" onclick="deleteProduct('${p._id}')">Vymazať</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }catch(e){
    console.error("❌ Načítanie produktov:", e);
    tbody.innerHTML = `<tr><td colspan="5">❌ Chyba pri načítaní produktov.</td></tr>`;
  }
}

// === Delete ===
async function deleteProduct(id){
  if(!confirm("Naozaj vymazať produkt?")) return;
  try{
    const r = await fetch(`/api/products/${id}`, { method:"DELETE" });
    if(!r.ok) return alert("❌ Chyba pri mazaní.");
    await loadProducts();
  }catch(e){ console.error(e); }
}
window.deleteProduct = deleteProduct;

// === Edit ===
async function editProduct(id){
  try{
    const r = await fetch(`/api/products/${id}`);
    const p = await r.json();
    document.getElementById("name").value = p.name || "";
    document.getElementById("code").value = p.code || "";
    document.getElementById("price").value = p.price ?? "";
    document.getElementById("unit").value = p.unit || "";
    document.getElementById("description").value = p.description || "";
    document.getElementById("categorySelect").value = p.categoryId || document.getElementById("categorySelect").value;
    editingProductId = id;
    const msg = document.getElementById("message");
    msg.textContent = "✏️ Úprava produktu – uložte zmeny.";
    msg.style.color = "orange";
  }catch(e){ console.error("❌ Načítanie produktu:", e); }
}
window.editProduct = editProduct;
