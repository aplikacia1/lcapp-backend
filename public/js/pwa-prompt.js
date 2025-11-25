// public/js/pwa-prompt.js
// PWA inštalačný popup (Android + desktop, kde existuje beforeinstallprompt)
// iOS Chrome/Safari ho nepodporuje → tam sa nezobrazí.

(function () {
  const STORAGE_KEY = "lc_pwa_prompt_v1";
  const SHOW_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hodín

  let deferredPrompt = null;
  let isOpen = false;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { never: false, lastShown: 0 };
      const parsed = JSON.parse(raw);
      return {
        never: !!parsed.never,
        lastShown: Number(parsed.lastShown || 0),
      };
    } catch {
      return { never: false, lastShown: 0 };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          never: !!state.never,
          lastShown: Number(state.lastShown || 0),
        })
      );
    } catch {
      // ignoruj
    }
  }

  function canShowNow() {
    const st = loadState();
    if (st.never) return false;
    const now = Date.now();
    if (st.lastShown && now - st.lastShown < SHOW_INTERVAL_MS) {
      return false;
    }
    return true;
  }

  function markShown(opts) {
    const st = loadState();
    if (opts && opts.never) {
      st.never = true;
    }
    st.lastShown = Date.now();
    saveState(st);
  }

  function createPopup() {
    if (document.getElementById("lcPwaPrompt")) return;

    const wrap = document.createElement("div");
    wrap.id = "lcPwaPrompt";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");

    wrap.style.position = "fixed";
    wrap.style.zIndex = "9998";
    wrap.style.left = "0";
    wrap.style.right = "0";
    wrap.style.bottom = "0";
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.style.padding = "10px 10px 14px";
    wrap.style.pointerEvents = "none";

    const card = document.createElement("div");
    card.style.pointerEvents = "auto";
    card.style.maxWidth = "420px";
    card.style.width = "100%";
    card.style.background = "rgba(6,28,71,0.97)";
    card.style.color = "#ffffff";
    card.style.borderRadius = "16px";
    card.style.border = "1px solid rgba(255,255,255,0.22)";
    card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.45)";
    card.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    card.style.fontSize = "14px";
    card.style.padding = "10px 14px 10px";

    card.innerHTML = `
      <div style="display:flex; gap:10px; align-items:flex-start;">
        <div style="font-size:22px; line-height:1.1;">🍭</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; margin-bottom:4px;">
            Lištobook ako lollipop aplikácia
          </div>
          <div style="opacity:.9; line-height:1.4; margin-bottom:8px;">
            Pridajte si našu aplikáciu <strong>Lištobook</strong> na plochu a majte
            časovú os, recenzie aj správy vždy po ruke – ako malé lízatko v mobile
            alebo notebooku.
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:4px;">
            <button type="button" data-role="install"
              style="
                flex:1 1 auto;
                min-width:120px;
                height:38px;
                border-radius:999px;
                border:none;
                cursor:pointer;
                padding:0 14px;
                background:linear-gradient(135deg,#60a5fa,#2563eb);
                color:#f9fafb;
                font-weight:600;
                box-shadow:0 10px 26px rgba(37,99,235,0.7);
              ">
              Nainštalovať aplikáciu
            </button>
            <button type="button" data-role="later"
              style="
                flex:0 0 auto;
                height:38px;
                padding:0 14px;
                border-radius:999px;
                border:1px solid rgba(148,163,255,.7);
                background:transparent;
                color:#e5edff;
                cursor:pointer;
              ">
              Nie teraz
            </button>
          </div>
          <button type="button" data-role="never"
            style="
              margin:0;
              padding:0;
              border:none;
              background:transparent;
              color:#9ca3af;
              font-size:12px;
              cursor:pointer;
              text-decoration:underline;
            ">
            Nezobrazovať túto ponuku
          </button>
        </div>
      </div>
    `;

    wrap.appendChild(card);
    document.body.appendChild(wrap);

    const btnInstall = wrap.querySelector("[data-role='install']");
    const btnLater = wrap.querySelector("[data-role='later']");
    const btnNever = wrap.querySelector("[data-role='never']");

    btnInstall.addEventListener("click", async () => {
      if (!deferredPrompt) {
        closePopup();
        return;
      }
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        markShown({ never: choice.outcome === "accepted" });
      } catch {
        // aj tak banner skryjeme
        markShown({});
      }
      closePopup();
    });

    btnLater.addEventListener("click", () => {
      markShown({});
      closePopup();
    });

    btnNever.addEventListener("click", () => {
      markShown({ never: true });
      closePopup();
    });
  }

  function openPopup() {
    if (isOpen) return;
    if (!canShowNow()) return;
    if (!document.body) return;

    createPopup();
    const el = document.getElementById("lcPwaPrompt");
    if (el) {
      el.style.display = "flex";
      isOpen = true;
    }
  }

  function closePopup() {
    const el = document.getElementById("lcPwaPrompt");
    if (el) {
      el.style.display = "none";
    }
    isOpen = false;
  }

  // === beforeinstallprompt handler ===
  window.addEventListener("beforeinstallprompt", (e) => {
    // iba prostredia, kde toto existuje (Android / desktop Chromium)
    e.preventDefault();
    deferredPrompt = e;

    // ak používateľ zakázal, nerieš
    if (!canShowNow()) return;

    // malá pauza, nech sa stránka najprv načíta
    setTimeout(() => {
      openPopup();
    }, 2500);
  });
})();
