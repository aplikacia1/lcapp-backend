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
    empty.style.display = 'block';
    empty.textContent = 'Chýba categoryId v URL.';
    return;
  }

  try {
    // primárna novšia trasa
    let res = await fetch(`/api/products/category/${encodeURIComponent(categoryId)}`);
    // fallback na staršie API, ak by bolo nasadené
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
  const grid = $('#productGrid');
  grid.innerHTML = list.map(p => {
    const title = p?.name || 'Bez názvu';

    // Cena: 12,34 € / m2 (alebo / ks)
    let price = '';
    if (p?.price !== null && p?.price !== undefined && isFinite(Number(p.price))) {
      price = `${EUR.format(Number(p.price))}${p?.unit ? ` / ${p.unit}` : ''}`;
    }

    // (ak máš priemery z backendu, vieš sem doplniť p.averageRating / p.ratingCount)
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
