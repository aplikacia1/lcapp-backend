(() => {
  // --- URL parametre
  const q = new URLSearchParams(location.search);
  const categoryId  = q.get('categoryId') || q.get('cat') || q.get('id') || '';
  const categoryName = q.get('categoryName') || q.get('name') || '';

  // --- DOM
  const API    = window.API_BASE || '';
  const grid   = document.getElementById('productGrid');
  const empty  = document.getElementById('emptyState');
  const search = document.getElementById('searchInput');
  const title  = document.getElementById('catTitle');

  if (categoryName) title.textContent = `Produkty – ${categoryName}`;

  // --- util
  const normalize = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  const imgSrc = (image) => {
    if (!image) return 'img/placeholder.png';
    if (/^https?:\/\//i.test(image)) return image;
    const clean = String(image).replace(/^uploads[\\/]/i, '');
    return `/uploads/${clean}`;
  };

  const fetchJSON = async (url) => {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  };

  let ALL = [];

  // --- načítanie produktov (server už filtruje podľa ?category=)
  const loadProducts = async () => {
    const url = categoryId
      ? `${API}/api/products?category=${encodeURIComponent(categoryId)}`
      : `${API}/api/products`;

    const data = await fetchJSON(url);
    console.log('[products] received', Array.isArray(data) ? data.length : 0);
    ALL = Array.isArray(data) ? data : [];
    render(ALL);
  };

  // --- render
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
        <img class="card-img" alt="">
        <div class="card-body">
          <div class="card-title" title="${p.name || ''}">${p.name || 'Bez názvu'}</div>
          <div class="price">${p.price ? (Number(p.price).toFixed(2) + ' €') : ''} ${p.unit || ''}</div>
          ${p.code ? `<div class="rating">Kód: ${p.code}</div>` : ''}
        </div>
      `;
      const img = card.querySelector('img');
      img.src = imgSrc(p.image);
      img.loading = 'lazy';
      img.alt = p.name || 'Produkt';

      // Preklik do detailu (ak používaš product_detail.html)
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
  };

  // --- vyhľadávanie
  const doSearch = () => {
    const term = normalize(search.value);
    if (!term) { render(ALL); return; }

    const filtered = ALL.filter((p) => {
      const hay = `${normalize(p.name)} ${normalize(p.code)} ${normalize(p.description)}`;
      return hay.includes(term);
    });
    render(filtered);
  };

  search.addEventListener('input', doSearch);

  // --- štart
  loadProducts().catch((e) => {
    console.error(e);
    grid.innerHTML = '';
    empty.textContent = 'Nepodarilo sa načítať produkty.';
    empty.style.display = '';
  });
})();
