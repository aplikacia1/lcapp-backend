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

  // ---------------------------------------------------------------------------
  // PARAMETRE MATERIÁLOV
  // ---------------------------------------------------------------------------
  const MATERIAL_DB = {
    DITRA: {
      key: "DITRA",
      label: "Schlüter®-DITRA",
      rollAreaM2: 30
    },
    DITRA_DRAIN_4: {
      key: "DITRA_DRAIN_4",
      label: "Schlüter®-DITRA-DRAIN 4",
      rollAreaM2: 12.5
    },
    BARA_RT: {
      key: "BARA_RT",
      label: "Schlüter®-BARA-RT",
      pieceLengthBm: 2.5
    },
    BARA_RTKE: {
      key: "BARA_RTKE",
      label: "Schlüter®-BARA-RTKE",
      pieceLengthBm: 2.5
    },
    BARIN: {
      key: "BARIN",
      label: "Schlüter®-BARIN (žľab)",
      pieceLengthBm: 2.0
    },
    ADHESIVE: {
      key: "ADHESIVE",
      label: "Lepidlo (Sopro / Mapei)",
      coverageM2PerBag: 5
    }
  };

  // Balíčky pre vysunutý balkón
  const BALCONY_SYSTEMS = {
    "edge-free": {
      key: "edge-free",
      membraneKey: "DITRA_DRAIN_4",
      profileKey: "BARA_RT",
      gutterKey: null,
      drainKey: null
    },
    "edge-gutter": {
      key: "edge-gutter",
      membraneKey: "DITRA_DRAIN_4",
      profileKey: "BARA_RTKE",
      gutterKey: "BARIN",
      drainKey: null
    },
    "internal-drain": {
      key: "internal-drain",
      membraneKey: "DITRA",
      profileKey: "BARA_RT",
      gutterKey: null,
      drainKey: "KERDI_DRAIN"
    }
  };

  function getMaterial(key) {
    return key ? MATERIAL_DB[key] || null : null;
  }

  function computePiecesByLength(materialKey, neededBm) {
    const mat = getMaterial(materialKey);
    if (!mat || !mat.pieceLengthBm || !neededBm || neededBm <= 0) {
      return null;
    }
    return Math.max(1, Math.ceil(neededBm / mat.pieceLengthBm));
  }

  function computeAdhesiveBags(neededAreaM2) {
    const mat = MATERIAL_DB.ADHESIVE;
    if (!mat || !mat.coverageM2PerBag || !neededAreaM2 || neededAreaM2 <= 0) {
      return null;
    }
    return Math.max(1, Math.ceil(neededAreaM2 / mat.coverageM2PerBag));
  }

  // --- Náhľadové obrázky pre balkón (technický rez) ---
  // Sem neskôr uložíš reálne PNG/JPG súbory do public/img/systems/
  const PREVIEW_IMAGES = {
    "edge-free": {
      src: "img/systems/balkon-edge-free.png",
      caption:
        "Vysunutý balkón s voľnou odkvapovou hranou – orientačný prierez skladby Schlüter®."
    },
    "edge-gutter": {
      src: "img/systems/balkon-edge-gutter.png",
      caption:
        "Balkón s oplechovaním a žľabom Schlüter®-BARIN – orientačný prierez skladby."
    },
    "internal-drain": {
      src: "img/systems/balkon-internal-drain.png",
      caption:
        "Balkón s vnútorným vpustom a systémom Schlüter®-KERDI-DRAIN – orientačný prierez skladby."
    }
  };

  // --- Spoločný stav ---
  const state = {
    currentStep: 1,
    constructionTypeKey: null,
    constructionLabel: null,
    shapeKey: "square",
    dims: {},
    area: null,
    perimeter: null,
    drainOption: null
  };

  // --- Prepínanie krokov ---
  const stepSections = Array.from(document.querySelectorAll(".step-section"));

  function showStep(stepNo) {
    state.currentStep = stepNo;
    stepSections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === `step${stepNo}`);
    });

    const stepEl = document.getElementById(`step${stepNo}`);
    if (stepEl) {
      stepEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // --- KROK 1 – výber typu konštrukcie ---
  const constructionGrid = document.getElementById("constructionGrid");
  const currentTypeLabel = document.getElementById("currentTypeLabel");
  const goToStep2Btn = document.getElementById("goToStep2Btn");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");

  function updateBalconyQuestionVisibility() {
    const balconyQuestion = document.getElementById("balconyQuestion");
    const otherConstructionNote = document.getElementById("otherConstructionNote");
    const isBalcony = state.constructionTypeKey === "balcony-cantilever";

    if (balconyQuestion) {
      balconyQuestion.style.display = isBalcony ? "block" : "none";
    }
    if (otherConstructionNote) {
      otherConstructionNote.style.display = isBalcony ? "none" : "block";
    }
    updatePreviewButton();
  }

  // --- KROK 2 – tvary a rozmery ---
  const shapeGrid = document.getElementById("shapeGrid");
  const dimShapeInfo = document.getElementById("dimShapeInfo");

  const dimInputs = {
    A: document.getElementById("sideA"),
    B: document.getElementById("sideB"),
    C: document.getElementById("sideC"),
    D: document.getElementById("sideD"),
    E: document.getElementById("sideE"),
    F: document.getElementById("sideF")
  };

  const fieldElems = {
    A: document.getElementById("fieldSideA"),
    B: document.getElementById("fieldSideB"),
    C: document.getElementById("fieldSideC"),
    D: document.getElementById("fieldSideD"),
    E: document.getElementById("fieldSideE"),
    F: document.getElementById("fieldSideF")
  };

  const summaryAreaEl = document.getElementById("summaryArea");
  const summaryPerimeterEl = document.getElementById("summaryPerimeter");

  const backToStep1Btn = document.getElementById("backToStep1Btn");
  const goToStep3Btn = document.getElementById("goToStep3Btn");

  // --- KROK 3 – sumarizácia + odtok vody ---
  const k3TypeEl = document.getElementById("k3Type");
  const k3ShapeEl = document.getElementById("k3Shape");
  const k3AreaEl = document.getElementById("k3Area");
  const k3PerimeterEl = document.getElementById("k3Perimeter");

  const drainOptions = Array.from(document.querySelectorAll(".drain-option"));
  const recommendedName = document.getElementById("recommendedName");
  const recommendedNote = document.getElementById("recommendedNote");

  // BOM prvky
  const bomAreaEl = document.getElementById("bomArea");
  const bomMembraneAreaEl = document.getElementById("bomMembraneArea");
  const bomPerimeterEl = document.getElementById("bomPerimeter");
  const bomProfilesCountEl = document.getElementById("bomProfilesCount");
  const bomAdhesiveBagsEl = document.getElementById("bomAdhesiveBags");
  const bomNoteEl = document.getElementById("bomNote");

  // Náhľad – prvky
  const previewBtn = document.getElementById("previewBtn");
  const previewModal = document.getElementById("previewModal");
  const previewImage = document.getElementById("previewImage");
  const previewCaption = document.getElementById("previewCaption");
  const previewCloseBtn = document.getElementById("previewCloseBtn");

  // --- KONFIGURÁCIA TVAROV ---
  const shapeConfigs = {
    square: {
      label: "Štvorec",
      sides: ["A"],
      info: "Štvorec – všetky strany A sú rovnaké."
    },
    rectangle: {
      label: "Obdĺžnik / „kosoštvorec“",
      sides: ["A", "B"],
      info: "Obdĺžnik – dve rôzne strany A a B. Mierna šikmina nevadí."
    },
    "l-shape": {
      label: "Balkón v tvare L",
      sides: ["A", "B", "C", "D", "E", "F"],
      info:
        "Balkón v tvare L – doplňte postupne všetkých 6 strán A–F v smere hodinových ručičiek okolo balkóna."
    }
  };

  // --- Pomocné funkcie ---
  function parseVal(v) {
    if (v === null || v === undefined || v === "") return null;
    const num = parseFloat(String(v).replace(",", "."));
    if (Number.isNaN(num) || num <= 0) return null;
    return num;
  }

  function canGoToStep3() {
    const d = state.dims;

    if (state.shapeKey === "square") {
      return d.A != null;
    } else if (state.shapeKey === "rectangle") {
      return d.A != null && d.B != null;
    } else if (state.shapeKey === "l-shape") {
      return ["A", "B", "C", "D", "E", "F"].every((key) => d[key] != null);
    }
    return false;
  }

  function updateStep2ContinueButton() {
    if (!goToStep3Btn) return;
    goToStep3Btn.disabled = !canGoToStep3();
  }

  function computeAreaPerimeter(shapeKey, d) {
    let area = null;
    let per = null;

    if (shapeKey === "square") {
      const A = d.A;
      if (A != null) {
        area = A * A;
        per = 4 * A;
      }
    } else if (shapeKey === "rectangle") {
      const A = d.A;
      const B = d.B;
      if (A != null && B != null) {
        area = A * B;
        per = 2 * (A + B);
      }
    } else if (shapeKey === "l-shape") {
      const sides = ["A", "B", "C", "D", "E", "F"].map((k) => d[k]);
      if (sides.every((v) => v != null)) {
        per = sides.reduce((sum, v) => sum + v, 0);
        // area nechávame na konzultáciu
      }
    }

    return { area, perimeter: per };
  }

  function updateStep3Summary() {
    if (k3TypeEl) {
      k3TypeEl.textContent = state.constructionLabel || "–";
    }
    if (k3ShapeEl) {
      const cfg = shapeConfigs[state.shapeKey];
      k3ShapeEl.textContent = cfg ? cfg.label : "–";
    }

    if (k3AreaEl) {
      if (state.area != null) {
        k3AreaEl.textContent = state.area.toFixed(1).replace(".", ",");
      } else if (
        state.shapeKey === "l-shape" &&
        ["A", "B", "C", "D", "E", "F"].every((k) => state.dims[k] != null)
      ) {
        k3AreaEl.textContent = "dopočítame pri konzultácii";
      } else {
        k3AreaEl.textContent = "–";
      }
    }

    if (k3PerimeterEl) {
      k3PerimeterEl.textContent =
        state.perimeter != null
          ? state.perimeter.toFixed(1).replace(".", ",")
          : "–";
    }
  }

  function updateBom() {
    if (
      !bomAreaEl ||
      !bomMembraneAreaEl ||
      !bomPerimeterEl ||
      !bomProfilesCountEl ||
      !bomAdhesiveBagsEl ||
      !bomNoteEl
    ) {
      return;
    }

    const isBalcony = state.constructionTypeKey === "balcony-cantilever";
    const hasDrain = !!state.drainOption;
    const area = state.area;
    const per = state.perimeter;

    function resetBom(placeNote) {
      bomAreaEl.textContent = "–";
      bomMembraneAreaEl.textContent = "–";
      bomPerimeterEl.textContent = "–";
      bomProfilesCountEl.textContent = "–";
      bomAdhesiveBagsEl.textContent = "–";
      bomNoteEl.textContent =
        placeNote ||
        "Hodnoty sú orientačné. Presný výpočet doplníme po konzultácii s technikom Lištového centra.";
    }

    if (!isBalcony) {
      resetBom(
        "Pre terasy a iné typy konštrukcií pripravujeme samostatný výpočet materiálu. Zatiaľ slúži tento krok len ako prehľad."
      );
      return;
    }

    if (!hasDrain) {
      resetBom(
        "Najprv vyberte spôsob odtoku vody z balkóna. Podľa toho pripravíme orientačný prepočet materiálu."
      );
      return;
    }

    if (state.shapeKey === "l-shape") {
      resetBom(
        "Pri balkóne v tvare L zatiaľ zobrazujeme len obvod. Plochu a orientačné množstvá materiálu doplníme po konzultácii v Lištovom centre."
      );
      return;
    }

    if (area == null || per == null) {
      resetBom(
        "Na výpočet materiálu potrebujeme mať doplnené rozmery tak, aby sme vedeli plochu aj obvod balkóna."
      );
      return;
    }

    const system = BALCONY_SYSTEMS[state.drainOption];
    if (!system) {
      resetBom();
      return;
    }

    const profileCount = computePiecesByLength(system.profileKey, per);
    const adhesiveBags = computeAdhesiveBags(area);

    bomAreaEl.textContent = area.toFixed(1).replace(".", ",");
    bomMembraneAreaEl.textContent = area.toFixed(1).replace(".", ",");

    if (profileCount != null) {
      bomPerimeterEl.textContent = per.toFixed(1).replace(".", ",");
      bomProfilesCountEl.textContent = String(profileCount);
    } else {
      bomPerimeterEl.textContent = "–";
      bomProfilesCountEl.textContent = "–";
    }

    bomAdhesiveBagsEl.textContent =
      adhesiveBags != null ? String(adhesiveBags) : "–";

    if (state.drainOption === "edge-free") {
      bomNoteEl.textContent =
        "Výpočet vychádza z plochy balkóna a obvodu voľnej hrany. Drenážna rohož Schlüter®-DITRA-DRAIN pokrýva celú plochu, ukončovacie profily BARA-RT rátame po obvode bez styku so stenou. Lepidlo (Sopro / Mapei) je uvedené orientačne.";
    } else if (state.drainOption === "edge-gutter") {
      bomNoteEl.textContent =
        "Výpočet je prispôsobený balkónu s oplechovaním a žľabom. Profily BARA-RTKE nadväzujú na oplechovanie a nesú žľab Schlüter®-BARIN. Drenážna rohož DITRA-DRAIN pokrýva celú plochu, lepidlo je uvedené orientačne (Sopro / Mapei).";
    } else if (state.drainOption === "internal-drain") {
      bomNoteEl.textContent =
        "Pre balkón s vnútorným vpustom rátame plochu pre kontaktnú izoláciu a oddeľovaciu rohož Schlüter®-DITRA a orientačné množstvo lepidla. Detaily spádovania k vpustu a napojenia na prvky KERDI-DRAIN doplníme v PDF podklade.";
    } else {
      bomNoteEl.textContent =
        "Hodnoty sú orientačné. Presný výpočet a konkrétne skladby doplníme v PDF podklade po konzultácii s technikom Lištového centra.";
    }
  }

  function recomputeFromInputs() {
    const dims = {};
    for (const [side, input] of Object.entries(dimInputs)) {
      if (!input) {
        dims[side] = null;
        continue;
      }
      const field = fieldElems[side];
      if (field && field.classList.contains("hidden")) {
        dims[side] = null;
      } else {
        dims[side] = parseVal(input.value);
      }
    }

    state.dims = dims;
    const res = computeAreaPerimeter(state.shapeKey, dims);
    state.area = res.area;
    state.perimeter = res.perimeter;

    const isLShape = state.shapeKey === "l-shape";
    const lComplete =
      isLShape && ["A", "B", "C", "D", "E", "F"].every((k) => dims[k] != null);

    if (summaryAreaEl) {
      if (res.area != null) {
        summaryAreaEl.textContent = res.area.toFixed(1).replace(".", ",");
      } else if (lComplete) {
        summaryAreaEl.textContent = "dopočítame pri konzultácii";
      } else {
        summaryAreaEl.textContent = "–";
      }
    }

    if (summaryPerimeterEl) {
      summaryPerimeterEl.textContent =
        res.perimeter != null
          ? res.perimeter.toFixed(1).replace(".", ",")
          : "–";
    }

    updateStep2ContinueButton();
    updateStep3Summary();
    updateBom();
  }

  function setShape(shapeKey) {
    if (!shapeConfigs[shapeKey]) return;
    state.shapeKey = shapeKey;

    document.querySelectorAll(".shape-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.shape === shapeKey);
    });

    const cfg = shapeConfigs[shapeKey];
    if (dimShapeInfo && cfg) {
      dimShapeInfo.textContent = cfg.info;
    }

    const activeSides = new Set(cfg.sides);
    Object.keys(fieldElems).forEach((side) => {
      const field = fieldElems[side];
      if (!field) return;
      field.classList.toggle("hidden", !activeSides.has(side));
    });

    recomputeFromInputs();
  }

  // --- Náhľad – tlačidlo enable/disable ---
  function updatePreviewButton() {
    if (!previewBtn) return;
    const opt = state.drainOption;
    const isBalcony = state.constructionTypeKey === "balcony-cantilever";
    const cfg = opt && PREVIEW_IMAGES[opt];
    const enabled = isBalcony && !!cfg;

    previewBtn.disabled = !enabled;
    previewBtn.dataset.previewKey = enabled ? opt : "";
  }

  function openPreviewModal() {
    if (!previewModal || !previewImage || !previewCaption || !previewBtn) return;
    const key = previewBtn.dataset.previewKey;
    if (!key) return;
    const cfg = PREVIEW_IMAGES[key];
    if (!cfg) return;

    previewImage.src = cfg.src;
    previewImage.alt = cfg.caption;
    previewCaption.textContent = cfg.caption;
    previewModal.classList.add("visible");
  }

  function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove("visible");
  }

  // --- LISTENERY KROKU 1 ---
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
      if (goToStep2Btn) {
        goToStep2Btn.disabled = false;
      }

      updateBalconyQuestionVisibility();
      updateStep3Summary();
      updateBom();

      if (window.innerWidth <= 768 && goToStep2Btn) {
        goToStep2Btn.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    });
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", () => {
      state.constructionTypeKey = null;
      state.constructionLabel = null;
      document
        .querySelectorAll(".type-card")
        .forEach((c) => c.classList.remove("selected"));
      if (currentTypeLabel) currentTypeLabel.textContent = "žiadny";
      if (goToStep2Btn) goToStep2Btn.disabled = true;
      state.drainOption = null;

      updateBalconyQuestionVisibility();
      updateStep3Summary();
      updateBom();
      updatePreviewButton();
    });
  }

  if (goToStep2Btn) {
    goToStep2Btn.addEventListener("click", () => {
      // už neotvárame klávesnicu automatickým fókusom
      showStep(2);
    });
  }

  // --- LISTENERY KROKU 2 ---
  if (shapeGrid) {
    shapeGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".shape-card");
      if (!card) return;
      const shapeKey = card.dataset.shape;
      setShape(shapeKey);

      if (window.innerWidth <= 768) {
        const sideAInput = dimInputs.A;
        if (sideAInput) {
          sideAInput.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      }
    });
  }

  Object.values(dimInputs).forEach((input) => {
    if (!input) return;
    ["input", "change", "blur"].forEach((evt) => {
      input.addEventListener(evt, recomputeFromInputs);
    });
  });

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener("click", () => {
      showStep(1);
    });
  }

  if (goToStep3Btn) {
    goToStep3Btn.addEventListener("click", () => {
      showStep(3);
      updateStep3Summary();
      updateBom();
    });
  }

  // --- LISTENERY KROKU 3 – odtok vody + náhľad ---
  if (drainOptions.length) {
    drainOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        const opt = btn.dataset.drainOption;
        state.drainOption = opt;

        drainOptions.forEach((other) => {
          other.classList.toggle("selected", other === btn);
        });

        if (recommendedName && recommendedNote) {
          if (opt === "edge-free") {
            recommendedName.textContent =
              "Vysunutý balkón s voľnou hranou – systém Schlüter®-BARRA + drenážny koberec.";
            recommendedNote.textContent =
              "Základná skladba pre balkóny, kde voda voľne odkvapkáva z hrany. Odporúčame kombináciu ukončovacích profilov BARRA / BARA-RT, drenážnej rohože DITRA-DRAIN a bezpečného spádu smerom od steny.";
          } else if (opt === "edge-gutter") {
            recommendedName.textContent =
              "Balkón s oplechovaním a odkvapovým žľabom – systém Schlüter®-BARIN.";
            recommendedNote.textContent =
              "Skladba vhodná pre balkóny, kde je voda odvádzaná do žľabu pri hrane. Profily BARA-RTKE vytvárajú okapovú hranu a nesú žľab BARIN, pod ktorým je drenážna rohož DITRA-DRAIN.";
          } else if (opt === "internal-drain") {
            recommendedName.textContent =
              "Balkón s vnútorným vpustom – kombinácia Schlüter®-KERDI a bodového odtoku.";
            recommendedNote.textContent =
              "Pre balkóny s odtokom do vpustu v podlahe volíme skladbu so spádovaním smerom k vpustu, kontaktnou izoláciou KERDI, oddeľovacou rohožou DITRA / DITRA-DRAIN a prvkami KERDI-DRAIN. Detail vám pripravíme v PDF výstupe.";
          } else {
            recommendedName.textContent =
              "Zatiaľ nevybraná – zvoľte odtok vody.";
            recommendedNote.textContent =
              "Po výbere odtoku vody vám zobrazíme „zlatú strednú cestu“ pre vysunutý balkón. Podrobný technický popis a prierezy dostanete v PDF priamo v Lištobooku.";
          }
        }

        updateBom();
        updatePreviewButton();
      });
    });
  }

  if (previewBtn && previewModal) {
    previewBtn.addEventListener("click", openPreviewModal);

    if (previewCloseBtn) {
      previewCloseBtn.addEventListener("click", closePreviewModal);
    }

    const backdrop = previewModal.querySelector(".preview-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", closePreviewModal);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && previewModal.classList.contains("visible")) {
        closePreviewModal();
      }
    });
  }

  // --- INITIALIZÁCIA ---
  showStep(1);
  setShape("square");
  updateBalconyQuestionVisibility();
  updateStep2ContinueButton();
  updateStep3Summary();
  updateBom();
  updatePreviewButton();
});
