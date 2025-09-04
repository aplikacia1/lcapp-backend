// frontend/public/login.js
(function () {
  function $(sel, root = document) { return root.querySelector(sel); }
  function pickEmailInput() {
    return $('#email') || $('input[type="email"]') || $('input[name="email"]');
  }
  function pickPasswordInput() {
    return $('#password') || $('input[type="password"]') || $('input[name="password"]');
  }
  function pickForm() {
    return $('#loginForm') || $('form');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = pickForm();
    if (!form) {
      console.error('Login: nenašiel som <form> na stránke.');
      return;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = pickEmailInput();
      const passEl  = pickPasswordInput();

      const email = (emailEl?.value || '').trim();
      const password = passEl?.value || '';

      if (!email || !password) {
        alert('Zadaj e-mail aj heslo.');
        return;
      }

      try {
        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data?.message || 'Nesprávny e-mail alebo heslo.');
          return;
        }

        // ✅ po úspešnom logine pošli na Lištobook (timeline)
        // podpora voliteľného ?next=..., inak predvolene timeline.html
        const params = new URLSearchParams(location.search);
        const next = params.get('next');
        const dest = next || `timeline.html?email=${encodeURIComponent(email)}`;

        // replace = nedá sa vrátiť späť na login po back
        window.location.replace(dest);
      } catch (err) {
        console.error('Login error', err);
        alert('Chyba pri pripojení.');
      }
    });
  });
})();
