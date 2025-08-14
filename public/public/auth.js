// frontend/public/auth.js
(function () {
  const KEY = 'lcapp_email';

  function emailFromQuery() {
    const q = new URLSearchParams(location.search).get('email');
    return q && q.trim() ? q : '';
  }

  const auth = {
    // Vráti email z URL alebo localStorage. Ak je v URL, uloží ho.
    getEmail() {
      const q = emailFromQuery();
      if (q) {
        try { localStorage.setItem(KEY, q); } catch {}
        return q;
      }
      try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
    },
    // Vyžaduje e-mail: ak chýba, presmeruje (a vráti null).
    require(redirect = 'index.html') {
      const e = this.getEmail();
      if (!e) { location.href = redirect; return null; }
      return e;
    },
    setEmail(email) { try { localStorage.setItem(KEY, email); } catch {} },
    clear() { try { localStorage.removeItem(KEY); } catch {} }
  };

  window.auth = auth;
})();
