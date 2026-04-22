// frontend/public/login.js
(function () {
  
  function lcAlert(text){
  const modal = document.getElementById("lcModal");
  const txt = document.getElementById("lcModalText");
  const btn = document.getElementById("lcModalBtn");

  if(!modal || !txt || !btn){
    alert(text);
    return;
  }

  txt.textContent = text;
  modal.style.display = "flex";

  btn.onclick = () => {
    modal.style.display = "none";
  };
}
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
  const API_BASE = 'https://listobook.sk';

  // ✅ Presmerovanie na next s doplneným email= (ak chýba)
  function redirectToNextWithEmail(email) {

  // 🔥 NOVÉ – push redirect má prioritu
  const storedRedirect = localStorage.getItem("afterLoginRedirect");

  if (storedRedirect) {
    localStorage.removeItem("afterLoginRedirect");

    const join = storedRedirect.includes('?') ? '&' : '?';
    window.location.replace(
      storedRedirect + join + 'email=' + encodeURIComponent(email)
    );
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const nextRaw = params.get('next');

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

  const join = nextUrl.includes('?') ? '&' : '?';

  if (!/[\?&]email=/.test(nextUrl)) {
    nextUrl = nextUrl + join + 'email=' + encodeURIComponent(email);
  }

  window.location.replace(nextUrl);
}

  document.addEventListener('DOMContentLoaded', async () => {
    // AUTO PIN LOGIN – DOČASNE VYPNUTÉ
/*
const email = localStorage.getItem("lb_user_email");
const trusted = localStorage.getItem("lb_device_trusted_" + email);

if (trusted === "true" && email && localStorage.getItem("lb_has_pin_" + email) === "true") {
  const res = await fetch(`${API_BASE}/api/pin/has-pin?email=${encodeURIComponent(email)}`);
  const data = await res.json();

  if (data.hasPin) {
    window.location.href = "pin_login.html?email=" + encodeURIComponent(email);
    return;
  }
}
*/
    /* ----- LOGIN ----- */
    const form = pickForm();
    if (!form) {
      console.error('Login: nenašiel som <form> na stránke.');
      return;
    }

    const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const emailEl = pickEmailInput();
  const passEl  = pickPasswordInput();

  const email = (emailEl?.value || '').trim();
  const password = passEl?.value || '';

  if (!email || !password) {
    lcAlert('Zadaj e-mail aj heslo.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      lcAlert(data?.message || 'Nesprávny e-mail alebo heslo.');
      return;
    }

    localStorage.setItem("lb_logged_in", "true");
    localStorage.setItem("lb_user_email", email);
    localStorage.removeItem("lb_device_auth");

    let hasPin = false;

    try {
      const pinCheck = await fetch(`${API_BASE}/api/pin/has-pin?email=${encodeURIComponent(email)}`);
      const pinData = await pinCheck.json();
      hasPin = pinData.hasPin;
    } catch (e) {}

    localStorage.setItem("lb_has_pin_" + email, hasPin ? "true" : "false");
    localStorage.setItem("lb_device_trusted_" + email, "true");

    // ANDROID CALLS – DOČASNE VYPNUTÉ
/*
if (window.Android && email) {
  window.Android.saveEmail(email);
}

if (window.Android && window.Android.refreshToken) {
  window.Android.refreshToken();
}
*/

    redirectToNextWithEmail(email);

  } catch (err) {
    console.error('Login error', err);
    lcAlert('Chyba pri pripojení.');
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
  document.addEventListener("DOMContentLoaded", function () {

  const marsabSymbol = document.getElementById("marsabSymbol");
  const marsabInitials = document.getElementById("marsabInitials");

  if (!marsabSymbol || !marsabInitials) return;

  marsabSymbol.addEventListener("click", function (e) {
    e.stopPropagation();
    marsabInitials.classList.toggle("open");
  });

  document.addEventListener("click", function () {
    marsabInitials.classList.remove("open");
  });

});
})();
