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
    // ⬅️ KĽÚČOVÉ: používa sa path /byCategory/:id
    const res = await fetch(`/api/products/byCategory/${encodeURIComponent(categoryId)}`);
    if (!res.ok) throw new Error('Načítanie produktov zlyhalo');
    _products = await res.json();

    if (!_products.length) {
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

function render(list) {
  const grid = $('#productGrid');
  grid.innerHTML = list.map(p => {
    const img = p?.image ? `/uploads/${p.image}` : 'placeholder_cat.png';
    const title = p?.name || 'Bez názvu';

    // Cena
    let price = '';
    if (p?.price !== null && p?.price !== undefined && isFinite(Number(p.price))) {
      price = `${EUR.format(Number(p.price))}${p?.unit ? ` / ${p.unit}` : ''}`;
    }

    // Hodnotenia (ak backend posiela)
    const avg = (typeof p?.averageRating === 'number') ? p.averageRating
              : (typeof p?.ratingAvg === 'number') ? p.ratingAvg
              : null;
    const count = p?.ratingCount ?? p?.reviewsCount ?? 0;
    const ratingStr = (avg != null ? `★ ${avg.toFixed(1)}` : '—') + (count ? ` (${count})` : '');

    return `
      <article class="card" data-id="${p._id}" title="${title}">
        <img class="card-img" src="${img}" alt="${title}" onerror="this.src='placeholder_cat.png'">
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

function onSearch() {
  const q = $('#searchInput').value.trim().toLowerCase();
  if (!q) { render(_products); return; }
  const filtered = _products.filter(p =>
    `${p?.name || ''} ${p?.code || ''} ${p?.description || ''}`.toLowerCase().includes(q)
  );
  render(filtered);
}
