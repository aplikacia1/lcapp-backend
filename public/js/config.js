// public/js/config.js
(() => {
  // keď otvoríš stránku z Renderu, stačí prázdny prefix (same-origin)
  // keď bežíš lokálne, používaj localhost:5000
  const host = location.hostname;
  let base = '';
  if (host === 'localhost' || host === '127.0.0.1') base = 'http://localhost:5000';

  // Ak by si chcel niekedy natvrdo Render URL, odkomentuj:
  // base = 'https://lcapp-backend.onrender.com';

  window.API_BASE = base;
})();
