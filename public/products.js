(() => {
  const q = new URLSearchParams(location.search);
  const categoryId   = q.get('categoryId') || q.get('cat') || q.get('id') || '';
  const categoryName = q.get('categoryName') || q.get('name') || '';

  const API    = (window.API_BASE || '').replace(/\/+$/, '');
  const grid   = document.getElementById('productGrid');
  const empty  = document.getElementById('emptyState');
  const search = document.getElementById('searchInput');
  const title  = document.getElementById('catTitle');

  if (categoryName) title.textContent = `Produkty – ${categoryName}`;

  const normalize = (s) =>
    (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const imgSrc = (image) => {
    if (!image) return 'img/placeholder.png';
    if (/^https?:\/\//i.test(image)) return image;
    const clean = String(image).replace(/^\/?uploads[\\/]/i, '').replace(/^\/+/, '');
    return `/uploads/${clean}`;
  };

  const j = async (url) => {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  };

  // vyskúšaj viac typov endpointov; vráť prvé nájdené pole produktov
  async function fetchProductsForCategory(catId) {
    const urls = [
      `${API}/api/products?categoryId=${encodeURIComponent(catId)}`,
      `${API}/api/products?category=${encodeURIComponent(catId)}`,
      `${API}/api/categories/${encodeURIComponent(catId)}/products`,
      `${API}/api/products/category/${encodeURIComponent(catId)}`,
      `${API}/api/products/by-category/${encodeURIComponent(catId)}`,
      `${API}/api/products/byCategory/${encodeURIComponent(catId)}`
    ];

    for (const u of urls) {
      try {
        const data = await j(u);
        const arr  = Array.isArray(data) ? data
                  : Array.isArray(data?.items) ? data.items
                  : Array.isArray(data?.products) ? data.products
                  : null;
        if (arr) {
          console.log('[products] loaded from', u, 'count=', arr.length);
          return arr;
        }
      } catch (e) {
        console.warn('[products] try failed', u, e.message);
      }
    }
    return [];
  }

  // ⭐ rating (vezme priemer z rôznych polí, ak existujú)
  const getRatingInfo = (p) => {
    const reviews = Array.isArray(p?.reviews) ? p.reviews : [];
    const avgFromReviews = reviews.length
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length)
      : null;

    const avg = Number(p?.ratingAvg ?? p?.averageRating ?? p?.rating ?? avgFromReviews ?? 0);
    const count = Number(p?.ratingCount ?? p?.reviewsCount ?? reviews.length ?? 0);
    return { avg: isFinite(avg) ? avg : 0, count: isFinite(count) ? count : 0 };
  };

  let ALL = [];

  async function loadProducts() {
    try {
      let data = [];
      if (categoryId) data = await fetchProductsForCategory(categoryId);
      else            data = await j(`${API}/api/products`).catch(() => ([]));

      ALL = Array.isArray(data) ? data : [];
      render(ALL);
    } catch (e) {
      console.error(e);
      grid.innerHTML = '';
      empty.textContent = 'Nepodarilo sa načítať produkty.';
      empty.style.display = '';
    }
  }

  function render(items) {
    grid.innerHTML = '';
    if (!items.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';

    const frag = document.createDocumentFragment();
    for (const p of items) {
      const { avg, count } = getRatingInfo(p);
      const ratingHtml = count ? `<div class="rating">★ ${avg.toFixed(1)} (${count})</div>` : '';

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img class="card-img" alt="">
        <div class="card-body">
          <div class="card-title" title="${p.name || ''}">${p.name || 'Bez názvu'}</div>
          <div class="price">${p.price ? (Number(p.price).toFixed(2) + ' €') : ''} ${p.unit || ''}</div>
          ${p.code ? `<div class="rating">Kód: ${p.code}</div>` : ''}
          ${ratingHtml}
        </div>
      `;
      const img = card.querySelector('img');
      img.src = imgSrc(p.image);
      img.loading = 'lazy';
      img.alt = p.name || 'Produkt';

      if (p._id) {
        card.addEventListener('click', () => {
          const params = new URLSearchParams();
          params.set('id', p._id);
          if (categoryId) params.set('categoryId', categoryId);
          location.href = `product_detail.html?${params.toString()}`;
        });
      }
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  function doSearch() {
    const term = normalize(search.value);
    if (!term) { render(ALL); return; }
    const filtered = ALL.filter(p => {
      const hay = `${normalize(p.name)} ${normalize(p.code)} ${normalize(p.description)}`;
      return hay.includes(term);
    });
    render(filtered);
  }

  search.addEventListener('input', doSearch);
  loadProducts();
})();
