// public/admin_documents.js
document.addEventListener('DOMContentLoaded', () => {
  fetchCategories();
  bindModal();
});

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = v;
    else if (k === 'style') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n[k] = v;
    else n.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ------- Modal -------
function bindModal() {
  const m = document.getElementById('editModal');
  const f = document.getElementById('editForm');
  const btnCancel = document.getElementById('editCancel');

  btnCancel.addEventListener('click', () => hideModal());
  m.addEventListener('click', (e) => { if (e.target === m) hideModal(); });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const file = document.getElementById('editImage').files[0];

    if (!id || !name) return;

    const fd = new FormData();
    fd.append('name', name);
    if (file) fd.append('image', file);

    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: fd
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Chyba pri úprave kategórie');
      }
      hideModal();
      fetchCategories(); // refresh
    } catch (err) {
      alert(err.message || 'Chyba pri ukladaní zmien.');
    }
  });
}
function showModal({ id, name }) {
  document.getElementById('editId').value = id || '';
  document.getElementById('editName').value = name || '';
  document.getElementById('editImage').value = '';
  const m = document.getElementById('editModal');
  m.style.display = 'flex';
  m.setAttribute('aria-hidden', 'false');
}
function hideModal() {
  const m = document.getElementById('editModal');
  m.style.display = 'none';
  m.setAttribute('aria-hidden', 'true');
}

// ------- Fetch helpers -------
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ------- Categories table -------
async function fetchCategories() {
  const container = document.getElementById('category-list');
  container.innerHTML = 'Načítavam…';

  try {
    const categories = await fetchJSON('/api/categories');

    if (!categories?.length) {
      container.textContent = 'Žiadne kategórie nenájdené.';
      return;
    }

    const table = el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, [
        el('th', {}, 'Názov'),
        el('th', {}, 'Obrázok'),
        el('th', {}, 'Počet tovarov'),
        el('th', {}, 'Upraviť'),
        el('th', {}, 'Zmeniť'),
        el('th', {}, 'Vymazať'),
      ])),
      el('tbody')
    ]);

    const tbody = table.querySelector('tbody');

    categories.forEach(cat => {
      const imgSrc = cat?.image ? `/uploads/${cat.image}` : 'placeholder_cat.png';

      const nameCell  = el('td', {}, escapeHtml(cat?.name || 'Bez názvu'));
      const imageCell = el('td', {}, el('img', {
        src: imgSrc, alt: cat?.name || 'Kategória',
        onerror: () => { imageCell.querySelector('img').src = 'logo_lc.jpg'; }
      }));
      const countCell = el('td', {}, '…');

      // staré „Upraviť“ (prejsť na správu produktov)
      const editBtn = el('button', { onclick: () => {
        window.location.href = `/admin_add_product.html?id=${cat._id}`;
      }}, 'Upraviť');

      // nové „Zmeniť“ (upraviť názov/obrázok kategórie)
      const changeBtn = el('button', { onclick: () => {
        showModal({ id: cat._id, name: cat.name });
      }}, 'Zmeniť');

      const delBtn = el('button', {
        class: 'danger',
        onclick: async () => {
          if (!confirm('Naozaj chcete vymazať túto kategóriu?')) return;
          try {
            const res = await fetch(`/api/categories/${cat._id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Chyba pri mazaní kategórie');
            fetchCategories();
          } catch (e) {
            alert(e.message || 'Chyba pri mazaní.');
          }
        }
      }, 'Vymazať');

      const row = el('tr', {}, [
        nameCell, imageCell, countCell,
        el('td', {}, editBtn),
        el('td', {}, changeBtn),
        el('td', {}, delBtn)
      ]);
      tbody.appendChild(row);

      // Počet produktov – použijeme endpoint vracajúci POLE
      fetch(`/api/products/category/${encodeURIComponent(cat._id)}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('Chyba')))
        .then(items => { countCell.textContent = Array.isArray(items) ? items.length : 0; })
        .catch(() => { countCell.textContent = '0'; });
    });

    container.innerHTML = '';
    container.appendChild(table);

  } catch (err) {
    container.innerHTML = `<p style="color:#ffaaaa;">Chyba pri načítaní kategórií: ${escapeHtml(err.message)}</p>`;
    console.error(err);
  }
}
