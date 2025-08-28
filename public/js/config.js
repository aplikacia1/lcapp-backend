// public/js/config.js
(() => {
  // Preferujeme same-origin: keď stránku servuje backend (napr. localhost:3000),
  // nechávame prázdny prefix a všetky fetch-e idú na rovnaký host/port.
  const { protocol, hostname, port } = location;
  let base = "";

  // Ak bežíš lokálne, ale stránku neotváraš z portu 3000 (alebo z file://),
  // nasmeruj API na backend na porte 3000.
  if (protocol === "file:" ||
      ((hostname === "localhost" || hostname === "127.0.0.1") && port !== "3000")) {
    base = "http://localhost:3000";
  }

  // (Voliteľné) ak chceš natvrdo používať vzdialený backend, odkomentuj:
  // base = "https://lcapp-backend.onrender.com";

  window.API_BASE = base.replace(/\/+$/, "");
})();
