// frontend/public/banners.js
(() => {
  const CSS = `
  /* --- scoped len pre banner (bnr-*) --- */
  .bnr-rot{max-width:1100px; margin:0 auto; padding:0 12px;}
  .bnr-rot .bnr-frame{
    position:relative; display:block; width:100%;
    height:var(--bnr-h,220px);
    border-radius:var(--bnr-r,16px); overflow:hidden;
    box-shadow:0 10px 24px rgba(0,0,0,.25);
    background:#0b1e48;
  }
  .bnr-rot .bnr-img{width:100%; height:100%; display:block; object-fit:cover;}

  /* FIXED mód – banner je stále viditeľný */
  .bnr-fixed{
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    width: min(1100px, calc(100vw - 24px));
    z-index: 1000;
  }
  .bnr-fixed.bnr-top    { top: var(--bnr-off, 12px); }
  .bnr-fixed.bnr-bottom { bottom: 16px; }

  @media (max-width:640px){
    .bnr-rot .bnr-frame{height:var(--bnr-h-m,160px)}
  }
  `;

  function injectCSS(){
    if (document.getElementById('bnr-css')) return;
    const s = document.createElement('style');
    s.id = 'bnr-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  async function fetchBanners(query='?active=1'){
    try{
      const res = await fetch(`/api/banners${query}`);
      if (!res.ok) throw new Error('fetch banners failed');
      return await res.json() || [];
    }catch{
      return [];
    }
  }

  function el(tag, attrs={}, ...kids){
    const n = document.createElement(tag);
    Object.entries(attrs||{}).forEach(([k,v])=>{
      if (k === 'style' && v && typeof v === 'object'){ Object.assign(n.style, v); }
      else if (v != null){ n.setAttribute(k, v); }
    });
    kids.flat().forEach(k => k && n.appendChild(typeof k==='string' ? document.createTextNode(k) : k));
    return n;
  }

  /**
   * mountBannerRotator(slotId, {
   *   interval: 30000,
   *   height: 220,
   *   heightMobile: 160,
   *   radius: 16,
   *   query: '?active=1',
   *   fixed: true|false,            // 👈 NOVÉ
   *   position: 'top'|'bottom',     // 👈 NOVÉ (len keď fixed)
   *   pushContent: true|false,      // 👈 NOVÉ (odsunie obsah, aby banner neprekryl)
   *   topGapSelector: '.header'     // 👈 NOVÉ (ak fixed top: pripočíta výšku hlavičky)
   * })
   */
  window.mountBannerRotator = async function mountBannerRotator(slotId, opts={}){
    injectCSS();
    const slot = document.getElementById(slotId);
    if (!slot) return;

    const {
      interval = 30000,
      height   = 220,
      heightMobile = 160,
      radius   = 16,
      query    = '?active=1',
      fixed    = false,
      position = 'top',          // 'top' alebo 'bottom'
      pushContent = true,
      topGapSelector = '.header' // na stránkach s hlavičkou
    } = opts;

    const items = await fetchBanners(query);
    if (!items.length){ slot.style.display='none'; return; }

    // obal
    const wrap  = el('div', { class:'bnr-rot' });
    wrap.style.setProperty('--bnr-h',   `${height}px`);
    wrap.style.setProperty('--bnr-h-m', `${heightMobile}px`);
    wrap.style.setProperty('--bnr-r',   `${radius}px`);

    const anchor = el('a', { class:'bnr-frame', href:'#', title:'' });
    const img    = el('img', { class:'bnr-img', alt:'Banner' });
    anchor.appendChild(img);
    wrap.appendChild(anchor);

    slot.innerHTML = '';
    slot.appendChild(wrap);

    // FIXED mód – stále viditeľný
    if (fixed){
      wrap.classList.add('bnr-fixed');
      if (position === 'bottom') wrap.classList.add('bnr-bottom');
      else                       wrap.classList.add('bnr-top');

      // odsun obsahu, aby ho banner neprekrýval
      if (pushContent){
        // keď je hore: odsunieme slot o výšku banneru
        if (position === 'top'){
          // pripočítaj výšku hlavičky (ak existuje)
          const topEl = document.querySelector(topGapSelector);
          const off = (topEl?.offsetHeight || 0) + 12;
          wrap.style.setProperty('--bnr-off', `${off}px`);
          slot.style.minHeight = (height + off + 12) + 'px';
        }else{
          // keď je dole: pridáme spodný padding
          document.body.style.paddingBottom = Math.max(
            parseInt(getComputedStyle(document.body).paddingBottom) || 0,
            height + 24
          ) + 'px';
        }
      }
    }

    let idx = 0;
    function show(i){
      const it = items[i];
      img.src  = it?.image ? `/uploads/${it.image}` : 'placeholder_cat.png';
      img.alt  = it?.title || 'Banner';
      anchor.title = it?.title || '';
      anchor.onclick = (e)=>{
        e.preventDefault();
        window.location.href = `banner_view.html?id=${encodeURIComponent(it._id)}`;
      };
    }
    show(0);

    if (items.length > 1){
      setInterval(()=>{ idx = (idx+1) % items.length; show(idx); }, interval);
    }
  };
})();
