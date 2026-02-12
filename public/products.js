// public/products.js
// ===== helpers =====
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    categoryId: p.get('categoryId') || '',
    email: p.get('email') || ''
  };
}
function $(s, r = document) { return r.querySelector(s); }

const { categoryId, email } = getParams();
let _products = [];

// Jednotný formátovač na EUR
const EUR = new Intl.NumberFormat('sk-SK', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindHeader();
  bindMarsab();   // ✅ PRIDAŤ TENTO RIADOK
  await showUser();
  await loadProducts();
  $('#searchInput')?.addEventListener('input', onSearch);
}

/* --------- navigácia v hlavičke --------- */
function nav(page) {
  const url = email ? `${page}?email=${encodeURIComponent(email)}` : page;
  window.location.href = url;
}
function bindHeader() {
  $('#catalogBtn')?.addEventListener('click', () => nav('catalog.html'));
  $('#accountBtn')?.addEventListener('click', () => nav('dashboard.html'));
  $('#timelineBtn')?.addEventListener('click', () => nav('timeline.html'));
  $('#logoutBtn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
}

/* --------- user greeting --------- */
async function showUser() {
  if (!email) return;
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`);
    if (!res.ok) return;
    const u = await res.json();
    $('#userGreeting').textContent =
      `Prihlásený: ${u?.name?.trim?.() ? u.name : (u?.email || email)}`;
  } catch {}
}

/* --------- načítanie produktov --------- */
async function loadProducts() {
  const grid = $('#productGrid');
  const empty = $('#emptyState');
  grid.innerHTML = '';
  empty.style.display = 'none';

  if (!categoryId) {
    const saved = sessionStorage.getItem('lastCategoryId');
    if (saved) {
      const url = `products.html?categoryId=${encodeURIComponent(saved)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
      window.location.replace(url);
      return;
    }
    empty.style.display = 'block';
    empty.textContent = 'Chýba categoryId v URL.';
    return;
  }

  try {
    let res = await fetch(`/api/products/category/${encodeURIComponent(categoryId)}`);
    if (!res.ok) {
      res = await fetch(`/api/products/byCategory/${encodeURIComponent(categoryId)}`);
    }
    if (!res.ok) throw new Error('Načítanie produktov zlyhalo');

    _products = await res.json();
    if (!Array.isArray(_products) || !_products.length) {
      empty.style.display = 'block';
      return;
    }
    render(_products);
  } catch (e) {
    empty.style.display = 'block';
    empty.textContent = 'Chyba pri načítaní produktov.';
    console.error(e);
  }
}

/* --------- render mriežky --------- */
function imgSrc(prod) {
  if (prod?.image) {
    const clean = String(prod.image).replace(/^\/?uploads[\\/]/i, '');
    return `/uploads/${clean}`;
  }
  return 'logo_lc.jpg';
}

function render(list) {
  // 🔽 klientsky sort: order ASC (nižšie číslo = vyššie), potom createdAt DESC
  const sorted = [...list].sort((a, b) => {
    const ao = Number.isFinite(+a?.order) ? +a.order : 9999;
    const bo = Number.isFinite(+b?.order) ? +b.order : 9999;
    if (ao !== bo) return ao - bo;
    const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  const grid = $('#productGrid');
  grid.innerHTML = sorted.map(p => {
    const title = p?.name || 'Bez názvu';

    let price = '';
    if (p?.price !== null && p?.price !== undefined && isFinite(Number(p.price))) {
      price = `${EUR.format(Number(p.price))}${p?.unit ? ` / ${p.unit}` : ''}`;
    }

    const ratingStr = p?.ratingCount
      ? `★ ${(Number(p.averageRating) || 0).toFixed(1)} (${p.ratingCount})`
      : '—';

    const src = imgSrc(p);

    return `
      <article class="card" data-id="${p._id}" title="${title}">
        <img class="card-img" src="${src}" alt="${title}"
             onerror="this.onerror=null; this.src='logo_lc.jpg'">
        <div class="card-body">
          <h3 class="card-title">${title}</h3>
          <div class="price">${price}</div>
          <div class="rating">${ratingStr}</div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const url = `product_detail.html?id=${encodeURIComponent(id)}&categoryId=${encodeURIComponent(categoryId)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
      window.location.href = url;
    });
  });
}

/* --------- vyhľadávanie --------- */
function onSearch() {
  const q = $('#searchInput').value.trim().toLowerCase();
  if (!q) { render(_products); return; }
  const filtered = _products.filter(p =>
    `${(p?.name || '').toLowerCase()} ${(p?.code || '').toLowerCase()} ${(p?.description || '').toLowerCase()}`
      .includes(q)
  );
  render(filtered);
}
/* --------- MarSab popup --------- */
function bindMarsab() {
  const badge = document.querySelector('.header-badge');
  const popup = document.getElementById('marsabInitials');

  if (!badge || !popup) return;

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.toggle('open');
  });

  // klik mimo popup zavrie
  document.addEventListener('click', () => {
    popup.classList.remove('open');
  });

  // klik do popup ho nezatvorí
  popup.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}
