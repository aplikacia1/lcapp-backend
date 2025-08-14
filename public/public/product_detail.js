// === helpers ===
function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    id: p.get('id') || '',
    categoryId: p.get('categoryId') || '',
    email: p.get('email') || ''
  };
}
function $(s, r=document){ return r.querySelector(s); }
function escapeHTML(s=''){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

const { id: productId, categoryId, email } = getParams();
let selectedStars = 5;

function goBack(){
  const url = categoryId
    ? `products.html?categoryId=${encodeURIComponent(categoryId)}${email ? `&email=${encodeURIComponent(email)}`:''}`
    : (email ? `catalog.html?email=${encodeURIComponent(email)}`:'catalog.html');
  location.href = url;
}

// === LOAD: produkt (title, meta, description, image) ===
async function loadProduct(){
  try{
    const res = await fetch(`/api/products/${productId}`);
    if(!res.ok) throw new Error('Produkt sa nenašiel');
    const p = await res.json();

    // názov
    const titleEl = $('#productTitle');
    if (titleEl) titleEl.textContent = p.name || 'Produkt';

    // meta: cena + jednotka + kód (ak je)  ✅ formát € / jednotka
    const metaEl = $('#productMeta');
    if (metaEl) {
      const eurFmt = new Intl.NumberFormat('sk-SK', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const hasPrice = p.price !== null && p.price !== undefined && isFinite(Number(p.price));
      const priceTxt = hasPrice
        ? `${eurFmt.format(Number(p.price))}${p.unit ? ` / ${p.unit}` : ''}`
        : '';
      const codeTxt = p.code ? ` · kód: ${p.code}` : '';
      metaEl.textContent = [priceTxt, codeTxt].filter(Boolean).join('');
    }

    // popis
    const descEl = $('#productDescription');
    if (descEl) descEl.textContent = p.description || '';

    // obrázok
    const imgEl = $('#productImage');
    if (imgEl) {
      const img = p.image ? `/uploads/${p.image}` : 'placeholder_cat.png';
      imgEl.src = img;
      imgEl.alt = p.name || 'Produkt';
      imgEl.onerror = () => { imgEl.src = 'placeholder_cat.png'; };
    }
  }catch(e){
    console.warn('[product]', e.message);
  }
}

// === LOAD: zhrnutie hodnotení (priemer + počet) ===
async function loadSummary(){
  try{
    const res = await fetch(`/api/ratings/summary/${productId}`);
    if(!res.ok) throw new Error('summary 404');
    const s = await res.json();

    const avg = (typeof s?.average === 'number') ? s.average
              : (typeof s?.avg === 'number') ? s.avg
              : (typeof s?.averageRating === 'number') ? s.averageRating
              : null;
    const cnt = (typeof s?.count === 'number') ? s.count
              : (typeof s?.ratingCount === 'number') ? s.ratingCount
              : 0;

    const avgEl = $('#ratingAverage');
    const cntEl = $('#ratingCount');

    if (avg != null && cnt > 0) {
      if (avgEl) avgEl.textContent = `★ ${avg.toFixed(1)}`;
      if (cntEl) cntEl.textContent = `${cnt} hodnotení`;
    } else {
      if (avgEl) avgEl.textContent = 'Zatiaľ bez hodnotení';
      if (cntEl) cntEl.textContent = '';
    }
  }catch{
    const avgEl = $('#ratingAverage');
    const cntEl = $('#ratingCount');
    if (avgEl) avgEl.textContent = 'Zatiaľ bez hodnotení';
    if (cntEl) cntEl.textContent = '';
  }
}

// === LOAD: zoznam recenzií ===
async function loadReviews(){
  try{
    const res = await fetch(`/api/ratings/list/${productId}`);
    if(!res.ok) throw new Error('list 404');
    const list = await res.json();

    const box = $('#reviewsList');
    if(!box) return;

    if (!Array.isArray(list) || !list.length) {
      box.innerHTML = '';
      return;
    }

    box.innerHTML = list.map(r => `
      <article class="review">
        <div class="head">
          <div class="who">${escapeHTML(r.authorName || 'Anonym')}</div>
          <div class="when">${r.createdAt ? new Date(r.createdAt).toLocaleString('sk-SK') : ''}</div>
        </div>
        <div class="stars">★${r.stars}</div>
        ${r.comment ? `<div class="text">${escapeHTML(r.comment)}</div>` : ''}
      </article>
    `).join('');
  }catch(e){
    console.warn('[ratings list]', e.message);
  }
}

// === hviezdičky (spodný panel) ===
function bindStars(){
  const wrap = $('#rateStars'); 
  if(!wrap) return;
  const paint = () => {
    wrap.querySelectorAll('[data-star]').forEach(el=>{
      const v = Number(el.getAttribute('data-star'));
      el.style.opacity = (v <= selectedStars) ? '1' : '.35';
    });
  };
  wrap.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-star]');
    if(!b) return;
    selectedStars = Number(b.getAttribute('data-star')) || 5;
    paint();
  });
  paint();
}

// === send: odoslanie hodnotenia ===
async function sendRating(){
  if(!email){ alert('Musíte byť prihlásený.'); return; }
  const comment = ($('#rateComment')?.value || '').trim();

  const btn = $('#rateSubmit');
  const msg = $('#rateMsg');
  const lock = (v) => { 
    if(btn){ btn.disabled=v; btn.textContent = v ? 'Odosielam…' : 'Odoslať hodnotenie'; } 
  };

  try{
    lock(true);
    const res = await fetch('/api/ratings', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ productId, email, stars: selectedStars, comment })
    });
    const data = await res.json().catch(()=>({}));

    if(res.status === 403){
      msg && (msg.textContent = data?.message || 'Najprv si v dashboarde nastav prezývku.');
      return;
    }
    if(res.status === 409){
      msg && (msg.textContent = 'Už ste tento produkt hodnotili.');
      return;
    }
    if(!res.ok){
      msg && (msg.textContent = data?.message || 'Chyba pri odoslaní hodnotenia.');
      return;
    }

    // úspech
    if ($('#rateComment')) $('#rateComment').value = '';
    msg && (msg.textContent = 'Hodnotenie bolo uložené. Ďakujeme!');
    await loadSummary();
    await loadReviews();
  }catch{
    msg && (msg.textContent = 'Server neodpovedá.');
  }finally{
    lock(false);
  }
}

// === init ===
document.addEventListener('DOMContentLoaded', async ()=>{
  if(!productId){ alert('Chýba ID produktu.'); return; }

  $('#backBtn')    && $('#backBtn').addEventListener('click', (e)=>{ e.preventDefault(); goBack(); });
  $('#logoutBtn')  && $('#logoutBtn').addEventListener('click', ()=> location.href='index.html');

  bindStars();

  const sendBtn = $('#rateSubmit');
  sendBtn && sendBtn.addEventListener('click', (e)=>{ e.preventDefault(); sendRating(); });

  await loadProduct();
  await loadSummary();
  await loadReviews();
});
