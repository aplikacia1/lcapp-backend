// public/calc_terasa.js
document.addEventListener("DOMContentLoaded", () => {
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
        window.location.href = `${target}?email=${encodeURIComponent(
          email
        )}`;
      } else {
        window.location.href = target;
      }
    });
  }

  // --- Spoločný stav --
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
  const stepSections = Array.from(
    document.querySelectorAll(".step-section")
  );

  function showStep(stepNo) {
    state.currentStep = stepNo;
    stepSections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === `step${stepNo}`);
    });
  }

  // step1 je v HTML už active, ale pre istotu:
  showStep(1);

  // --- KROK 1 – výber typu konštrukcie ---
  const constructionGrid = document.getElementById("constructionGrid");
  const currentTypeLabel = document.getElementById("currentTypeLabel");
  const goToStep2Btn = document.getElementById("goToStep2Btn");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");

  function updateBalconyQuestionVisibility() {
    const balconyQuestion = document.getElementById("balconyQuestion");
    const otherConstructionNote = document.getElementById(
      "otherConstructionNote"
    );
    const isBalcony =
      state.constructionTypeKey === "balcony-cantilever";

    if (balconyQuestion) {
      balconyQuestion.style.display = isBalcony ? "block" : "none";
    }
    if (otherConstructionNote) {
      otherConstructionNote.style.display = isBalcony ? "none" : "block";
    }
  }

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

      updateBalconyQuestionVisibility();
      updateStep3Summary();
    });
  }

  if (goToStep2Btn) {
    goToStep2Btn.addEventListener("click", () => {
      showStep(2);
    });
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

  const shapeConfigs = {
    "square": {
      label: "Štvorec",
      sides: ["A"],
      info: "Štvorec – všetky strany A sú rovnaké."
    },
    "rectangle": {
      label: "Obdĺžnik / „kosoštvorec“",
      sides: ["A", "B"],
      info: "Obdĺžnik – dve rôzne strany A a B. Mierna šikmina nevadí."
    },
    "l-shape": {
      label: "Balkón v tvare L",
      sides: ["A", "B", "C", "D", "E", "F"],
      info: "Balkón v tvare L – doplňte postupne všetkých 6 strán A–F v smere hodinových ručičiek okolo balkóna."
    }
  };

  function setShape(shapeKey) {
    if (!shapeConfigs[shapeKey]) return;
    state.shapeKey = shapeKey;

    document
      .querySelectorAll(".shape-card")
      .forEach((card) => {
        card.classList.toggle(
          "selected",
          card.dataset.shape === shapeKey
        );
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

  if (shapeGrid) {
    shapeGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".shape-card");
      if (!card) return;
      const shapeKey = card.dataset.shape;
      setShape(shapeKey);
    });
  }

  // inicializácia – štvorec
  setShape("square");

  function parseVal(v) {
    if (v === null || v === undefined || v === "") return null;
    const num = parseFloat(String(v).replace(",", "."));
    if (Number.isNaN(num) || num <= 0) return null;
    return num;
  }

  function polygonArea(points) {
    if (!points || points.length < 3) return null;
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      sum += p1.x * p2.y - p2.x * p1.y;
    }
    const result = Math.abs(sum) / 2;
    if (!Number.isFinite(result) || result <= 0) return null;
    return result;
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
        per = sides.reduce((sum, val) => sum + val, 0);

        // Konštruktívne vytvoríme L-pôdorys (pravé uhly)
        const [A, B, C, D, E, F] = sides;
        const pts = [];
        let x = 0;
        let y = 0;

        pts.push({ x, y }); // štart
        x += A; // A – doprava
        pts.push({ x, y });
        y += B; // B – dole
        pts.push({ x, y });
        x -= C; // C – doľava
        pts.push({ x, y });
        y += D; // D – dole
        pts.push({ x, y });
        x -= E; // E – doľava
        pts.push({ x, y });
        y -= F; // F – hore (ideálne späť na y = 0)
        pts.push({ x, y });

        area = polygonArea(pts);
      }
    }

    return { area, perimeter: per };
  }

  function recomputeFromInputs() {
    const dims = {};
    for (const [side, input] of Object.entries(dimInputs)) {
      if (!input) {
        dims[side] = null;
        continue;
      }
      // ak je príslušné pole skryté, ignorujeme ho
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

    if (summaryAreaEl) {
      summaryAreaEl.textContent =
        res.area != null
          ? res.area.toFixed(1).replace(".", ",")
          : "–";
    }
    if (summaryPerimeterEl) {
      summaryPerimeterEl.textContent =
        res.perimeter != null
          ? res.perimeter.toFixed(1).replace(".", ",")
          : "–";
    }

    updateStep3Summary();
  }

  Object.values(dimInputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", recomputeFromInputs);
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
    });
  }

  // --- KROK 3 – sumarizácia + odtok vody ---
  const k3TypeEl = document.getElementById("k3Type");
  const k3ShapeEl = document.getElementById("k3Shape");
  const k3AreaEl = document.getElementById("k3Area");
  const k3PerimeterEl = document.getElementById("k3Perimeter");

  const drainOptions = Array.from(
    document.querySelectorAll(".drain-option")
  );
  const recommendedName = document.getElementById("recommendedName");
  const recommendedNote = document.getElementById("recommendedNote");

  function updateStep3Summary() {
    if (k3TypeEl) {
      k3TypeEl.textContent = state.constructionLabel || "–";
    }
    if (k3ShapeEl) {
      const cfg = shapeConfigs[state.shapeKey];
      k3ShapeEl.textContent = cfg ? cfg.label : "–";
    }
    if (k3AreaEl) {
      k3AreaEl.textContent =
        state.area != null
          ? state.area.toFixed(1).replace(".", ",")
          : "–";
    }
    if (k3PerimeterEl) {
      k3PerimeterEl.textContent =
        state.perimeter != null
          ? state.perimeter.toFixed(1).replace(".", ",")
          : "–";
    }
  }

  updateBalconyQuestionVisibility();
  updateStep3Summary();

  if (drainOptions.length) {
    drainOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        const opt = btn.dataset.drainOption;
        state.drainOption = opt;

        drainOptions.forEach((other) => {
          other.classList.toggle("selected", other === btn);
        });

        if (!recommendedName || !recommendedNote) return;

        if (opt === "edge-free") {
          recommendedName.textContent =
            "Vysunutý balkón s voľnou hranou – systém Schlüter®-BARRA + drenážny koberec.";
          recommendedNote.textContent =
            "Základná skladba pre balkóny, kde voda voľne odkvapkáva z hrany. Odporúčame kombináciu ukončovacích profilov BARRA, drenážnej rohože DITRA-DRAIN a bezpečného spádu smerom od steny.";
        } else if (opt === "edge-gutter") {
          recommendedName.textContent =
            "Balkón s oplechovaním a odkvapovým žľabom – systém Schlüter®-BARIN.";
          recommendedNote.textContent =
            "Skladba vhodná pre balkóny, kde je voda odvádzaná do žľabu pri hrane. Profily BARIN umožnia napojenie na oplechovanie, doplnené o drenážne vrstvy a spoľahlivé hydroizolácie.";
        } else if (opt === "internal-drain") {
          recommendedName.textContent =
            "Balkón s vnútorným vpustom – kombinácia Schlüter®-KERDI a bodového odtoku.";
          recommendedNote.textContent =
            "Pre balkóny s odtokom do vpustu v podlahe volíme skladbu so spádovaním smerom k vpustu a tesným napojením na odtokové prvky. Detail vám pripravíme v PDF výstupe.";
        } else {
          recommendedName.textContent =
            "Zatiaľ nevybraná – zvoľte odtok vody.";
          recommendedNote.textContent =
            "Po výbere odtoku vody vám zobrazíme „zlatú strednú cestu“ pre vysunutý balkón. Podrobný technický popis a prierezy dostanete v PDF priamo v Lištobooku.";
        }
      });
    });
  }
});
