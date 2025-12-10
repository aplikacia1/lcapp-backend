// public/calc_terasa_base.js
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------------------
  // EMAIL v hlavičke + tlačidlo späť
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // KROK 1 – výber typu konštrukcie (iba vizuál + preklik na špecializované kalkulačky)
  // ---------------------------------------------------------------------------
  const constructionGrid = document.getElementById("constructionGrid");
  const currentTypeLabel = document.getElementById("currentTypeLabel");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");
  const goToStep2Btn = document.getElementById("goToStep2Btn"); // tlačidlo „Pokračovať na výpočet ›“

  // vnútorný stav
  const state = {
    constructionTypeKey: null,
    constructionLabel: null
  };

  // po kliknutí na kartu typu
  if (constructionGrid) {
    constructionGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".type-card");
      if (!card) return;

      const type = card.dataset.type;
      const label = card.dataset.label || "";

      state.constructionTypeKey = type;
      state.constructionLabel = label;

      // vizuálna selekcia kariet
      document
        .querySelectorAll(".type-card")
        .forEach((c) => c.classList.toggle("selected", c === card));

      if (currentTypeLabel) {
        currentTypeLabel.textContent = label || "žiadny";
      }

      // tlačidlo „Pokračovať na výpočet“ povolíme vždy,
      // ale neskôr v handleri rozlíšime typ
      if (goToStep2Btn) {
        goToStep2Btn.disabled = false;
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

      if (currentTypeLabel) {
        currentTypeLabel.textContent = "žiadny";
      }

      if (goToStep2Btn) {
        goToStep2Btn.disabled = true;
      }
    });
  }

  // klik na „Pokračovať na výpočet ›“
  if (goToStep2Btn) {
    goToStep2Btn.addEventListener("click", () => {
      if (!state.constructionTypeKey) {
        // poistka – nemal by nastať, keďže bez výberu je tlačidlo disabled
        alert("Najprv vyberte typ balkóna alebo terasy.");
        return;
      }

      // zatiaľ máme spravenú iba kalkulačku pre vysunutý balkón
      if (state.constructionTypeKey === "balcony-cantilever") {
        const target = "calc_balkony.html";
        if (email) {
          window.location.href = `${target}?email=${encodeURIComponent(email)}`;
        } else {
          window.location.href = target;
        }
      } else {
        // ostatné typy – len informácia, kalkulačky doplníme neskôr
        alert(
          "Kalkulačka pre tento typ terasy/balkóna sa pripravuje.\n" +
            "Zatiaľ je k dispozícii iba samostatná kalkulačka pre vysunutý balkón."
        );
      }
    });

    // pri načítaní stránky je tlačidlo neaktívne
    goToStep2Btn.disabled = true;
  }
});
