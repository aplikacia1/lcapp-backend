// public/js/pwa-prompt.js
// Vyskakovacie okno pre inštaláciu PWA LCAPP (max 3x denne)

(function () {
  const STORAGE_KEY = "lc_pwa_prompt_v1";
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  function canShowPrompt() {
    let state = loadState() || {};
    if (state.neverShow) return false;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (state.date !== today) {
      state.date = today;
      state.shown = 0;
    }

    if (state.shown >= 3) {
      saveState(state);
      return false;
    }

    state.shown = (state.shown || 0) + 1;
    saveState(state);
    return true;
  }

  function markNeverShow() {
    let state = loadState() || {};
    state.neverShow = true;
    saveState(state);
  }

  function showModal() {
    const modal = document.getElementById("pwaPrompt");
    if (!modal) return;
    modal.style.display = "flex";
  }

  function hideModal() {
    const modal = document.getElementById("pwaPrompt");
    if (!modal) return;
    modal.style.display = "none";
  }

  // Zachytíme systémový PWA prompt a ukážeme náš dialóg
  window.addEventListener("beforeinstallprompt", (event) => {
    if (isStandalone()) return; // už beží ako appka
    if (!canShowPrompt()) return; // limit 3x denne

    event.preventDefault();      // vypneme default mini-banner
    deferredPrompt = event;

    // malá pauza po načítaní stránky
    setTimeout(showModal, 1500);
  });

  document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("pwaPrompt");
    if (!modal) return; // na iných stránkach sa nič nedeje

    const btnClose   = modal.querySelector("[data-pwa-close]");
    const btnLater   = modal.querySelector("[data-pwa-later]");
    const btnInstall = modal.querySelector("[data-pwa-install]");

    function closeOnly() {
      hideModal();
    }

    btnClose?.addEventListener("click", closeOnly);
    btnLater?.addEventListener("click", closeOnly);

    btnInstall?.addEventListener("click", async () => {
      if (!deferredPrompt) {
        hideModal();
        return;
      }
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          // užívateľ appku nainštaloval → už nikdy neotravujeme
          markNeverShow();
        }
      } catch {
        // ignorujeme
      } finally {
        deferredPrompt = null;
        hideModal();
      }
    });

    // Zavretie ESC
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideModal();
    });
  });
})();
