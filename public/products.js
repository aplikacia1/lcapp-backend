// ===== helpers =====
function params() {
  const p = new URLSearchParams(location.search);
  return {
    categoryId: p.get('categoryId') || '',
    email:      p.get('email') || ''
  };
}
function $(s, r=document){ return r.querySelector(s); }

const { categoryId, email } = params();
let ALL = [];

// € formát
const EUR = new Intl.NumberFormat('sk-SK', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
});

document.addEventListener('DOMContentLoaded', init);

async function init(){
  bindHeader();
  await showUser();
  await loadProducts();
  $('#searchInput')?.addEventListener('input', onSearch);
}

function link(page){
  return email ? `${page}?email=${encodeURIComponent(email)}` : page;
}
function go(page){ location.href = link(page); }

function bindHeader(){
  // tlačidlo „Späť do katalógu“ – už nikdy history.back()
  $('#backToCatalogBtn')?.addEventListener('click', ()=> go('catalog.html'));

  $('#catalogBtn') ?.addEventListener('click', ()=> go('catalog.html'));
  $('#timelineBtn')?.addEventListener('click', ()=> go('timeline.html'));
  $('#accountBtn') ?.addEventListener('click', ()=> go('dashboard.html'));
  $('#logoutBtn') ?.addEventListener('click', ()=> location.href='index.html');
}

async function showUser(){
  if(!email) return;
  try{
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`);
    if(!res.ok) return;
    const u = await res.json();
    $('#userGreeting').textContent =
      `Prihlásený: ${u?.name?.trim?.() ? u.name : (u?.email || email)}`;
  }catch{}
}

async function loadProducts(){
  const grid = $('#productGrid');
  const empty = $('#emptyState');
  grid.innerHTML = '';
  empty.style.display = 'none';

  if(!categoryId){
    empty.style.display = 'block';
    empty.textContent = 'Chýba categoryId v URL.';
    return;
  }

  try{
    // používa existujúci endpoint z productRoutes.js
    const res = await fetch(`/api/products?categoryId=${encodeURIComponent(categoryId)}`);
    if(!res.ok) throw new Error('Načítanie produktov zlyhalo');

    const payload = await res.json();
    ALL = Array.isArray(payload?.items) ? payload.items
        : (Array.isArray(payload) ? payload : []);

    if(!ALL.length){
      empty.style.display = 'block';
      return;
    }
    render(ALL);
  }catch(e){
    console.error(e);
    empty.style.display = 'block';
    empty.textContent = 'Chyba pri načítaní produktov.';
  }
}

function render(list){
  const grid = $('#productGrid');
  grid.innerHTML = list.map(p => {
    const img = p?.image ? `/uploads/${p.image}` : 'placeholder_cat.png';
    const title = p?.name || 'Bez názvu';

    // cena (napr. 12,34 € / m2)
    let price = '';
    const n = Number(p?.price);
    if (Number.isFinite(n)) price = `${EUR.format(n)}${p?.unit ? ` / ${p.unit}` : ''}`;

    // rating (ak by neboli dáta, zobrazíme pomlčku)
    const avg = (typeof p?.averageRating === 'number') ? p.averageRating : null;
    const ratingStr = (avg != null ? `★ ${avg.toFixed(1)}` : '—') +
                      (p?.ratingCount ? ` (${p.ratingCount})` : '');

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

  grid.querySelectorAll('.card').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.getAttribute('data-id');
      // preklik do detailu – zachovaj categoryId + email
      const qs = new URLSearchParams();
      qs.set('id', id);
      qs.set('categoryId', categoryId);
      if (email) qs.set('email', email);
      location.href = `product_detail.html?${qs.toString()}`;
    });
  });
}

function onSearch(){
  const q = ($('#searchInput')?.value || '').trim().toLowerCase();
  if(!q){ render(ALL); return; }
  const filtered = ALL.filter(p=>{
    const hay = `${(p?.name||'').toLowerCase()} ${(p?.code||'').toLowerCase()}`;
    return hay.includes(q);
  });
  render(filtered);
}
