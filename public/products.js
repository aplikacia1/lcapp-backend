// ===== helpers =====
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { categoryId: p.get('categoryId') || '', email: p.get('email') || '' };
}
function $(s, r = document) { return r.querySelector(s); }

const { categoryId, email } = getParams();
let ALL = [];

const EUR = new Intl.NumberFormat('sk-SK', { style:'currency', currency:'EUR', minimumFractionDigits:2 });

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindHeader();
  await showUser();
  await loadProducts();
  $('#searchInput')?.addEventListener('input', onSearch);
}

function nav(page) {
  window.location.href = email ? `${page}?email=${encodeURIComponent(email)}` : page;
}
function bindHeader() {
  $('#catalogBtn')?.addEventListener('click', () => nav('catalog.html'));
  $('#accountBtn')?.addEventListener('click', () => nav('dashboard.html'));
  $('#timelineBtn')?.addEventListener('click', () => nav('timeline.html'));
  $('#logoutBtn')?.addEventListener('click', () => location.href = 'index.html');
}
async function showUser() {
  if (!email) return;
  try {
    const r = await fetch(`/api/users/${encodeURIComponent(email)}`);
    if (!r.ok) return;
    const u = await r.json();
    $('#userGreeting').textContent = `Prihlásený: ${u?.name?.trim?.() ? u.name : (u?.email || email)}`;
  } catch {}
}

/* ---------- robust fetch + filter ---------- */

// skúsi postupne viac route-ov
async function tryFetchArray(url) {
  try {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const data = await r.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.products)) return data.products;
    return [];
  } catch (e) {
    console.warn('[products] fetch failed', url, e.message);
    return [];
  }
}

// z dokumentu vytiahne categoryId bez ohľadu na tvar
function extractCategoryId(p) {
  if (!p || typeof p !== 'object') return '';
  // preferované polia
  if (typeof p.categoryId === 'string') return p.categoryId;
  if (typeof p.category === 'string') return p.category;

  // objekt s _id / $oid / id
  const v = p.categoryId || p.category;
  if (v && typeof v === 'object') {
    if (v._id)  return String(v._id);
    if (v.$oid) return String(v.$oid);
    if (v.id)   return String(v.id);
  }

  // posledný pokus – prehľadaj všetky kľúče, ktoré obsahujú "category"
  for (const k of Object.keys(p)) {
    if (!/category/i.test(k)) continue;
    const val = p[k];
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      if (val._id)  return String(val._id);
      if (val.$oid) return String(val.$oid);
      if (val.id)   return String(val.id);
    }
  }
  return '';
}

function filterByCategory(list, catId) {
  const id = String(catId);
  return list.filter(p => extractCategoryId(p) === id);
}

/* ---------- hlavné načítanie ---------- */

async function loadProducts() {
  const grid  = $('#productGrid');
  const empty = $('#emptyState');
  grid.innerHTML = ''; empty.style.display = 'none';

  if (!categoryId) {
    empty.style.display = 'block';
    empty.textContent = 'Chýba categoryId v URL.';
    return;
  }

  // 1) skúšame známe endpointy
  const endpoints = [
    `/api/categories/items/${encodeURIComponent(categoryId)}`,
    `/api/products/byCategory/${encodeURIComponent(categoryId)}`,
    `/api/products?category=${encodeURIComponent(categoryId)}`,
    `/api/products?categoryId=${encodeURIComponent(categoryId)}`
  ];

  let items = [];
  for (const url of endpoints) {
    items = await tryFetchArray(url);
    if (items && items.length) break;
  }

  // 2) fallback: všetky produkty + filter
  if (!items || !items.length) {
    const all = await tryFetchArray(`/api/products`);
    items = filterByCategory(all, categoryId);
  }

  ALL = items || [];
  if (!ALL.length) {
    empty.style.display = 'block';
    empty.textContent = 'Žiadne produkty.';
    return;
  }
  render(ALL);
}

/* ---------- render + vyhľadávanie ---------- */

function imgPath(image) {
  if (!image) return 'placeholder_cat.png';
  if (/^https?:\/\//i.test(image)) return image;
  return `/uploads/${String(image).replace(/^\/?uploads[\\/]/i,'')}`;
}
function ratingText(p) {
  const avg = (typeof p?.averageRating === 'number') ? p.averageRating
            : (typeof p?.ratingAvg === 'number')      ? p.ratingAvg
            : (typeof p?.rating === 'number')         ? p.rating
            : null;
  const count = p?.ratingCount ?? p?.reviewsCount ?? 0;
  return (avg != null ? `★ ${avg.toFixed(1)}` : '—') + (count ? ` (${count})` : '');
}
function priceText(p) {
  const n = Number(p?.price);
  if (!isFinite(n)) return '';
  return `${EUR.format(n)}${p?.unit ? ` / ${p.unit}` : ''}`;
}

function render(list) {
  const grid = $('#productGrid');
  grid.innerHTML = list.map(p => `
    <article class="card" data-id="${p._id}" title="${p?.name || 'Bez názvu'}">
      <img class="card-img" src="${imgPath(p.image)}" alt="${p?.name || 'Produkt'}" onerror="this.src='placeholder_cat.png'">
      <div class="card-body">
        <h3 class="card-title">${p?.name || 'Bez názvu'}</h3>
        <div class="price">${priceText(p)}</div>
        <div class="rating">${ratingText(p)}</div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.card').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.getAttribute('data-id');
      const url = `product_detail.html?id=${encodeURIComponent(id)}&categoryId=${encodeURIComponent(categoryId)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
      location.href = url;
    });
  });
}

function onSearch() {
  const q = ($('#searchInput')?.value || '').trim().toLowerCase();
  if (!q) { render(ALL); return; }
  const filtered = ALL.filter(p =>
    `${p?.name || ''} ${p?.code || ''} ${p?.description || ''}`.toLowerCase().includes(q)
  );
  render(filtered);
}
