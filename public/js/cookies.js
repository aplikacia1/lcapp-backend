// public/js/cookies.js
// Jednoduchý INFO banner o cookies – bez vypínania kategórií.
// Používame len technické/nezbytné cookies pre fungovanie aplikácie.

(function () {
  const STORAGE_KEY = "lc_cookie_info_seen_v1";

  function hasSeenBanner() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function rememberSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      // ignorujeme
    }
  }

  function createBanner() {
    if (document.getElementById("lcCookieBanner")) return;

    const banner = document.createElement("div");
    banner.id = "lcCookieBanner";
    banner.style.position = "fixed";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.bottom = "78px";
    banner.style.zIndex = "9999";
    banner.style.background = "rgba(6, 28, 71, 0.97)";
    banner.style.color = "#ffffff";
    banner.style.padding = "12px 16px";
    banner.style.boxShadow = "0 -2px 12px rgba(0,0,0,.35)";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.fontSize = "14px";

    banner.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px;">
        <div>
          <strong>🍪 Cookies na Lištobooku</strong>
        </div>
        <div style="line-height:1.4;">
          V Lištobooku používame len nevyhnutné technické cookies potrebné
          na prihlásenie, zabezpečenie a chod aplikácie. Nepoužívame žiadne
          marketingové cookies tretích strán.
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end;">
          <button id="lcBtnOk" type="button"
            style="border-radius:999px; padding:6px 18px; border:1px solid #7cffb3; background:#12a15a; color:#ffffff; cursor:pointer;">
            Rozumiem
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const btnOk = document.getElementById("lcBtnOk");
    if (btnOk) {
      btnOk.addEventListener("click", () => {
        rememberSeen();
        hideBanner();
      });
    }
  }

  function hideBanner() {
    const el = document.getElementById("lcCookieBanner");
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  // Jednoduché „dummy“ API – nech sa nič nepokazí, ak ho niekde voláme
  const api = {
    getPrefs: () => ({
      necessary: true,
      analytics: false,
      media: false,
    }),
    setPrefs: () => {
      // už nič neukladáme – všetko sú len nevyhnutné cookies
    },
    isCategoryAllowed: () => true,
    bindSettingsForm: () => {
      // na dashboarde už nemáme formulár s cookies
    },
  };

  window.LC_Cookies = api;

  document.addEventListener("DOMContentLoaded", () => {
    if (!hasSeenBanner()) {
      createBanner();
    }
  });
})();
