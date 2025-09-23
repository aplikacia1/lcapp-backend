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

  // Zobrazí/Skryje chybovú hlášku a označí vstup ako ne/platný
  function showErr(errEl, msg) {
    if (!errEl) return;
    const targetSel = errEl.getAttribute('data-target');
    const input = targetSel ? $(targetSel) : null;

    const text = msg || '';
    errEl.textContent = text;
    // Poistka: zobrazí ak je text
    errEl.style.display = text ? 'block' : 'none';
    errEl.classList.toggle('show', !!text);

    if (input) {
      input.classList.toggle('is-invalid', !!text);
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    }
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
      if (!res.ok) return null;
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
      if (!validateEmailFormat(value)) {
        showErr(emailErr(), 'Zadajte platný e-mail (napr. meno@domena.sk).');
        return;
      }
      const exists = await checkEmailExists(value);
      if (exists === true) {
        showErr(emailErr(), 'Tento e-mail je už zaregistrovaný.');
      } else {
        showErr(emailErr(), '');
      }
    }, 250);

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

      if (!ok) {
        if (emailEl()?.classList.contains('is-invalid')) { emailEl().focus(); }
        else if (passEl()?.classList.contains('is-invalid')) { passEl().focus(); }
        return;
      }

      const exists = await checkEmailExists(email);
      if (exists === true) {
        showErr(emailErr(), 'Tento e-mail je už zaregistrovaný.');
        emailEl()?.focus();
        return;
      }

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
          showErr(emailErr(), data?.message || 'Registrácia zlyhala.');
          emailEl()?.focus();
          return;
        }

        // ✅ ÚSPECH → PRESMEROVAŤ NA ONBOARDING
        const urlParams = new URLSearchParams(location.search);
        const next = urlParams.get('next');

        const onboarding = new URL('onboarding.html', location.origin);
        onboarding.searchParams.set('email', email);
        if (next) onboarding.searchParams.set('next', next);

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
