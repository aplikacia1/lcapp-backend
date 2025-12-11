// public/calc_balkony.js
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------------------
  // EMAIL v hlavičke + späť
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
      const target = "calc_terasa_base.html";
      if (email) {
        window.location.href = `${target}?email=${encodeURIComponent(
          email
        )}`;
      } else {
        window.location.href = target;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // MAPPING: výška + odtok z DOM -> config_balkony.js
  // ---------------------------------------------------------------------------
  const HEIGHT_DOM_TO_CONFIG = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
  };

  const DRAIN_DOM_TO_CONFIG = {
    "edge-free": "EDGE_FREE",
    "edge-gutter": "EDGE_GUTTER",
    "internal-drain": "FLOOR_DRAIN",
  };

  function hasConfigSystems() {
    return Array.isArray(window.BALCONY_SYSTEMS);
  }

  /**
   * Nájde systémovú skladbu podľa zvolenej výšky a odtoku vody.
   * @param {"low"|"medium"|"high"} heightDom
   * @param {"edge-free"|"edge-gutter"|"internal-drain"} drainDom
   * @returns {object|null}
   */
  function findBalconySystem(heightDom, drainDom) {
    if (!hasConfigSystems() || !heightDom || !drainDom) return null;

    const hCfg = HEIGHT_DOM_TO_CONFIG[heightDom];
    const dCfg = DRAIN_DOM_TO_CONFIG[drainDom];
    if (!hCfg || !dCfg) return null;

    return (
      window.BALCONY_SYSTEMS.find(
        (sys) => sys.heightCategory === hCfg && sys.drainType === dCfg
      ) || null
    );
  }

  // ---------------------------------------------------------------------------
  // PREVIEW obrázky – 9 kombinácií (3 výšky × 3 typy odtoku)
  // ID kľúče zodpovedajú fieldom `id` v BALCONY_SYSTEMS v config_balkony.js
  // ---------------------------------------------------------------------------
  const SYSTEM_PREVIEWS = {
    // NÍZKA VÝŠKA – DITRA
    LOW_EDGE_FREE: {
      src: "img/systems/balkon-low-edge-free.png",
      caption:
        "Nízka konštrukčná výška – voda steká cez voľnú hranu, orientačný prierez skladby Schlüter®-DITRA.",
    },
    LOW_EDGE_GUTTER: {
      src: "img/systems/balkon-low-edge-gutter.png",
      caption:
        "Nízka konštrukčná výška – žľab pri hrane (Schlüter®-BARIN) s ukončovacím profilom BARA-RTKE / BARA-RTK.",
    },
    LOW_FLOOR_DRAIN: {
      src: "img/systems/balkon-low-internal-drain.png",
      caption:
        "Nízka konštrukčná výška – vnútorný vpust (Schlüter®-KERDI-DRAIN) napojený na rohož Schlüter®-DITRA.",
    },

    // STREDNÁ VÝŠKA – DITRA-DRAIN (pôvodné obrázky)
    MEDIUM_EDGE_FREE: {
      src: "img/systems/balkon-edge-free.png",
      caption:
        "Stredná konštrukčná výška – voda steká cez voľnú hranu, orientačný prierez skladby Schlüter®-DITRA-DRAIN.",
    },
    MEDIUM_EDGE_GUTTER: {
      src: "img/systems/balkon-edge-gutter.png",
      caption:
        "Stredná konštrukčná výška – žľab pri hrane (Schlüter®-BARIN) s profilmi BARA-RTKE / BARA-RTK.",
    },
    MEDIUM_FLOOR_DRAIN: {
      src: "img/systems/balkon-internal-drain.png",
      caption:
        "Stredná konštrukčná výška – vnútorný vpust (Schlüter®-KERDI-DRAIN) v kombinácii s rohožou DITRA-DRAIN.",
    },

    // VYŠŠIA VÝŠKA – BEKOTEC-DRAIN
    // POZOR: varianta HIGH_EDGE_FREE zámerne NEEXISTUJE (Schlüter ju neponúka).
    HIGH_EDGE_GUTTER: {
      src: "img/systems/balkon-high-edge-gutter.png",
      caption:
        "Vyššia konštrukčná výška – systém Schlüter®-BEKOTEC-DRAIN so žľabom pri hrane (Schlüter®-BARIN).",
    },
    HIGH_FLOOR_DRAIN: {
      src: "img/systems/balkon-high-internal-drain.png",
      caption:
        "Vyššia konštrukčná výška – BEKOTEC-DRAIN s vnútorným vpustom (KERDI-DRAIN) a kontaktnou drenážou DITRA-DRAIN.",
    },
  };

  function getPreviewConfigForSystem(sys) {
    if (!sys) return null;
    return SYSTEM_PREVIEWS[sys.id] || null;
  }

  // ---------------------------------------------------------------------------
  // SPOLOČNÝ STAV
  // ---------------------------------------------------------------------------
  const state = {
    currentStep: 2,
    fromStep1TypeKey: params.get("type") || "balcony-cantilever",
    fromStep1TypeLabel:
      params.get("label") || "Vysunutý balkón (konzola)",

    // krok 2 – tvary
    shapeKey: "square",
    dims: {},
    area: null,
    perimeter: null,
    wallSides: {
      A: false,
      B: false,
      C: false,
      D: false,
      E: false,
      F: false,
    },

    // krok 3 – výška + odtok
    heightDomId: null, // "low" | "medium" | "high"
    drainDomId: null, // "edge-free" | "edge-gutter" | "internal-drain"
    system: null, // objekt z BALCONY_SYSTEMS
  };

  // ---------------------------------------------------------------------------
  // ELEMENTY – kroky
  // ---------------------------------------------------------------------------
  const stepSections = Array.from(
    document.querySelectorAll(".step-section")
  );
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

  // --- KROK 2 ---
  const shapeGrid = document.getElementById("shapeGrid");
  const dimShapeInfo = document.getElementById("dimShapeInfo");

  const dimInputs = {
    A: document.getElementById("sideA"),
    B: document.getElementById("sideB"),
    C: document.getElementById("sideC"),
    D: document.getElementById("sideD"),
    E: document.getElementById("sideE"),
    F: document.getElementById("sideF"),
  };

  const fieldElems = {
    A: document.getElementById("fieldSideA"),
    B: document.getElementById("fieldSideB"),
    C: document.getElementById("fieldSideC"),
    D: document.getElementById("fieldSideD"),
    E: document.getElementById("fieldSideE"),
    F: document.getElementById("fieldSideF"),
  };

  const summaryAreaEl = document.getElementById("summaryArea");
  const summaryPerimeterEl =
    document.getElementById("summaryPerimeter");

  const backToStep1Btn = document.getElementById("backToStep1Btn");
  const goToStep3Btn = document.getElementById("goToStep3Btn");

  // --- KROK 3 ---
  const k3TypeEl = document.getElementById("k3Type");
  const k3ShapeEl = document.getElementById("k3Shape");
  const k3AreaEl = document.getElementById("k3Area");
  const k3PerimeterEl = document.getElementById("k3Perimeter");

  const heightRadios = Array.from(
    document.querySelectorAll('input[name="heightOption"]')
  );
  const drainOptions = Array.from(
    document.querySelectorAll(".drain-option")
  );

  const recommendedName =
    document.getElementById("recommendedName");
  const recommendedNote =
    document.getElementById("recommendedNote");

  const bomAreaEl = document.getElementById("bomArea");
  const bomMembraneAreaEl =
    document.getElementById("bomMembraneArea");
  const bomPerimeterEl = document.getElementById("bomPerimeter");
  const bomProfilesCountEl =
    document.getElementById("bomProfilesCount");
  const bomAdhesiveBagsEl =
    document.getElementById("bomAdhesiveBags");
  const bomNoteEl = document.getElementById("bomNote");

  const goToStep4Btn = document.getElementById("goToStep4Btn");
  const backToStep2Btn = document.getElementById("backToStep2Btn");

  // --- KROK 4 ---
  const k4TypeEl = document.getElementById("k4Type");
  const k4ShapeEl = document.getElementById("k4Shape");
  const k4AreaEl = document.getElementById("k4Area");
  const k4PerimeterEl = document.getElementById("k4Perimeter");
  const k4HeightLabelEl = document.getElementById("k4HeightLabel");
  const k4DrainLabelEl = document.getElementById("k4DrainLabel");
  const k4SystemNameEl = document.getElementById("k4SystemName");

  const k4BomAreaEl = document.getElementById("k4BomArea");
  const k4BomMembraneAreaEl =
    document.getElementById("k4BomMembraneArea");
  const k4BomPerimeterEl =
    document.getElementById("k4BomPerimeter");
  const k4BomProfilesCountEl =
    document.getElementById("k4BomProfilesCount");
  const k4BomAdhesiveBagsEl =
    document.getElementById("k4BomAdhesiveBags");

  const backToStep3Btn = document.getElementById("backToStep3Btn");

  const previewBtn = document.getElementById("previewBtn");
  const previewModal = document.getElementById("previewModal");
  const previewImage = document.getElementById("previewImage");
  const previewCaption = document.getElementById("previewCaption");
  const previewCloseBtn =
    document.getElementById("previewCloseBtn");

  const k4PreviewTitleEl =
    document.getElementById("k4PreviewTitle");
  const k4PreviewImageEl =
    document.getElementById("k4PreviewImage");
  const k4PreviewCaptionEl =
    document.getElementById("k4PreviewCaption");

  // PDF tlačidlá zatiaľ necháme neaktívne (future feature)
  const btnPdfDownload = document.getElementById("btnPdfDownload");
  const btnPdfToEmail = document.getElementById("btnPdfToEmail");
  const btnPdfRequestOffer =
    document.getElementById("btnPdfRequestOffer");

  // ---------------------------------------------------------------------------
  // TVARY
  // ---------------------------------------------------------------------------
  const shapeConfigs = {
    square: {
      label: "Štvorec",
      sides: ["A"],
      info: "Štvorec – všetky strany A sú rovnaké.",
    },
    rectangle: {
      label: "Obdĺžnik / „kosoštvorec“",
      sides: ["A", "B"],
      info:
        "Obdĺžnik – dve rôzne strany A a B. Mierna šikmina nevadí.",
    },
    "l-shape": {
      label: "Balkón v tvare L",
      sides: ["A", "B", "C", "D", "E", "F"],
      info:
        "Balkón v tvare L – doplňte všetkých 6 strán A–F v smere hodinových ručičiek.",
    },
  };

  const HEIGHT_LABELS = {
    low: "Nízka konštrukčná výška (do cca 60 mm)",
    medium: "Stredná konštrukčná výška (cca 60–100 mm)",
    high: "Vysoká konštrukčná výška (cca 100–150+ mm)",
  };

  const DRAIN_LABELS = {
    "edge-free": "Voda steká cez voľnú hranu",
    "edge-gutter": "Voda ide do žľabu pri hrane",
    "internal-drain": "Voda odteká do vpustu v podlahe",
  };

  function getHeightLabel(id) {
    return id ? HEIGHT_LABELS[id] || null : null;
  }

  function getDrainLabel(id) {
    return id ? DRAIN_LABELS[id] || null : null;
  }

  // ---------------------------------------------------------------------------
  // POMOCNÉ FUNKCIE
  // ---------------------------------------------------------------------------
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
      return ["A", "B", "C", "D", "E", "F"].every(
        (key) => d[key] != null
      );
    }
    return false;
  }

  function canGoToStep4() {
    // stačí mať zvolenú výšku + odtok => nájdený systém
    return !!state.system;
  }

  function updateStep2ContinueButton() {
    if (!goToStep3Btn) return;
    goToStep3Btn.disabled = !canGoToStep3();
  }

  function updateStep3ContinueButton() {
    if (!goToStep4Btn) return;
    goToStep4Btn.disabled = !canGoToStep4();
  }

  // geometrický obvod / plocha
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
        // plochu L nechávame na konzultáciu
      }
    }

    return { area, perimeter: per };
  }

  function getWallDeduction(dims) {
    let deduction = 0;
    for (const [side, isWall] of Object.entries(state.wallSides)) {
      if (!isWall) continue;
      const len = dims[side];
      if (len != null) deduction += len;
    }
    return deduction;
  }

  function updateStep3Summary() {
    if (k3TypeEl) {
      k3TypeEl.textContent =
        state.fromStep1TypeLabel || "Vysunutý balkón";
    }
    if (k3ShapeEl) {
      const cfg = shapeConfigs[state.shapeKey];
      k3ShapeEl.textContent = cfg ? cfg.label : "–";
    }

    const d = state.dims;
    const isLShape = state.shapeKey === "l-shape";
    const allL = ["A", "B", "C", "D", "E", "F"].every(
      (k) => d[k] != null
    );

    if (k3AreaEl) {
      if (state.area != null) {
        k3AreaEl.textContent = state.area
          .toFixed(1)
          .replace(".", ",");
      } else if (isLShape && allL) {
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

  function updateStep4Summary() {
    if (!document.getElementById("step4")) return;

    if (k4TypeEl) {
      k4TypeEl.textContent =
        state.fromStep1TypeLabel || "Vysunutý balkón";
    }
    if (k4ShapeEl) {
      const cfg = shapeConfigs[state.shapeKey];
      k4ShapeEl.textContent = cfg ? cfg.label : "–";
    }

    const d = state.dims;
    const isLShape = state.shapeKey === "l-shape";
    const allL = ["A", "B", "C", "D", "E", "F"].every(
      (k) => d[k] != null
    );

    if (k4AreaEl) {
      if (state.area != null) {
        k4AreaEl.textContent = state.area
          .toFixed(1)
          .replace(".", ",");
      } else if (isLShape && allL) {
        k4AreaEl.textContent = "dopočítame pri konzultácii";
      } else {
        k4AreaEl.textContent = "–";
      }
    }

    if (k4PerimeterEl) {
      k4PerimeterEl.textContent =
        state.perimeter != null
          ? state.perimeter.toFixed(1).replace(".", ",")
          : "–";
    }

    if (k4HeightLabelEl) {
      k4HeightLabelEl.textContent =
        getHeightLabel(state.heightDomId) || "–";
    }

    if (k4DrainLabelEl) {
      k4DrainLabelEl.textContent =
        getDrainLabel(state.drainDomId) || "–";
    }

    if (k4SystemNameEl) {
      k4SystemNameEl.textContent = state.system
        ? state.system.uiTitle || "Vybraný systém"
        : "–";
    }
  }

  function updateStep4Preview() {
    if (!k4PreviewImageEl || !k4PreviewTitleEl || !k4PreviewCaptionEl)
      return;

    if (!state.system) {
      k4PreviewTitleEl.textContent =
        "Zatiaľ nevybraný – doplňte výšku a odtok vo kroku 3.";
      k4PreviewImageEl.src = "";
      k4PreviewCaptionEl.textContent =
        "Po výbere systému zobrazíme orientačný prierez so skladbou Schlüter® pre váš balkón.";
      return;
    }

    const cfg = getPreviewConfigForSystem(state.system);
    k4PreviewTitleEl.textContent =
      state.system.uiTitle ||
      "Technický náhľad skladby balkóna";

    if (cfg) {
      k4PreviewImageEl.src = cfg.src;
      k4PreviewCaptionEl.textContent =
        cfg.caption ||
        "Orientačný prierez skladby Schlüter® pre zvolený systém.";
    } else {
      k4PreviewImageEl.src = "";
      k4PreviewCaptionEl.textContent =
        "Technický náhľad pre túto kombináciu pripravíme v PDF podklade.";
    }
  }

  function syncBomToStep4() {
    if (
      !k4BomAreaEl ||
      !k4BomMembraneAreaEl ||
      !k4BomPerimeterEl ||
      !k4BomProfilesCountEl ||
      !k4BomAdhesiveBagsEl
    ) {
      return;
    }

    k4BomAreaEl.textContent = bomAreaEl
      ? bomAreaEl.textContent
      : "–";
    k4BomMembraneAreaEl.textContent = bomMembraneAreaEl
      ? bomMembraneAreaEl.textContent
      : "–";
    k4BomPerimeterEl.textContent = bomPerimeterEl
      ? bomPerimeterEl.textContent
      : "–";
    k4BomProfilesCountEl.textContent = bomProfilesCountEl
      ? bomProfilesCountEl.textContent
      : "–";
    k4BomAdhesiveBagsEl.textContent = bomAdhesiveBagsEl
      ? bomAdhesiveBagsEl.textContent
      : "–";
  }

  function updateRecommendedBox() {
    if (!recommendedName || !recommendedNote) return;

    // ešte nemáme nič zvolené
    if (!state.heightDomId || !state.drainDomId) {
      if (state.heightDomId === "high") {
        recommendedName.textContent =
          "Zatiaľ nevybraná – zvoľte spôsob odtoku vody.";
        recommendedNote.textContent =
          "Pri vyššej konštrukčnej výške Schlüter® neponúka systém s voľnou voľnou hranou. Vyberte prosím variant so žľabom pri hrane alebo s podlahovou vpustou. Detailný návrh doplníme v PDF podklade z Lištobooku.";
      } else {
        recommendedName.textContent =
          "Zatiaľ nevybraná – zvoľte výšku a odtok vody.";
        recommendedNote.textContent =
          "Po výbere konštrukčnej výšky aj spôsobu odtoku vody vám zobrazíme „zlatú strednú cestu“ pre vysunutý balkón. Detailný popis a prierezy dostanete v PDF priamo v Lištobooku.";
      }
      return;
    }

    if (!state.system) {
      recommendedName.textContent =
        "Zatiaľ nevybraná – skladbu pre túto kombináciu ešte nemáme.";
      recommendedNote.textContent =
        "Pre zvolenú kombináciu výšky a odtoku zatiaľ nemáme definovanú skladbu. Skúste inú kombináciu alebo nás kontaktujte.";
      return;
    }

    recommendedName.textContent =
      state.system.uiTitle || "Navrhovaná skladba";
    recommendedNote.textContent =
      state.system.description ||
      "Detailný popis skladby doplníme v PDF podklade z Lištobooku.";
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

    const area = state.area;
    const per = state.perimeter;

    function resetBom(note) {
      bomAreaEl.textContent = "–";
      bomMembraneAreaEl.textContent = "–";
      bomPerimeterEl.textContent = "–";
      bomProfilesCountEl.textContent = "–";
      bomAdhesiveBagsEl.textContent = "–";
      bomNoteEl.textContent =
        note ||
        "Hodnoty sú orientačné. Presný výpočet doplníme po konzultácii s technikom Lištového centra.";
    }

    if (!state.heightDomId || !state.drainDomId) {
      resetBom(
        "Najprv v kroku 3 zvoľte konštrukčnú výšku a spôsob odtoku vody. Potom pripravíme orientačný prepočet materiálu."
      );
      syncBomToStep4();
      return;
    }

    if (!state.system) {
      resetBom(
        "Pre túto kombináciu výšky a odtoku vody zatiaľ nemáme definovanú skladbu. Skúste inú kombináciu alebo nás kontaktujte."
      );
      syncBomToStep4();
      return;
    }

    // špeciálny režim pre L-tvar – zobrazíme len obvod
    if (state.shapeKey === "l-shape") {
      if (per != null) {
        bomAreaEl.textContent = "–";
        bomMembraneAreaEl.textContent = "–";
        bomPerimeterEl.textContent = per
          .toFixed(1)
          .replace(".", ",");
        bomProfilesCountEl.textContent = "cca –";
        bomAdhesiveBagsEl.textContent = "–";
        bomNoteEl.textContent =
          "Pri balkóne v tvare L zatiaľ zobrazujeme len obvod. Plochu a orientačné množstvá materiálu doplníme po individuálnom návrhu v Lištobooku.";
      } else {
        resetBom();
      }
      syncBomToStep4();
      return;
    }

    if (area == null || per == null) {
      resetBom(
        "Na výpočet materiálu potrebujeme mať doplnené rozmery tak, aby sme vedeli plochu aj obvod balkóna."
      );
      syncBomToStep4();
      return;
    }

    // Jednoduchý orientačný výpočet – nezávisle od konkrétneho systému:
    const profilePieces = Math.max(1, Math.ceil(per / 2.5)); // 1 ks profilu ≈ 2,5 bm
    const adhesiveBags = Math.max(1, Math.ceil(area / 5)); // 1 vrece ≈ 5 m²

    bomAreaEl.textContent = area.toFixed(1).replace(".", ",");
    bomMembraneAreaEl.textContent = area
      .toFixed(1)
      .replace(".", ",");

    bomPerimeterEl.textContent = per.toFixed(1).replace(".", ",");
    bomProfilesCountEl.textContent = String(profilePieces);
    bomAdhesiveBagsEl.textContent = String(adhesiveBags);

    const drainDom = state.drainDomId;
    if (drainDom === "edge-free") {
      bomNoteEl.textContent =
        "Výpočet vychádza z plochy balkóna a obvodu voľnej hrany (bez stien). Drenážna / separačná vrstva pokrýva celú plochu, ukončovacie profily rátame len po voľných hranách. Lepidlo (Sopro / Mapei) je uvedené orientačne.";
    } else if (drainDom === "edge-gutter") {
      bomNoteEl.textContent =
        "Výpočet je prispôsobený balkónu s oplechovaním a žľabom pri hrane. Profily nesú žľab Schlüter®-BARIN, drenážna rohož pokrýva celú plochu. Lepidlo (Sopro / Mapei) je uvedené orientačne.";
    } else if (drainDom === "internal-drain") {
      bomNoteEl.textContent =
        "Pre balkón s vnútorným vpustom rátame plochu pre kontaktnú izoláciu, drenážnu / separačnú vrstvu a orientačné množstvo lepidla. Detaily spádovania k vpustu a napojenia na prvky KERDI-DRAIN doplníme v PDF podklade.";
    } else {
      bomNoteEl.textContent =
        "Hodnoty sú orientačné. Presný výpočet a konkrétne skladby doplníme v PDF podklade po konzultácii s technikom Lištového centra.";
    }

    syncBomToStep4();
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

    const base = computeAreaPerimeter(state.shapeKey, dims);
    state.area = base.area;

    let per = base.perimeter;
    if (per != null) {
      const deduction = getWallDeduction(dims);
      per = Math.max(0, per - deduction);
    }
    state.perimeter = per;

    const isLShape = state.shapeKey === "l-shape";
    const lComplete =
      isLShape &&
      ["A", "B", "C", "D", "E", "F"].every((k) => dims[k] != null);

    if (summaryAreaEl) {
      if (state.area != null) {
        summaryAreaEl.textContent = state.area
          .toFixed(1)
          .replace(".", ",");
      } else if (lComplete) {
        summaryAreaEl.textContent = "dopočítame pri konzultácii";
      } else {
        summaryAreaEl.textContent = "–";
      }
    }

    if (summaryPerimeterEl) {
      summaryPerimeterEl.textContent =
        state.perimeter != null
          ? state.perimeter.toFixed(1).replace(".", ",")
          : "–";
    }

    updateStep2ContinueButton();
    updateStep3Summary();
    updateBom();
    updateStep3ContinueButton();
    updateStep4Summary();
  }

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
      field.classList.toggle(
        "hidden",
        !activeSides.has(side)
      );
    });

    recomputeFromInputs();
  }

  function updatePreviewButton() {
    if (!previewBtn) return;

    const sys = state.system;
    const cfg = getPreviewConfigForSystem(sys);
    const enabled = !!cfg;

    previewBtn.disabled = !enabled;
    previewBtn.dataset.previewKey = enabled && sys ? sys.id : "";
  }

  function openPreviewModal() {
    if (
      !previewModal ||
      !previewImage ||
      !previewCaption ||
      !previewBtn
    )
      return;
    const key = previewBtn.dataset.previewKey;
    if (!key) return;
    const cfg = SYSTEM_PREVIEWS[key];
    if (!cfg) return;

    previewImage.src = cfg.src;
    previewImage.alt = cfg.caption || "";
    previewCaption.textContent = cfg.caption || "";
    previewModal.classList.add("visible");
  }

  function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove("visible");
  }

  function updateDrainButtonsAvailability() {
    const isHigh = state.heightDomId === "high";

    drainOptions.forEach((btn) => {
      const opt = btn.dataset.drainOption;

      if (isHigh && opt === "edge-free") {
        // túto kombináciu Schlüter pri vysokej výške neponúka – zakážeme
        btn.disabled = true;
        btn.classList.add("drain-disabled");
        if (state.drainDomId === "edge-free") {
          state.drainDomId = null;
        }
      } else {
        btn.disabled = false;
        btn.classList.remove("drain-disabled");
      }
    });
  }

  function recalcSystemFromSelections() {
    // nájdi systém podľa výšky + odtoku
    state.system = findBalconySystem(
      state.heightDomId,
      state.drainDomId
    );

    updateRecommendedBox();
    updateBom();
    updatePreviewButton();
    updateStep3ContinueButton();
    updateStep4Summary();
    updateStep4Preview();
  }

  // ---------------------------------------------------------------------------
  // LISTENERY – KROK 2
  // ---------------------------------------------------------------------------
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
            block: "center",
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

  // checkboxy pre strany pri stene
  const wallCheckboxNodeList = Array.from(
    document.querySelectorAll('input[type="checkbox"][data-side]')
  );
  const wallCheckboxes = {};

  if (wallCheckboxNodeList.length > 0) {
    wallCheckboxNodeList.forEach((cb) => {
      const side = (cb.dataset.side || "").toUpperCase();
      if (!side) return;
      wallCheckboxes[side] = cb;
    });
  }

  for (const [side, checkbox] of Object.entries(wallCheckboxes)) {
    checkbox.addEventListener("change", () => {
      state.wallSides[side] = checkbox.checked;
      recomputeFromInputs();
    });
  }

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener("click", () => {
      const target = "calc_terasa_base.html";
      if (email) {
        window.location.href = `${target}?email=${encodeURIComponent(
          email
        )}`;
      } else {
        window.location.href = target;
      }
    });
  }

  if (goToStep3Btn) {
    goToStep3Btn.addEventListener("click", () => {
      showStep(3);
      updateStep3Summary();
      updateBom();
      updateStep3ContinueButton();
    });
  }

  // ---------------------------------------------------------------------------
  // LISTENERY – KROK 3 (výška + odtok)
  // ---------------------------------------------------------------------------
  if (heightRadios.length) {
    heightRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        state.heightDomId = radio.value; // low / medium / high
        updateDrainButtonsAvailability();
        recalcSystemFromSelections();
      });
    });
  }

  if (drainOptions.length) {
    drainOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const opt = btn.dataset.drainOption; // edge-free / edge-gutter / internal-drain
        state.drainDomId = opt;

        drainOptions.forEach((other) => {
          other.classList.toggle("selected", other === btn);
        });

        recalcSystemFromSelections();
      });
    });
  }

  if (backToStep2Btn) {
    backToStep2Btn.addEventListener("click", () => {
      showStep(2);
    });
  }

  if (goToStep4Btn) {
    goToStep4Btn.addEventListener("click", () => {
      showStep(4);
      updateStep4Summary();
      updateStep4Preview();
      syncBomToStep4();
    });
  }

  // ---------------------------------------------------------------------------
  // LISTENERY – KROK 4
  // ---------------------------------------------------------------------------
  if (backToStep3Btn) {
    backToStep3Btn.addEventListener("click", () => {
      showStep(3);
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
      if (
        e.key === "Escape" &&
        previewModal.classList.contains("visible")
      ) {
        closePreviewModal();
      }
    });
  }

  // PDF tlačidlá zatiaľ nič nerobia – funkciu doplníme v ďalšom kroku vývoja
  [btnPdfDownload, btnPdfToEmail, btnPdfRequestOffer].forEach((btn) => {
    if (!btn) return;
    btn.disabled = true;
  });

  // ---------------------------------------------------------------------------
  // INITIALIZÁCIA
  // ---------------------------------------------------------------------------
  if (k3TypeEl) {
    k3TypeEl.textContent = state.fromStep1TypeLabel;
  }
  if (k4TypeEl) {
    k4TypeEl.textContent = state.fromStep1TypeLabel;
  }

  showStep(2);
  setShape("square");
  updateStep2ContinueButton();
  updateStep3Summary();
  updateDrainButtonsAvailability();
  updateBom();
  updateRecommendedBox();
  updateStep3ContinueButton();
  updatePreviewButton();
  updateStep4Summary();
  updateStep4Preview();
  syncBomToStep4();
});
