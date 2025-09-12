async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Chyba');
  return data;
}

const $ = (s, r = document) => r.querySelector(s);

document.addEventListener('DOMContentLoaded', () => {
  bindForm();
  loadList();
});

function bindForm() {
  const form = $('#createForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    // checkbox -> 'true' | 'false'
    fd.set('isActive', $('#isActive').checked ? 'true' : 'false');

    try {
      await fetchJSON('/api/banners', { method: 'POST', body: fd });
      form.reset();
      $('#isActive').checked = true;
      await loadList();
      alert('Banner uložený.');
    } catch (e) {
      alert(e.message || 'Chyba pri ukladaní.');
    }
  });
}

async function loadList() {
  const list = $('#list');
  list.innerHTML = 'Načítavam...';

  try {
    const items = await fetchJSON('/api/banners');
    if (!items.length) {
      list.innerHTML = '<div class="muted">Zatiaľ žiadne bannery.</div>';
      return;
    }

    list.innerHTML = items
      .map((b) => {
        // ✅ Bezpečná cesta k obrázku: nové aj staré dáta
        const imgSrc = b?.image
          ? (String(b.image).startsWith('/') ? b.image : `/uploads/${b.image}`)
          : '';

        return `
        <div class="banner-tile" data-id="${b._id}">
          ${
            imgSrc
              ? `<img src="${imgSrc}" alt="${escapeHtml(b.title || '')}" loading="lazy">`
              : `<div class="muted" style="padding:12px">Bez obrázka</div>`
          }
          <div class="tile-body">
            <div><strong>${escapeHtml(b.title || 'Bez názvu')}</strong></div>
            <div class="muted">${b.isActive ? 'Aktívny' : 'Neaktívny'} • ${new Date(
              b.createdAt
            ).toLocaleString('sk-SK')}</div>
            <div style="display:flex; gap:8px; margin-top:10px">
              <a class="btn" href="banner_view.html?id=${b._id}" target="_blank">Zobraziť</a>
              <button class="btn" data-act="toggle">${b.isActive ? 'Deaktivovať' : 'Aktivovať'}</button>
              <button class="btn btn--danger" data-act="del">Zmazať</button>
            </div>
          </div>
        </div>`;
      })
      .join('');

    list.querySelectorAll('.banner-tile').forEach((tile) => {
      tile.addEventListener('click', async (e) => {
        const id = tile.getAttribute('data-id');
        const act = e.target.getAttribute('data-act');
        if (!act) return;

        if (act === 'del') {
          if (!confirm('Zmazať banner?')) return;
          try {
            await fetchJSON(`/api/banners/${id}`, { method: 'DELETE' });
            loadList();
          } catch (err) {
            alert(err.message);
          }
        }

        if (act === 'toggle') {
          const label = e.target;
          const isActivate = /Aktivovať/.test(label.textContent);
          const fd = new FormData();
          fd.set('isActive', isActivate ? 'true' : 'false');
          try {
            await fetchJSON(`/api/banners/${id}`, { method: 'PUT', body: fd });
            loadList();
          } catch (err) {
            alert(err.message);
          }
        }
      });
    });
  } catch (e) {
    list.innerHTML = '<div class="muted">Chyba pri načítaní.</div>';
  }
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
