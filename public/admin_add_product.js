// 🔍 Získať ID kategórie z URL
function getCategoryIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("categoryId") || params.get("id");
}
const categoryId = getCategoryIdFromURL();
let editingProductId = null;

/* € formát */
const eurFmt = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
function formatPriceEUR(price, unit) {
  const n = Number(price);
  return isFinite(n) ? `${eurFmt.format(n)}${unit ? ` / ${unit}` : ''}` : '-';
}

/* Načítanie kategórií */
document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/categories")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("categorySelect");
      data.forEach(c => {
        const o = document.createElement("option");
        o.value = c._id; o.textContent = c.name;
        if (c._id === categoryId) o.selected = true;
        select.appendChild(o);
      });
      loadProducts();
    })
    .catch(err => console.error("❌ Načítanie kategórií:", err));
});

/* Pridanie / úprava */
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  fd.set("categoryId", document.getElementById("categorySelect").value);

  const url = editingProductId ? `/api/products/${editingProductId}` : "/api/products";
  const method = editingProductId ? "PUT" : "POST";

  try {
    const res = await fetch(url, { method, body: fd });
    const json = await res.json().catch(()=>({}));
    const msg = document.getElementById("message");
    if (res.ok) {
      msg.textContent = editingProductId ? "✅ Produkt upravený." : "✅ Produkt pridaný.";
      msg.style.color = "lightgreen";
      form.reset(); editingProductId = null;
      loadProducts();
    } else {
      msg.textContent = "❌ " + (json?.message || "Nepodarilo sa uložiť produkt.");
      msg.style.color = "orange";
    }
  } catch (err) {
    console.error("❌ Odosielanie:", err);
    const msg = document.getElementById("message");
    msg.textContent = "❌ Chyba pri odosielaní.";
    msg.style.color = "red";
  }
});

/* Načítať produkty v kategórii – DÔLEŽITÉ: /byCategory/:id */
async function loadProducts() {
  const container = document.getElementById("productList");
  container.innerHTML = "";
  try {
    const res = await fetch(`/api/products/byCategory/${encodeURIComponent(categoryId)}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<tr><td colspan="5">Žiadne produkty v tejto kategórii.</td></tr>`;
      return;
    }
    data.forEach((p) => {
      const row = document.createElement("tr");
      const img = p.image ? `<img src="/uploads/${p.image}" alt="obrázok" height="40" onerror="this.src='img/placeholder.png'">` : "";
      row.innerHTML = `
        <td>${img}${img ? "<br>" : ""}${p.name || ""}</td>
        <td>${p.code || "-"}</td>
        <td>${p.categoryName || ""}</td>
        <td>${formatPriceEUR(p.price, p.unit)}</td>
        <td>
          <button class="action-btn" onclick="editProduct('${p._id}')">Upraviť</button>
          <button class="action-btn" onclick="deleteProduct('${p._id}')">Vymazať</button>
        </td>`;
      container.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Načítanie produktov:", err);
    container.innerHTML = `<tr><td colspan="5">❌ Chyba pri načítaní produktov.</td></tr>`;
  }
}

/* Vymazanie */
async function deleteProduct(id) {
  if (!confirm("Naozaj vymazať produkt?")) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) loadProducts(); else alert("❌ Chyba pri mazaní.");
  } catch (e) { console.error(e); }
}

/* Úprava */
async function editProduct(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    const p = await res.json();
    document.getElementById("name").value = p.name || "";
    document.getElementById("code").value = p.code || "";
    document.getElementById("price").value = p.price ?? "";
    document.getElementById("unit").value = p.unit || "";
    document.getElementById("description").value = p.description || "";
    document.getElementById("categorySelect").value = p.categoryId;
    editingProductId = id;
    const msg = document.getElementById("message");
    msg.textContent = "✏️ Úprava produktu – uložte zmeny.";
    msg.style.color = "orange";
  } catch (e) {
    console.error("❌ Načítanie produktu:", e);
  }
}
