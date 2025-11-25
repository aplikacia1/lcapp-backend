// public/js/cookies.js
// Jednoduchý správca cookies pre Lištobook (iba na súhlas, nie na prihlásenie)

(function () {
  const STORAGE_KEY = "lc_cookie_prefs_v1";

  const DEFAULT_PREFS = {
    necessary: true,  // vždy zapnuté, nedá sa vypnúť
    analytics: false, // štatistika návštevnosti (ak bude)
    media: false      // YouTube, vložené videá a iný externý obsah
  };

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        necessary: true,
        analytics: !!parsed.analytics,
        media: !!parsed.media
      };
    } catch (e) {
      console.warn("[cookies] Nepodarilo sa načítať prefs:", e);
      return null;
    }
  }

  function savePrefs(prefs) {
    const toSave = {
      analytics: !!prefs.analytics,
      media: !!prefs.media
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("[cookies] Nepodarilo sa uložiť prefs:", e);
    }
    applyPrefs({
      necessary: true,
      analytics: !!prefs.analytics,
      media: !!prefs.media
    });
  }

  function applyPrefs(prefs) {
    document.dispatchEvent(
      new CustomEvent("lc-cookie-update", { detail: prefs })
    );
  }

  function ensurePrefs() {
    let prefs = loadPrefs();
    if (!prefs) {
      // ešte nemáme nič uložené → žiadny súhlas → zobrazíme banner
      applyPrefs({ ...DEFAULT_PREFS });
      return null;
    }
    applyPrefs(prefs);
    return prefs;
  }

  // ---------- Banner UI ----------

  function createBanner() {
    if (document.getElementById("lcCookieBanner")) return;

    const banner = document.createElement("div");
    banner.id = "lcCookieBanner";
    banner.style.position = "fixed";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.bottom = "0";
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
          Na tejto stránke používame nevyhnutné cookies na správne fungovanie webu
          (prihlásenie, bezpečnosť). Voliteľne môžeme používať aj cookies pre
          štatistiky návštevnosti a prehrávanie vloženého obsahu (napr. YouTube).
          Svoj výber môžete kedykoľvek zmeniť vo svojom účte.
        </div>
        <details id="lcCookieMore" style="background:rgba(0,0,0,.15); border-radius:8px; padding:6px 8px;">
          <summary style="cursor:pointer; outline:none;">Podrobné nastavenia</summary>
          <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px;">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" checked disabled />
              <span><strong>Nezbytné cookies</strong> – potrebné na prihlásenie a základné fungovanie.</span>
            </label>
            <label style="display:flex; align-items:flex-start; gap:8px;">
              <input type="checkbox" id="lcPrefAnalytics" />
              <span><strong>Štatistické cookies</strong> – anonymné meranie návštevnosti (ak ich zavediete).</span>
            </label>
            <label style="display:flex; align-items:flex-start; gap:8px;">
              <input type="checkbox" id="lcPrefMedia" />
              <span><strong>Mediálne cookies</strong> – prehrávanie vložených videí (YouTube a pod.).
                Bez tohto povolenia zobrazíme len zástupný obrázok.</span>
            </label>
          </div>
        </details>
        <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end;">
          <button id="lcBtnReject" type="button"
            style="border-radius:999px; padding:6px 14px; border:1px solid #ffffff55; background:transparent; color:#ffffff; cursor:pointer;">
            Povoliť len nevyhnutné
          </button>
          <button id="lcBtnAcceptSel" type="button"
            style="border-radius:999px; padding:6px 14px; border:1px solid #7cc4ff; background:#0b63c5; color:#ffffff; cursor:pointer;">
            Uložiť výber
          </button>
          <button id="lcBtnAcceptAll" type="button"
            style="border-radius:999px; padding:6px 14px; border:1px solid #7cffb3; background:#12a15a; color:#ffffff; cursor:pointer;">
            Prijať všetko
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const chkAnalytics = document.getElementById("lcPrefAnalytics");
    const chkMedia = document.getElementById("lcPrefMedia");
    const btnReject = document.getElementById("lcBtnReject");
    const btnAcceptSel = document.getElementById("lcBtnAcceptSel");
    const btnAcceptAll = document.getElementById("lcBtnAcceptAll");

    btnReject.addEventListener("click", () => {
      savePrefs({ necessary: true, analytics: false, media: false });
      hideBanner();
    });

    btnAcceptAll.addEventListener("click", () => {
      savePrefs({ necessary: true, analytics: true, media: true });
      hideBanner();
    });

    btnAcceptSel.addEventListener("click", () => {
      savePrefs({
        necessary: true,
        analytics: !!chkAnalytics.checked,
        media: !!chkMedia.checked,
      });
      hideBanner();
    });
  }

  function hideBanner() {
    const el = document.getElementById("lcCookieBanner");
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  // ---------- Verejné API pre iné časti webu ----------

  const api = {
    getPrefs: () => loadPrefs() || { ...DEFAULT_PREFS },

    setPrefs: (prefs) => {
      savePrefs(prefs || DEFAULT_PREFS);
    },

    isCategoryAllowed: (cat) => {
      const prefs = loadPrefs();
      if (!prefs) return false;
      if (cat === "analytics") return !!prefs.analytics;
      if (cat === "media") return !!prefs.media;
      return false;
    },

    // Pre dashboard – naviaže formulár s checkboxmi na aktuálne nastavenia
    bindSettingsForm: (formSelector) => {
      const form = document.querySelector(formSelector);
      if (!form) return;

      const chkAnalytics = form.querySelector("[name='cookies_analytics']");
      const chkMedia = form.querySelector("[name='cookies_media']");

      const prefs = api.getPrefs();
      if (chkAnalytics) chkAnalytics.checked = !!prefs.analytics;
      if (chkMedia) chkMedia.checked = !!prefs.media;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        api.setPrefs({
          necessary: true,
          analytics: chkAnalytics ? !!chkAnalytics.checked : false,
          media: chkMedia ? !!chkMedia.checked : false,
        });
        alert("Nastavenia cookies boli uložené.");
      });
    },
  };

  window.LC_Cookies = api;

  document.addEventListener("DOMContentLoaded", () => {
    const prefs = ensurePrefs();
    if (!prefs) {
      // nemáme žiadny uložený súhlas → zobraz banner
      createBanner();
    }
  });
})();
