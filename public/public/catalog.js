// frontend/public/catalog.js

// helpers
function $(sel, root = document) { return root.querySelector(sel); }
function getEmailFromURL(){
  const p = new URLSearchParams(window.location.search);
  return p.get('email') || '';
}

const email = getEmailFromURL();

document.addEventListener('DOMContentLoaded', init);

async function init(){
  bindHeader();
  await showUser();
  loadCategories();
}

function bindHeader(){
  const nav = (page) => {
    if (email) window.location.href = `${page}?email=${encodeURIComponent(email)}`;
    else window.location.href = page;
  };

  $('#accountBtn')?.addEventListener('click', () => nav('dashboard.html'));
  $('#timelineBtn')?.addEventListener('click', () => nav('timeline.html'));
  $('#backBtn')?.addEventListener('click', () => nav('dashboard.html'));
  $('#logoutBtn')?.addEventListener('click', () => window.location.href = 'index.html');

  $('#searchInput')?.addEventListener('input', ()=>{
    filterCards($('#searchInput').value.trim().toLowerCase());
  });
}

async function showUser(){
  if(!email) return;
  try{
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`);
    if(!res.ok) return;
    const u = await res.json();
    $('#userGreeting').textContent =
      `Prihlásený: ${u?.name && u.name.trim() !== '' ? u.name : (u?.email || email)}`;
    const logoutBtn = $('#logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  }catch{}
}

let _categories = [];

async function loadCategories(){
  const grid = $('#categoryGrid');
  const empty = $('#emptyState');
  grid.innerHTML = '';
  empty.style.display = 'none';

  try{
    const res = await fetch('/api/categories');
    if(!res.ok) throw new Error('Načítanie kategórií zlyhalo');
    _categories = await res.json();

    if(!_categories?.length){
      empty.style.display = 'block';
      return;
    }
    renderCards(_categories);
  }catch(e){
    empty.style.display = 'block';
    empty.textContent = 'Chyba pri načítaní kategórií.';
    console.error(e);
  }
}

function renderCards(list){
  const grid = $('#categoryGrid');
  grid.innerHTML = list.map(cat => {
    const img = cat?.image ? `/uploads/${cat.image}` : 'placeholder_cat.png';
    const title = (cat?.name || 'Bez názvu');
    return `
      <article class="card" data-id="${cat._id}" title="${title}">
        <img class="card-img" src="${img}" alt="${title}" onerror="this.src='placeholder_cat.png'">
        <div class="card-body">
          <h3 class="card-title">${title}</h3>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.card').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.getAttribute('data-id');
      const url = `products.html?categoryId=${encodeURIComponent(id)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
      window.location.href = url;
    });
  });
}

function filterCards(query){
  if(!query){
    renderCards(_categories);
    return;
  }
  const filtered = _categories.filter(c => (c?.name || '').toLowerCase().includes(query));
  renderCards(filtered);
}
