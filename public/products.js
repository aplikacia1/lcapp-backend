// public/js/products.js
(() => {
  const q = new URLSearchParams(location.search);
  const categoryId =
    q.get('categoryId') || q.get('cat') || q.get('id') || '';
  const categoryName = q.get('categoryName') || q.get('name') || '';

  const API = window.API_BASE || '';
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  const search = document.getElementById('searchInput');
  const title = document.getElementById('catTitle');

  if (categoryName) title.textContent = `Produkty – ${categoryName}`;

  const normalize = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  const imgSrc = (image) => {
    if (!image) return 'img/placeholder.png';
    if (/^https?:\/\//i.test(image)) return image;
    const clean = image.replace(/^uploads[\\/]/i, '');
    return `/uploads/${clean}`;
  };

  let ALL = [];

  const fetchJSON = async (url) => {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  };

  const loadProducts = async () => {
    const tries = [];
    if (categoryId) {
      tries.push(`${API}/api/products?category=${encodeURIComponent(categoryId)}`);
      tries.push(`${API}/api/products?categoryId=${encodeURIComponent(categoryId)}`);
    }
    tries.push(`${API}/api/products`);

    let data = [];
    let ok = false;
    for (const url of tries) {
      try {
        data = await fetchJSON(url);
        ok = true;
        break;
      } catch (_) {}
    }
    if (!ok) throw new Error('Nepodarilo sa načítať produkty.');

    if (categoryId) {
      const idStr = String(categoryId);
      data = data.filter((p) => String(p.categoryId || p.category || '') === idStr);
    }

    ALL = Array.isArray(data) ? data : [];
    render(ALL);
  };

  const render = (items) => {
    grid.innerHTML = '';
    if (!items.length) {
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';

    const frag = document.createDocumentFragment();
    for (const p of items) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img class="card-img" alt="" loading="lazy">
        <div class="card-body">
          <div class="card-title" title="${p.name || ''}">${p.name || 'Bez názvu'}</div>
          <div class="price">${p.price ? p.price + ' €' : ''} ${p.unit || ''}</div>
          ${p.code ? `<div class="rating">Kód: ${p.code}</div>` : ''}
        </div>
      `;
      card.querySelector('img').src = imgSrc(p.image);
      // Preklik do detailu prípadne:
      // card.addEventListener('click', () => location.href = `product_detail.html?id=${p._id}`);
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  };

  const doSearch = () => {
    const term = normalize(search.value);
    if (!term) {
      render(ALL);
      return;
    }
    const filtered = ALL.filter((p) => {
      const hay = `${normalize(p.name)} ${normalize(p.code)} ${normalize(p.description)}`;
      return hay.includes(term);
    });
    render(filtered);
  };

  search.addEventListener('input', doSearch);

  loadProducts().catch((e) => {
    console.error(e);
    grid.innerHTML = '';
    empty.textContent = 'Nepodarilo sa načítať produkty.';
    empty.style.display = '';
  });
})();
