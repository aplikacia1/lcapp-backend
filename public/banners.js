// public/banners.js
(function(){
  const $ = (s, r=document) => r.querySelector(s);

  // Normalizácia cesty k obrázku
  function toSrc(p){
    const s = String(p || '');
    return s.startsWith('/uploads/') ? s : (s ? `/uploads/${s}` : '');
  }

  // Načíta aktívne bannery (najnovšie navrchu)
  async function fetchActiveBanners(){
    try{
      const res = await fetch('/api/banners');
      if(!res.ok) throw new Error();
      const items = await res.json();
      return (items || [])
        .filter(b => b && b.isActive)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }catch{
      return [];
    }
  }

  // Vytvor DOM rotátora
  function createBannerDOM(height){
    const wrap = document.createElement('div');
    wrap.className = 'lb-banner-rotator';
    wrap.style.cssText = `
      width:100%;
      background:#0c1f4b;
      border-top:1px solid rgba(255,255,255,.15);
      display:flex; align-items:center; justify-content:center;
      overflow:hidden;
    `;

    const img = document.createElement('img');
    img.alt = 'Banner';
    img.loading = 'lazy';
    img.style.cssText = `
      width:100%; height:${height}px; object-fit:cover; display:block;
    `;
    wrap.appendChild(img);

    return { wrap, img };
  }

  // Verejné API
  window.mountBannerRotator = async function mountBannerRotator(
    containerId,
    {
      fixed = true,
      position = 'bottom',   // 'bottom' | 'top'
      pushContent = true,    // či má posúvať obsah (pri fixed)
      height = 160,
      heightMobile = 120,
      interval = 30000
    } = {}
  ){
    const host = document.getElementById(containerId);
    if(!host) return;

    // výška podľa šírky zariadenia
    const isMobile = window.matchMedia('(max-width: 767.98px)').matches;
    const h = isMobile ? heightMobile : height;

    const { wrap, img } = createBannerDOM(h);

    // fixed umiestnenie
    if (fixed) {
      wrap.style.position = 'fixed';
      wrap.style.left = '0';
      wrap.style.right = '0';
      wrap.style.zIndex = '900';
      if (position === 'top') {
        wrap.style.top = '0';
        document.documentElement.style.setProperty('--banner-h', `${h}px`);
        if (pushContent) document.body.style.paddingTop = `calc(var(--hdr-h, 0px) + ${h}px)`;
      } else {
        wrap.style.bottom = '0';
        document.documentElement.style.setProperty('--banner-h', `${h}px`);
        if (pushContent) document.body.style.paddingBottom = `calc(var(--banner-h) + 0px)`;
      }
      document.body.appendChild(wrap);
    } else {
      // vlož priamo do kontajnera
      host.innerHTML = '';
      host.appendChild(wrap);
    }

    // Načítanie a rotácia
    let list = await fetchActiveBanners();
    let idx = 0;
    let timer = null;
    let refreshTimer = null;

    function show(i){
      if(!list.length){ img.removeAttribute('src'); return; }
      const b = list[i % list.length];
      const src = toSrc(b?.image || '');
      if (src) img.src = src; else img.removeAttribute('src');
      img.alt = b?.title || 'Banner';
    }

    function start(){
      stop();
      show(idx);
      timer = setInterval(() => {
        if (!list.length) return;
        idx = (idx + 1) % list.length;
        show(idx);
      }, Math.max(2000, interval));
      // priebežne obnovuj zoznam (kvôli zmenám v admin rozhraní)
      refreshTimer = setInterval(async () => {
        const prevLen = list.length;
        list = await fetchActiveBanners();
        if (!list.length) { img.removeAttribute('src'); return; }
        if (list.length !== prevLen) idx = 0; // reset pri zmene počtu
      }, 60000);
    }

    function stop(){
      if (timer) { clearInterval(timer); timer = null; }
      if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    start();
  };
})();
