// ===== admin_add_product.js =====

function getCategoryIdFromURL() {
  const p = new URLSearchParams(location.search);
  return p.get('categoryId') || p.get('id') || '';
}
const categoryId = getCategoryIdFromURL();
let editingProductId = null;

const EUR = new Intl.NumberFormat('sk-SK', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2
});
const priceEUR = (price, unit) =>
  isFinite(Number(price))
    ? `${EUR.format(Number(price))}${unit ? ` / ${unit}` : ''}`
    : '-';

const clean = s =>
  String(s || '')
    .replace(/^\/?uploads[\\/]/i, '')
    .replace(/^\/+/, '');

// --- fetch helpers + filter (rovnaké princípy ako v products.js) ---
async function tryFetchArray(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const data = await r.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.products)) return data.products;
    return [];
  } catch (e) {
    console.warn('[admin] fetch failed', url, e.message);
    return [];
  }
}

function extractCategoryId(p) {
  if (!p || typeof p !== 'object') return '';
  if (typeof p.categoryId === 'string') return p.categoryId;
  if (typeof p.category === 'string') return p.category;
  const v = p.categoryId || p.category;
  if (v && typeof v === 'object') {
    if (v._id) return String(v._id);
    if (v.$oid) return String(v.$oid);
    if (v.id) return String(v.id);
  }
  for (const k of Object.keys(p)) {
    if (!/category/i.test(k)) continue;
    const val = p[k];
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      if (val._id) return String(val._id);
      if (val.$oid) return String(val.$oid);
      if (val.id) return String(val.id);
    }
  }
  return '';
}

const filterByCategory = (list, id) =>
  list.filter(p => extractCategoryId(p) === String(id));

// --- init: categories + products ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cats = await tryFetchArray('/api/categories');
    const sel = document.getElementById('categorySelect');
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c._id;
      o.textContent = c.name;
      if (c._id === categoryId) o.selected = true;
      sel.appendChild(o);
    });
  } catch (e) {
    console.error('❌ Načítanie kategórií', e);
  }
  await loadProducts();
});

document
  .getElementById('categorySelect')
  ?.addEventListener('change', loadProducts);

// --- load products pre kategóriu (vždy prefiltrované) ---
async function loadProducts() {
  const tbody = document.getElementById('productList');
  tbody.innerHTML = '';

  const endpoints = [
    `/api/categories/items/${encodeURIComponent(categoryId)}`,
    `/api/products/byCategory/${encodeURIComponent(categoryId)}`,
    `/api/products?category=${encodeURIComponent(categoryId)}`,
    `/api/products?categoryId=${encodeURIComponent(categoryId)}`
  ];

  let items = [];
  for (const url of endpoints) {
    const got = await tryFetchArray(url);
    if (got && got.length) {
      items = got;
      break;
    }
  }

  // 🔎 vždy prefiltruj
  if (items && items.length) {
    items = filterByCategory(items, categoryId);
  }

  if (!items || !items.length) {
    const all = await tryFetchArray('/api/products');
    items = filterByCategory(all, categoryId);
  }

  if (!items.length) {
    tbody.innerHTML =
      '<tr><td colspan="5">Žiadne produkty v tejto kategórii.</td></tr>';
    return;
  }

  for (const p of items) {
    const tr = document.createElement('tr');
    const img = p.image
      ? `<img src="/uploads/${clean(p.image)}" alt="" height="40" onerror="this.src='img/placeholder.png'">`
      : '';
    tr.innerHTML = `
      <td>${img}${img ? '<br>' : ''}${p.name || ''}</td>
      <td>${p.code || '-'}</td>
      <td>${p.categoryName || ''}</td>
      <td>${priceEUR(p.price, p.unit)}</td>
      <td>
        <button class="action-btn" onclick="editProduct('${p._id}')">Upraviť</button>
        <button class="action-btn" onclick="deleteProduct('${p._id}')">Vymazať</button>
      </td>`;
    tbody.appendChild(tr);
  }
}

// --- submit (create/update) ---
document.getElementById('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  fd.set('categoryId', document.getElementById('categorySelect').value);

  const url = editingProductId
    ? `/api/products/${editingProductId}`
    : '/api/products';
  const method = editingProductId ? 'PUT' : 'POST';
  const msg = document.getElementById('message');

  try {
    const r = await fetch(url, { method, body: fd });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      msg.textContent =
        '❌ ' + (json?.message || 'Nepodarilo sa uložiť produkt.');
      msg.style.color = 'orange';
      return;
    }
    msg.textContent = editingProductId
      ? '✅ Produkt upravený.'
      : '✅ Produkt pridaný.';
    msg.style.color = 'lightgreen';
    e.target.reset();
    editingProductId = null;
    await loadProducts();
  } catch (err) {
    console.error(err);
    msg.textContent = '❌ Chyba pri odosielaní.';
    msg.style.color = 'red';
  }
});

// --- delete / edit ---
async function deleteProduct(id) {
  if (!confirm('Naozaj vymazať produkt?')) return;
  try {
    const r = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!r.ok) return alert('❌ Chyba pri mazaní.');
    await loadProducts();
  } catch (e) {
    console.error(e);
  }
}
window.deleteProduct = deleteProduct;

async function editProduct(id) {
  try {
    const r = await fetch(`/api/products/${id}`);
    const p = await r.json();

    document.getElementById('name').value = p.name || '';
    document.getElementById('code').value = p.code || '';
    document.getElementById('price').value = p.price ?? '';
    document.getElementById('unit').value = p.unit || '';
    document.getElementById('description').value = p.description || '';
    document.getElementById('categorySelect').value =
      p.categoryId || document.getElementById('categorySelect').value;

    const techSheetInput = document.getElementById('techSheetUrl');
    const shopInput = document.getElementById('shopUrl');

    if (techSheetInput) {
      techSheetInput.value =
        p.techSheetUrl || p.techsheetUrl || p.tech_sheet_url || '';
    }
    if (shopInput) {
      shopInput.value =
        p.shopUrl || p.eshopUrl || p.eShopUrl || p.shopLink || p.eShopLink || '';
    }

    editingProductId = id;
    const msg = document.getElementById('message');
    msg.textContent = '✏️ Úprava produktu – uložte zmeny.';
    msg.style.color = 'orange';
  } catch (e) {
    console.error('❌ Načítanie produktu:', e);
  }
}
window.editProduct = editProduct;
