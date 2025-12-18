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

  // Voláme relatívne cesty (backend beží na rovnakom pôvode).
  const API_BASE = '';

  // ✅ Presmerovanie na next s doplneným email= (ak chýba)
  function redirectToNextWithEmail(email) {
    const params = new URLSearchParams(window.location.search);
    const nextRaw = params.get('next');

    // fallback keď nie je next
    const fallback = `timeline.html?email=${encodeURIComponent(email)}`;

    if (!nextRaw) {
      window.location.replace(fallback);
      return;
    }

    let nextUrl = '';
    try {
      nextUrl = decodeURIComponent(nextRaw);
    } catch {
      nextUrl = nextRaw;
    }

    // Ak next je len cesta bez query, nič nevadí
    const join = nextUrl.includes('?') ? '&' : '?';

    // nepridávaj, ak už email je
    if (!/[\?&]email=/.test(nextUrl)) {
      nextUrl = nextUrl + join + 'email=' + encodeURIComponent(email);
    }

    window.location.replace(nextUrl);
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* ----- LOGIN ----- */
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
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // nech sa nastaví JWT cookie
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data?.message || 'Nesprávny e-mail alebo heslo.');
          return;
        }

        // ✅ presmerovanie po úspechu: next + email (alebo fallback)
        redirectToNextWithEmail(email);

      } catch (err) {
        console.error('Login error', err);
        alert('Chyba pri pripojení.');
      }
    });

    /* ----- FORGOT PASSWORD ----- */
    const forgotLink = $('#forgotLink');
    const forgotWrap = $('#forgotWrap');
    const forgotEmail = $('#forgotEmail');
    const forgotBtn = $('#forgotBtn');
    const forgotMsg = $('#forgotMsg');

    if (forgotLink && forgotWrap && forgotBtn) {
      // otvor/zavri panel
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        // prefukni email z login inputu
        const loginEmail = pickEmailInput()?.value || '';
        if (loginEmail && !forgotEmail.value) forgotEmail.value = loginEmail.trim();

        forgotWrap.style.display = (forgotWrap.style.display === 'none' || !forgotWrap.style.display)
          ? 'block' : 'none';
        forgotMsg.textContent = '';
        forgotMsg.className = '';
      });

      // odoslanie požiadavky na reset
      forgotBtn.addEventListener('click', async () => {
        const email = (forgotEmail?.value || '').trim();
        if (!email) {
          forgotMsg.textContent = 'Zadajte, prosím, e-mail.';
          forgotMsg.className = 'err';
          return;
        }

        try {
          forgotBtn.disabled = true;
          forgotMsg.textContent = '';
          forgotMsg.className = '';

          const res = await fetch(`${API_BASE}/api/password/forgot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          // Endpoint vždy vracia 200, aby neprezrádzal existenciu účtu
          if (res.ok) {
            forgotMsg.textContent = 'Ak e-mail existuje, poslali sme odkaz na obnovenie (platí 1 hodinu).';
            forgotMsg.className = 'ok';
          } else {
            forgotMsg.textContent = 'Skúste to o chvíľu znova.';
            forgotMsg.className = 'err';
          }
        } catch (err) {
          console.error('Forgot error', err);
          forgotMsg.textContent = 'Chyba pripojenia.';
          forgotMsg.className = 'err';
        } finally {
          forgotBtn.disabled = false;
        }
      });
    }
  });
})();
