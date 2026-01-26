// public/calc_terasa_base.js
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------------------
  // EMAIL v hlavičke + tlačidlo späť
  // ---------------------------------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";

  const userChip = document.getElementById("userChip");
  if (userChip) {
    userChip.textContent = email
      ? `Prihlásený: ${email}`
      : "Prihlásený: –";
  }

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const target = "kalkulacky.html";
      if (email) {
        window.location.href = `${target}?email=${encodeURIComponent(email)}`;
      } else {
        window.location.href = target;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // KROK 1 – výber typu konštrukcie
  // ---------------------------------------------------------------------------
  const constructionGrid = document.getElementById("constructionGrid");
  const currentTypeLabelEl = document.getElementById("currentTypeLabel");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");
  const goToStep2Btn = document.getElementById("goToStep2Btn");

  const state = {
    constructionTypeKey: null,
    constructionLabel: null
  };

  function updateUI() {
    if (currentTypeLabelEl) {
      currentTypeLabelEl.textContent = state.constructionLabel || "žiadny";
    }
    if (goToStep2Btn) {
      goToStep2Btn.disabled = !state.constructionTypeKey;
    }
  }

  function clearSelection() {
    state.constructionTypeKey = null;
    state.constructionLabel = null;

    document
      .querySelectorAll(".type-card")
      .forEach((c) => c.classList.remove("selected"));

    updateUI();
  }

  // výber karty
  if (constructionGrid) {
    constructionGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".type-card");
      if (!card) return;

      const type = card.dataset.type || "";
      const label = card.dataset.label || "";

      if (!type) return;

      state.constructionTypeKey = type;
      state.constructionLabel = label;

      document
        .querySelectorAll(".type-card")
        .forEach((c) => c.classList.toggle("selected", c === card));

      updateUI();
    });
  }

  // vymazať výber
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", () => {
      clearSelection();
    });
  }

  // klik na „Pokračovať na výpočet ›“
  if (goToStep2Btn) {
    goToStep2Btn.addEventListener("click", () => {
      if (!state.constructionTypeKey) {
        alert("Najprv vyberte typ balkóna alebo terasy.");
        return;
      }

      // Momentálne máme hotovú iba kalkulačku pre vysunutý balkón
      if (state.constructionTypeKey !== "balcony-cantilever") {
        alert(
          "Kalkulačka pre tento typ terasy je v príprave.\n\n" +
          "Momentálne je dostupná iba kalkulačka pre vysunutý balkón (konzolu)."
        );
        return;
      }

      // ✅ Vysunutý balkón → preklik na calc_balkony_v2.html, s parametrami
      const nextParams = new URLSearchParams();
      if (email) {
        nextParams.set("email", email);
      }
      nextParams.set("type", state.constructionTypeKey);
      if (state.constructionLabel) {
        nextParams.set("label", state.constructionLabel);
      }

      const target = "calc_balkony_v2.html";
      window.location.href = `${target}?${nextParams.toString()}`;
    });

    // pri načítaní stránky je tlačidlo neaktívne
    goToStep2Btn.disabled = true;
  }

  // initial
  updateUI();
});
