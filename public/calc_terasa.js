// calc_terasa.js
(function () {
  // Pomocné – zisti, či sme na mobile (šírka do 768px)
  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  // ===== EMAIL + HLAVIČKA ===================================================
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";

  const userChip = document.getElementById("userChip");
  if (userChip) {
    userChip.textContent = email
      ? `Prihlásený: ${email}`
      : "Prihlásený: hosť";
  }

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // späť na prehľad kalkulačiek
      const target = "calc_index.html";
      if (email) {
        window.location.href = `${target}?email=${encodeURIComponent(email)}`;
      } else {
        window.location.href = target;
      }
    });
  }

  // ===== KROKY – prepínanie sekcií ==========================================
  const stepSections = Array.from(document.querySelectorAll(".step-section"));

  function showStep(stepId) {
    stepSections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === stepId);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // štartujeme na kroku 1
  showStep("step1");

  // ===== MOBILNÉ POTVRDZOVACIE OKNO (po výbere typu) ========================
  let mobileModalCreated = false;
  let mobileModalEl = null;
  let mobileModalTitle = null;
  let mobileModalText = null;
  let mobileModalBackBtn = null;
  let mobileModalConfirmBtn = null;

  function ensureMobileModal() {
    if (mobileModalCreated) return;

    // vložíme CSS pre mobilný modal
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @media (max-width: 768px) {
        .mobile-step-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: none;
          align-items: flex-end;
          justify-content: center;
          z-index: 1500;
        }
        .mobile-step-modal-overlay.is-open {
          display: flex;
        }
        .mobile-step-modal {
          width: 100%;
          max-width: 480px;
          background: #020617;
          border-radius: 18px 18px 0 0;
          border-top: 1px solid rgba(148,163,184,0.7);
          box-shadow: 0 -14px 30px rgba(0,0,0,0.8);
          padding: 14px 14px 10px;
        }
        .mobile-step-modal-title {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .mobile-step-modal-text {
          font-size: 0.8rem;
          color: #e5e7eb;
          margin: 0 0 10px;
        }
        .mobile-step-modal-actions {
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid rgba(31,41,55,0.9);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mobile-step-modal-actions .btn-inline {
          width: 100%;
          justify-content: center;
          background: #020617;
        }
        .mobile-step-modal-actions .btn-primary {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(styleEl);

    // vytvoríme samotný modal
    const overlay = document.createElement("div");
    overlay.className = "mobile-step-modal-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const box = document.createElement("div");
    box.className = "mobile-step-modal";

    const titleEl = document.createElement("div");
    titleEl.className = "mobile-step-modal-title";

    const textEl = document.createElement("p");
    textEl.className = "mobile-step-modal-text";

    const actions = document.createElement("div");
    actions.className = "mobile-step-modal-actions";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "btn-inline";
    backButton.textContent = "Zmeniť výber";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "btn-primary";
    confirmButton.textContent = "Pokračovať na krok 2 ›";

    actions.appendChild(backButton);
    actions.appendChild(confirmButton);
    box.appendChild(titleEl);
    box.appendChild(textEl);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    mobileModalCreated = true;
    mobileModalEl = overlay;
    mobileModalTitle = titleEl;
    mobileModalText = textEl;
    mobileModalBackBtn = backButton;
    mobileModalConfirmBtn = confirmButton;

    // správanie tlačidiel
    mobileModalBackBtn.addEventListener("click", () => {
      closeMobileModal();
    });

    mobileModalConfirmBtn.addEventListener("click", () => {
      closeMobileModal();
      showStep("step2");
    });

    // klik mimo box zatvára okno
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeMobileModal();
      }
    });
  }

  function openMobileModal(selectedLabel) {
    if (!isMobile() || !selectedLabel) return;
    ensureMobileModal();

    mobileModalTitle.textContent = "Vybrali ste typ konštrukcie";
    mobileModalText.textContent =
      `Zvolený typ: ${selectedLabel}. ` +
      "Ak to sedí, pokračujte na krok 2. Ak nie, môžete výber zmeniť.";

    mobileModalEl.classList.add("is-open");
    mobileModalEl.setAttribute("aria-hidden", "false");
  }

  function closeMobileModal() {
    if (!mobileModalEl) return;
    mobileModalEl.classList.remove("is-open");
    mobileModalEl.setAttribute("aria-hidden", "true");
  }

  // ===== KROK 1 – VÝBER TYPU KONŠTRUKCIE ====================================
  const constructionGrid = document.getElementById("constructionGrid");
  const currentTypeLabelEl = document.getElementById("currentTypeLabel");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");
  const goToStep2Btn = document.getElementById("goToStep2Btn");

  let selectedConstruction = null;

  function updateCurrentTypeLabel() {
    if (!currentTypeLabelEl) return;
    currentTypeLabelEl.textContent =
      selectedConstruction && selectedConstruction.label
        ? selectedConstruction.label
        : "žiadny";
  }

  function resetConstructionSelection() {
    selectedConstruction = null;
    document
      .querySelectorAll(".type-card")
      .forEach((c) => c.classList.remove("selected"));
    updateCurrentTypeLabel();
    if (goToStep2Btn) goToStep2Btn.disabled = true;
  }

  if (constructionGrid) {
    constructionGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".type-card");
      if (!card) return;

      document
        .querySelectorAll(".type-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      selectedConstruction = {
        type: card.dataset.type || "",
        label: card.dataset.label || "",
      };

      updateCurrentTypeLabel();
      if (goToStep2Btn) goToStep2Btn.disabled = false;

      // na mobile po výbere rovno zobrazíme potvrdenie
      if (isMobile()) {
        openMobileModal(selectedConstruction.label);
      }
    });
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", () => {
      resetConstructionSelection();
    });
  }

  if (goToStep2Btn) {
    goToStep2Btn.addEventListener("click", () => {
      if (!selectedConstruction) return;
      // na mobile ešte raz potvrdíme (ak nebolo potvrdené po kliknutí)
      if (isMobile()) {
        openMobileModal(selectedConstruction.label);
      } else {
        showStep("step2");
      }
    });
  }

  // ===== KROK 2 – TVAR + ROZMERY ============================================
  const shapeGrid = document.getElementById("shapeGrid");
  const dimShapeInfo = document.getElementById("dimShapeInfo");
  const fieldSideBWrapper = document.getElementById("fieldSideB");
  const sideAInput = document.getElementById("sideA");
  const sideBInput = document.getElementById("sideB");
  const summaryAreaEl = document.getElementById("summaryArea");
  const summaryPerimeterEl = document.getElementById("summaryPerimeter");
  const backToStep1Btn = document.getElementById("backToStep1Btn");
  const goToStep3Btn = document.getElementById("goToStep3Btn");

  let selectedShape = "square";
  let areaValue = null;
  let perimeterValue = null;

  function parseInputNumber(inputEl) {
    if (!inputEl) return null;
    const raw = (inputEl.value || "").replace(",", ".");
    const val = parseFloat(raw);
    return Number.isFinite(val) && val > 0 ? val : null;
  }

  function updateDimensionsSummary() {
    const a = parseInputNumber(sideAInput);
    let b = parseInputNumber(sideBInput);

    if (!a) {
      areaValue = null;
      perimeterValue = null;
    } else {
      if (selectedShape === "square") {
        if (!b) b = a;
      }
      if (!b) {
        areaValue = null;
        perimeterValue = null;
      } else {
        const area = a * b;
        const perim = 2 * (a + b);
        areaValue = Math.round(area * 10) / 10;
        perimeterValue = Math.round(perim * 10) / 10;
      }
    }

    if (summaryAreaEl) {
      summaryAreaEl.textContent =
        areaValue != null ? areaValue.toString().replace(".", ",") : "–";
    }
    if (summaryPerimeterEl) {
      summaryPerimeterEl.textContent =
        perimeterValue != null ? perimeterValue.toString().replace(".", ",") : "–";
    }
  }

  if (shapeGrid) {
    shapeGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".shape-card");
      if (!card) return;

      document
        .querySelectorAll(".shape-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      selectedShape = card.dataset.shape || "square";

      if (dimShapeInfo) {
        if (selectedShape === "square") {
          dimShapeInfo.textContent = "Štvorec – všetky strany A sú rovnaké.";
        } else {
          dimShapeInfo.textContent =
            "Obdĺžnik – dve rôzne strany A a B. Aj mierny „šikmý“ pôdorys je v poriadku.";
        }
      }

      if (fieldSideBWrapper) {
        fieldSideBWrapper.style.opacity =
          selectedShape === "square" ? "0.7" : "1";
      }

      updateDimensionsSummary();
    });
  }

  if (sideAInput) {
    sideAInput.addEventListener("input", updateDimensionsSummary);
  }
  if (sideBInput) {
    sideBInput.addEventListener("input", updateDimensionsSummary);
  }

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener("click", () => {
      showStep("step1");
    });
  }

  if (goToStep3Btn) {
    goToStep3Btn.addEventListener("click", () => {
      // doplníme súhrn a otázky
      fillStep3Summary();
      showStep("step3");
    });
  }

  // ===== KROK 3 – SKLADBA SYSTÉMU ===========================================
  const k3TypeEl = document.getElementById("k3Type");
  const k3ShapeEl = document.getElementById("k3Shape");
  const k3AreaEl = document.getElementById("k3Area");
  const k3PerimeterEl = document.getElementById("k3Perimeter");
  const balconyQuestionBox = document.getElementById("balconyQuestion");
  const otherConstructionNote = document.getElementById("otherConstructionNote");
  const recommendedNameEl = document.getElementById("recommendedName");
  const recommendedNoteEl = document.getElementById("recommendedNote");

  function niceShapeName(shape) {
    if (shape === "rectangle") return "Obdĺžnik / kosoštvorec";
    return "Štvorec";
  }

  function fillStep3Summary() {
    if (k3TypeEl) {
      k3TypeEl.textContent =
        selectedConstruction && selectedConstruction.label
          ? selectedConstruction.label
          : "–";
    }
    if (k3ShapeEl) {
      k3ShapeEl.textContent = niceShapeName(selectedShape);
    }
    if (k3AreaEl) {
      k3AreaEl.textContent =
        areaValue != null ? areaValue.toString().replace(".", ",") : "–";
    }
    if (k3PerimeterEl) {
      k3PerimeterEl.textContent =
        perimeterValue != null ? perimeterValue.toString().replace(".", ",") : "–";
    }

    const isBalcony =
      selectedConstruction && selectedConstruction.type === "balcony-cantilever";

    if (balconyQuestionBox) {
      balconyQuestionBox.style.display = isBalcony ? "block" : "none";
    }
    if (otherConstructionNote) {
      otherConstructionNote.style.display = isBalcony ? "none" : "block";
    }

    if (!isBalcony && recommendedNameEl && recommendedNoteEl) {
      recommendedNameEl.textContent =
        "Zatiaľ nevybraná – doplníme podľa typu terasy.";
      recommendedNoteEl.textContent =
        "Pre terasy a prekryté konštrukcie pripravujeme detailné skladby. Technik Lištového centra vám ich odporučí individuálne podľa zadaných údajov.";
    }
  }

  // Voľba odtoku vody na balkóne
  const drainOptions = document.querySelectorAll(".drain-option");

  drainOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      drainOptions.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      const opt = btn.getAttribute("data-drain-option");
      if (!recommendedNameEl || !recommendedNoteEl) return;

      if (opt === "edge-free") {
        recommendedNameEl.textContent =
          "Schlüter®-TROBA + ukončovacie profily s voľnou hranou";
        recommendedNoteEl.textContent =
          "Odporúčame systém s drenážnou rohožou Schlüter®-TROBA a ukončovacími profilmi, cez ktoré voda voľne steká z hrany balkóna.";
      } else if (opt === "edge-gutter") {
        recommendedNameEl.textContent =
          "Schlüter®-BARA s napojením na žľab + drenážna rohož";
        recommendedNoteEl.textContent =
          "Zvoľte systém s ukončovacími profilmi Schlüter®-BARA a napojením na žľab. Drenážna rohož pomáha odviesť vodu do žľabu bez zadržiavania.";
      } else if (opt === "internal-drain") {
        recommendedNameEl.textContent =
          "Schlüter®-DITRA + odvodnenie k podlahovému vpustu";
        recommendedNoteEl.textContent =
          "Pre balkóny s vnútorným vpustom odporúčame tesniacu a odvodňovaciu rohož Schlüter®-DITRA s napojením na vpust v podlahe.";
      } else {
        recommendedNameEl.textContent =
          "Zatiaľ nevybraná – zvoľte odtok vody.";
        recommendedNoteEl.textContent =
          "Vyberte spôsob odtoku vody z balkóna, aby sme vedeli odporučiť konkrétnu skladbu systému Schlüter®.";
      }
    });
  });

  // bezpečne dopočítať po načítaní
  updateDimensionsSummary();
})();
