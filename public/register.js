// frontend/public/register.js
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  const emailEl = () => $('#email');
  const passEl  = () => $('#password');
  const formEl  = () => $('#registerForm');
  const btnEl   = () => $('#registerBtn');

  const emailErr = () => $('#emailErr');
  const passErr  = () => $('#passErr');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  function showErr(el, msg) {
    if (!el) return; // ak nemáme err element, ticho preskoč
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  }

  function validateEmailFormat(value) {
    return EMAIL_RE.test(String(value || '').trim());
  }

  function validatePassword(value) {
    return String(value || '').length >= 6;
  }

  // Debounce helper
  function debounce(fn, ms = 400) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // Voliteľná kontrola dostupnosti e-mailu (ak API existuje)
  // Očakáva: GET /api/users/check-email?email=... -> { exists: boolean }
  async function checkEmailExists(email) {
    try {
      const res = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
      if (!res.ok) return null; // endpoint neexistuje alebo chyba – preskočíme
      const data = await res.json();
      return !!data.exists;
    } catch {
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = formEl();
    if (!form) return;

    // live validácia e-mailu
    const runEmailChecks = debounce(async () => {
      const value = (emailEl()?.value || '').trim();
      let formatOK = validateEmailFormat(value);
      if (!formatOK) {
        showErr(emailErr(), 'Zadajte platný e-mail (napr. meno@domena.sk).');
        return;
      }
      // voliteľná kontrola dostupnosti
      const exists = await checkEmailExists(value);
      if (exists === true) {
        showErr(emailErr(), 'Tento e-mail je už zaregistrovaný.');
      } else {
        showErr(emailErr(), '');
      }
    }, 350);

    emailEl()?.addEventListener('input', runEmailChecks);
    emailEl()?.addEventListener('blur', runEmailChecks);

    // live validácia hesla
    passEl()?.addEventListener('input', () => {
      const v = passEl()?.value || '';
      showErr(passErr(), validatePassword(v) ? '' : 'Heslo musí mať aspoň 6 znakov.');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = (emailEl()?.value || '').trim();
      const password = passEl()?.value || '';

      // Front validácia
      let ok = true;
      if (!validateEmailFormat(email)) {
        showErr(emailErr(), 'Zadajte platný e-mail (napr. meno@domena.sk).');
        ok = false;
      } else {
        showErr(emailErr(), '');
      }
      if (!validatePassword(password)) {
        showErr(passErr(), 'Heslo musí mať aspoň 6 znakov.');
        ok = false;
      } else {
        showErr(passErr(), '');
      }
      if (!ok) return;

      // (voliteľne) skúsime ešte dostupnosť e-mailu, ak API existuje
      const exists = await checkEmailExists(email);
      if (exists === true) {
        showErr(emailErr(), 'Tento e-mail je už zaregistrovaný.');
        return;
      }

      // Odoslanie
      const btn = btnEl();
      btn && (btn.disabled = true);

      try {
        const res = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // server by mal vracať message: napr. "Email už existuje."
          showErr(emailErr(), data?.message || 'Registrácia zlyhala.');
          return;
        }

        // ✅ ÚSPECH → PRESMEROBAŤ NA ONBOARDING
        // prenesieme prípadný ?next=... ďalej, aby onboarding vedel kam pokračovať
        const urlParams = new URLSearchParams(location.search);
        const next = urlParams.get('next'); // voliteľné

        const onboarding = new URL('onboarding.html', location.origin);
        onboarding.searchParams.set('email', email);
        if (next) onboarding.searchParams.set('next', next);

        // replace = nedá sa vrátiť späť na register po back
        window.location.replace(onboarding.pathname + '?' + onboarding.searchParams.toString());
      } catch (err) {
        console.error('Register error', err);
        showErr(emailErr(), 'Chyba pripojenia k serveru.');
      } finally {
        btn && (btn.disabled = false);
      }
    });
  });
})();
