// public/calc_terasa.js
document.addEventListener("DOMContentLoaded", () => {
  // --- EMAIL v hlavičke ---
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");

  const userChip = document.getElementById("userChip");
  if (userChip) {
    userChip.textContent = email
      ? `Prihlásený: ${email}`
      : "Prihlásený: –";
  }

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const target = "calc_index.html";
      if (email) {
        window.location.href = `${target}?email=${encodeURIComponent(email)}`;
      } else {
        window.location.href = target;
      }
    });
  }

  // --- Stav kroku 1 ---
  const state = {
    constructionTypeKey: null,
    constructionLabel: null
  };

  const constructionGrid = document.getElementById("constructionGrid");
  const currentTypeLabel = document.getElementById("currentTypeLabel");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");
  const goToCalcBtn = document.getElementById("goToCalcBtn");

  // kam sa ide podľa typu
  const TYPE_TARGETS = {
    "covered-terrace": "calc_terasa_kryta.html",
    "terrace-over-room": "calc_terasa_poschodie.html",
    "ground-terrace": "calc_terasa_teren.html",
    "balcony-cantilever": "calc_balkony.html"
  };

  // výber typu kliknutím na kartu
  if (constructionGrid) {
    constructionGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".type-card");
      if (!card) return;

      const type = card.dataset.type;
      const label = card.dataset.label || "";

      state.constructionTypeKey = type;
      state.constructionLabel = label;

      document
        .querySelectorAll(".type-card")
        .forEach((c) => c.classList.toggle("selected", c === card));

      if (currentTypeLabel) {
        currentTypeLabel.textContent = label || "žiadny";
      }
      if (goToCalcBtn) {
        goToCalcBtn.disabled = !type;
      }
    });
  }

  // vymazať výber
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", () => {
      state.constructionTypeKey = null;
      state.constructionLabel = null;
      document
        .querySelectorAll(".type-card")
        .forEach((c) => c.classList.remove("selected"));
      if (currentTypeLabel) currentTypeLabel.textContent = "žiadny";
      if (goToCalcBtn) goToCalcBtn.disabled = true;
    });
  }

  // prechod na konkrétnu kalkulačku (krok 2+3)
  if (goToCalcBtn) {
    goToCalcBtn.addEventListener("click", () => {
      const type = state.constructionTypeKey;
      const label = state.constructionLabel;
      if (!type || !TYPE_TARGETS[type]) {
        alert("Najprv vyberte typ balkóna alebo terasy.");
        return;
      }

      const target = TYPE_TARGETS[type];
      const qp = new URLSearchParams();

      if (email) qp.set("email", email);
      qp.set("type", type);
      if (label) qp.set("typeLabel", label);

      const url = qp.toString() ? `${target}?${qp.toString()}` : target;
      window.location.href = url;
    });
  }
});
