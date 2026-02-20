// public/calc_balkony.js
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------------------
  // EMAIL v hlavičke + späť
  // ---------------------------------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email"); // prihlásený používateľ (owner)

  const userChip = document.getElementById("userChip");
  if (userChip) {
    userChip.textContent = email ? `Prihlásený: ${email}` : "Prihlásený: –";
  }

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const target = "calc_terasa_base.html";
      window.location.href = email ? `${target}?email=${encodeURIComponent(email)}` : target;
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
  // ---------------------------------------------------------------------------
  const SYSTEM_PREVIEWS = {
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

    // HIGH_EDGE_FREE neexistuje
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
  // ✅ BARA podľa hrúbky dlažby (mm)
  // ---------------------------------------------------------------------------
  function recommendBaraProfile(tileMm) {
    const t = Number(tileMm);

    if (!Number.isFinite(t) || t <= 0) {
      return {
        tileMm: null,
        family: null,
        recommendationText: "–",
        note:
          "Hrúbka dlažby nie je zadaná. Pre presnú cenovú ponuku doplníme vhodný profil podľa zvolenej krytiny.",
      };
    }

    if (t <= 9) {
      return {
        tileMm: t,
        family: "RT",
        recommendationText: "BARA RT9/60",
        note:
          "RT: horné číslo kryje a chráni hranu dlažby; spodné číslo je dekor/prekrytie betónu.",
      };
    }
    if (t <= 12) {
      return {
        tileMm: t,
        family: "RT",
        recommendationText: "BARA RT12/15 alebo RT12/65",
        note:
          "RT12 chráni hranu dlažby (12 mm). Rozdiel 15 vs 65 je len spodné prekrytie betónu (dekor).",
      };
    }
    if (t <= 20) {
      return {
        tileMm: t,
        family: "RT",
        recommendationText: "BARA RT20/50",
        note:
          "RT: horné číslo kryje a chráni hranu dlažby; spodné číslo je dekor/prekrytie betónu.",
      };
    }
    if (t <= 25) {
      return {
        tileMm: t,
        family: "RT",
        recommendationText: "BARA RT25/40",
        note:
          "RT: horné číslo kryje a chráni hranu dlažby; spodné číslo je dekor/prekrytie betónu.",
      };
    }
    if (t <= 30) {
      return {
        tileMm: t,
        family: "RT",
        recommendationText: "BARA RT30/35",
        note:
          "RT: horné číslo kryje a chráni hranu dlažby; spodné číslo je dekor/prekrytie betónu.",
      };
    }

    return {
      tileMm: t,
      family: "RW",
      recommendationText: "BARA RW (podľa spodného prekrytia betónu)",
      note:
        "Pri vyššej dlažbe odporúčame RW. Pri RW riešime len spodné prekrytie betónu (dekor), krytie dlažby sa tu nepočíta.",
      rwOptionsText: "Možnosti RW spodok (mm): 15, 25, 30, 40, 55, 75, 95, 120, 150",
    };
  }

  // ---------------------------------------------------------------------------
  // SPOLOČNÝ STAV
  // ---------------------------------------------------------------------------
  const state = {
    currentStep: 2,

    fromStep1TypeKey: params.get("type") || "balcony-cantilever",
    fromStep1TypeLabel: params.get("label") || "Vysunutý balkón (konzola)",

    shapeKey: "square",
    dims: {},
    area: null,
    perimeter: null,
    geometryError: null,

    wallSides: { A: false, B: false, C: false, D: false, E: false, F: false },

    heightDomId: null,
    drainDomId: null,
    system: null,

    tileThicknessMm: null,
    tileSizeCm: null,      // ⬅️ DOPLNIŤ
    pendingAction: null,
    barinHasDownpipe: false,
    barinHeightCm: null,

    // ✅ PDF údaje (verejné + prihlásený)
    pdfCustomerName: "",
    pdfCustomerCompany: "",
    pdfCustomerEmail: "",
    pdfShowEmailInPdf: false,

    userAutoName: "", // z profilu, ak sa podarí
    userAutoCompany: "", // z profilu, ak sa podarí
  };

  // ---------------------------------------------------------------------------
  // ELEMENTY – kroky
  // ---------------------------------------------------------------------------
  const stepSections = Array.from(document.querySelectorAll(".step-section"));

  function showStep(stepNo) {
    state.currentStep = stepNo;

    stepSections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === `step${stepNo}`);
    });

    const stepEl = document.getElementById(`step${stepNo}`);
    if (stepEl) stepEl.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const summaryPerimeterEl = document.getElementById("summaryPerimeter");
  const backToStep1Btn = document.getElementById("backToStep1Btn");
  const goToStep3Btn = document.getElementById("goToStep3Btn");

  // --- KROK 3 ---
  const k3TypeEl = document.getElementById("k3Type");
  const k3ShapeEl = document.getElementById("k3Shape");
  const k3AreaEl = document.getElementById("k3Area");
  const k3PerimeterEl = document.getElementById("k3Perimeter");

  const heightRadios = Array.from(document.querySelectorAll('input[name="heightOption"]'));
  const drainOptions = Array.from(document.querySelectorAll(".drain-option"));

  const recommendedName = document.getElementById("recommendedName");
  const recommendedNote = document.getElementById("recommendedNote");

  const bomAreaEl = document.getElementById("bomArea");
  const bomMembraneAreaEl = document.getElementById("bomMembraneArea");
  const bomPerimeterEl = document.getElementById("bomPerimeter");
  const bomProfilesCountEl = document.getElementById("bomProfilesCount");
  const bomAdhesiveBagsEl = document.getElementById("bomAdhesiveBags");
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
  const k4BomMembraneAreaEl = document.getElementById("k4BomMembraneArea");
  const k4BomPerimeterEl = document.getElementById("k4BomPerimeter");
  const k4BomProfilesCountEl = document.getElementById("k4BomProfilesCount");
  const k4BomAdhesiveBagsEl = document.getElementById("k4BomAdhesiveBags");

  const backToStep3Btn = document.getElementById("backToStep3Btn");
  const previewBtn = document.getElementById("previewBtn");
  const previewModal = document.getElementById("previewModal");
  const previewCloseBtn = document.getElementById("previewCloseBtn");

  const k4PreviewTitleEl = document.getElementById("k4PreviewTitle");
  const k4PreviewImageEl = document.getElementById("k4PreviewImage");
  const k4PreviewCaptionEl = document.getElementById("k4PreviewCaption");

  // ✅ PDF tlačidlá
  const btnPdfDownload = document.getElementById("btnPdfDownload");
  const btnPdfToEmail = document.getElementById("btnPdfToEmail");
  const btnPdfRequestOffer = document.getElementById("btnPdfRequestOffer");

  // ✅ tile modal
  const tileModal = document.getElementById("tileModal");
  const tileThicknessInput = document.getElementById("tileThicknessInput");
  const tileSizeInput = document.getElementById("tileSizeInput"); // ⬅️ NOVÉ
  const tileConfirmBtn = document.getElementById("tileConfirmBtn");
  const tileCloseBtn = document.getElementById("tileCloseBtn");

  // ✅ PDF UI polia (tvoje IDčka)
  const pdfCustomerNameEl = document.getElementById("pdfCustomerName");
  const pdfCustomerCompanyEl = document.getElementById("pdfCustomerCompany");
  const pdfCustomerEmailEl = document.getElementById("pdfCustomerEmail");
  const pdfShowEmailEl = document.getElementById("pdfShowEmail");
  const pdfAutoNameInfoEl = document.getElementById("pdfAutoNameInfo");
  const pdfAutoNameTextEl = document.getElementById("pdfAutoNameText");

  // ---------------------------------------------------------------------------
  // TVARY + ✅ wallOptions presne ako chceš
  // ---------------------------------------------------------------------------
  const shapeConfigs = {
    square: {
      label: "Štvorec",
      sides: ["A"],
      info: "Štvorec – všetky strany A sú rovnaké.",
      wallOptions: ["A"],
    },
    rectangle: {
      label: "Obdĺžnik / „kosoštvorec“",
      sides: ["A", "B"],
      info: "Obdĺžnik – dve rôzne strany A a B. Mierna šikmina nevadí.",
      wallOptions: ["A", "B"],
    },
    "l-shape": {
      label: "Balkón v tvare L",
      sides: ["A", "B", "C", "D", "E", "F"],
      info: "Balkón v tvare L – doplňte všetkých 6 strán A–F v smere hodinových ručičiek (pravé uhly).",
      wallOptions: ["A", "B", "C", "D", "E", "F"],
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
  // POMOCNÉ
  // ---------------------------------------------------------------------------
  function parseVal(v) {
    if (v === null || v === undefined || v === "") return null;
    const num = parseFloat(String(v).replace(",", "."));
    if (Number.isNaN(num) || num <= 0) return null;
    return num;
  }

  function approxEqual(a, b, tol = 0.01) {
    return Math.abs(a - b) <= tol;
  }

  function canGoToStep3() {
    const d = state.dims;

    if (state.shapeKey === "square") return d.A != null;
    if (state.shapeKey === "rectangle") return d.A != null && d.B != null;

    if (state.shapeKey === "l-shape") {
      const all = ["A", "B", "C", "D", "E", "F"].every((k) => d[k] != null);
      return all && state.area != null && !state.geometryError;
    }

    return false;
  }

  function canGoToStep4() {
    if (!state.system) return false;
    if (state.perimeter == null) return false;
    if (state.area == null) return false;
    if (state.geometryError) return false;
    return true;
  }

  function hasRecipientEmailForMailOrOffer() {
    if (email) return true; // prihlásený
    return !!(state.pdfCustomerEmail || "").trim(); // verejný musí zadať
  }

  function updateStep2ContinueButton() {
    if (goToStep3Btn) goToStep3Btn.disabled = !canGoToStep3();
  }

  function updateStep3ContinueButton() {
    if (goToStep4Btn) goToStep4Btn.disabled = !canGoToStep4();
  }

  function updatePdfButtons() {
    const ok = canGoToStep4();
    if (btnPdfDownload) btnPdfDownload.disabled = !ok;
    if (btnPdfToEmail) btnPdfToEmail.disabled = !(ok && hasRecipientEmailForMailOrOffer());
    if (btnPdfRequestOffer) btnPdfRequestOffer.disabled = !(ok && hasRecipientEmailForMailOrOffer());
  }

  function computeAreaPerimeter(shapeKey, d) {
    let area = null;
    let per = null;
    let geometryError = null;

    if (shapeKey === "square") {
      const A = d.A;
      if (A != null) {
        area = A * A;
        per = 4 * A;
      }
    } else if (shapeKey === "rectangle") {
      const A = d.A,
        B = d.B;
      if (A != null && B != null) {
        area = A * B;
        per = 2 * (A + B);
      }
    } else if (shapeKey === "l-shape") {
      const A = d.A,
        B = d.B,
        C = d.C,
        D = d.D,
        E = d.E,
        F = d.F;
      const all = [A, B, C, D, E, F].every((v) => v != null);

      if (all) {
        per = A + B + C + D + E + F;

        const expectE = A - C;
        const expectB = F - D;

        if (expectE <= 0 || expectB <= 0) {
          geometryError =
            "Rozmery L-tvaru nedávajú zmysel. Skontrolujte, že A > C a F > D.";
        } else if (!approxEqual(E, expectE, 0.02) || !approxEqual(B, expectB, 0.02)) {
          geometryError =
            "Rozmery nesedia pre pravé uhly. Musí platiť E = A − C a B = F − D (v smere hodinových ručičiek).";
        } else {
          area = A * F - C * D;
          if (!(area > 0)) {
            geometryError =
              "Plocha vyšla neplatná. Skontrolujte prosím zadanie strán A–F.";
            area = null;
          }
        }
      }
    }

    return { area, perimeter: per, geometryError };
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

  // ---------------------------------------------------------------------------
  // “kótovanie” (UI) – zvýraznenie side-label a svg label
  // ---------------------------------------------------------------------------
  function formatLen(val) {
    return val.toFixed(1).replace(".", ",");
  }

  function updateShapePreviewLabels() {
    const nodes = Array.from(document.querySelectorAll("[data-preview-side]"));
    if (!nodes.length) return;

    nodes.forEach((el) => {
      const side = String(el.dataset.previewSide || "").toUpperCase();
      if (!side) return;

      const val = state.dims[side];
      const text = val != null ? formatLen(val) : side;
      el.textContent = text;

      const isWall = !!state.wallSides[side];
      el.classList.toggle("at-wall", isWall);
    });
  }

  // ---------------------------------------------------------------------------
  // ✅ NORMALIZÁCIA STRÁN (kvôli PDF)
  // ---------------------------------------------------------------------------
  function buildNormalizedDims() {
    const d = state.dims || {};

    if (state.shapeKey === "square") {
      if (d.A == null) return { A: null, B: null, C: null, D: null };
      return { A: d.A, B: d.A, C: d.A, D: d.A };
    }

    if (state.shapeKey === "rectangle") {
      if (d.A == null || d.B == null) return { A: null, B: null, C: null, D: null };
      return { A: d.A, B: d.B, C: d.A, D: d.B };
    }

    if (state.shapeKey === "l-shape") return { ...d };
    return { ...d };
  }

  function buildNormalizedWallSides() {
    const w = state.wallSides || {};

    if (state.shapeKey === "square")
      return { A: !!w.A, B: !!w.B, C: !!w.C, D: !!w.D };

    if (state.shapeKey === "rectangle")
      return { A: !!w.A, B: !!w.B, C: !!w.C, D: !!w.D };

    if (state.shapeKey === "l-shape") return { ...w };
    return { ...w };
  }

  // ---------------------------------------------------------------------------
  // ✅ STRANY PRI STENE – podľa HTML:
  // - checkbox má data-side
  // - wrapper je label.wall-box-label
  // - skrýva sa triedou .hidden
  // ---------------------------------------------------------------------------
  const wallCheckboxNodeList = Array.from(
    document.querySelectorAll('input[type="checkbox"][data-side]')
  );
  const wallCheckboxes = {};

  wallCheckboxNodeList.forEach((cb) => {
    const side = (cb.dataset.side || "").toUpperCase();
    if (!side) return;
    wallCheckboxes[side] = cb;
  });

  function getWallLabelForCheckbox(cb) {
    if (!cb) return null;
    return cb.closest("label.wall-box-label") || null;
  }

  function applyWallOptionsForCurrentShape() {
    const cfg = shapeConfigs[state.shapeKey];
    const allowed = new Set((cfg && cfg.wallOptions) || ["A", "B", "C", "D", "E", "F"]);

    Object.entries(wallCheckboxes).forEach(([side, cb]) => {
      const label = getWallLabelForCheckbox(cb);
      const isAllowed = allowed.has(side);

      if (label) label.classList.toggle("hidden", !isAllowed);

      if (!isAllowed) {
        cb.checked = false;
        state.wallSides[side] = false;
      }
    });

    // po zmene povolených strán hneď prepočítať obvod
    recomputeFromInputs();
  }

  // ---------------------------------------------------------------------------
  // ✅ PDF UI sync (tvoje ID)
  // ---------------------------------------------------------------------------
  function syncPdfUiToState() {
    state.pdfCustomerName = pdfCustomerNameEl
      ? String(pdfCustomerNameEl.value || "").trim()
      : state.pdfCustomerName;

    state.pdfCustomerCompany = pdfCustomerCompanyEl
      ? String(pdfCustomerCompanyEl.value || "").trim()
      : state.pdfCustomerCompany;

    state.pdfCustomerEmail = pdfCustomerEmailEl
      ? String(pdfCustomerEmailEl.value || "").trim()
      : state.pdfCustomerEmail;

    state.pdfShowEmailInPdf = pdfShowEmailEl ? !!pdfShowEmailEl.checked : false;

    updatePdfButtons();
  }

  function updatePdfUiEnabled() {
    if (!pdfCustomerEmailEl || !pdfShowEmailEl) {
      syncPdfUiToState();
      return;
    }

    pdfCustomerEmailEl.disabled = !pdfShowEmailEl.checked;
    if (!pdfShowEmailEl.checked) pdfCustomerEmailEl.value = "";

    syncPdfUiToState();
  }

  if (pdfCustomerNameEl) pdfCustomerNameEl.addEventListener("input", syncPdfUiToState);
  if (pdfCustomerCompanyEl) pdfCustomerCompanyEl.addEventListener("input", syncPdfUiToState);
  if (pdfCustomerEmailEl) pdfCustomerEmailEl.addEventListener("input", syncPdfUiToState);
  if (pdfShowEmailEl) pdfShowEmailEl.addEventListener("change", updatePdfUiEnabled);

  // ---------------------------------------------------------------------------
  // ✅ načítanie mena/prezývky prihláseného používateľa (dashboard endpoint)
  // ---------------------------------------------------------------------------
  async function tryLoadLoggedUserName() {
    if (!email) return;

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`);
      if (!res.ok) return;

      const u = await res.json().catch(() => null);
      if (!u) return;

      const nick = (u?.name || "").toString().trim(); // prezývka/meno v app
      const fullName = (u?.fullName || "").toString().trim(); // celé meno
      const company = (u?.companyName || "").toString().trim();

      const bestName = fullName || nick;

      state.userAutoName = bestName || nick || "";
      state.userAutoCompany = company || "";

      if (pdfCustomerNameEl && !String(pdfCustomerNameEl.value || "").trim() && bestName) {
        pdfCustomerNameEl.value = bestName;
      }

      if (
        pdfCustomerCompanyEl &&
        !String(pdfCustomerCompanyEl.value || "").trim() &&
        company
      ) {
        pdfCustomerCompanyEl.value = company;
      }

      if (pdfAutoNameInfoEl && pdfAutoNameTextEl) {
        const infoText = [bestName || nick, company].filter(Boolean).join(" • ");
        if (infoText) {
          pdfAutoNameTextEl.textContent = infoText;
          pdfAutoNameInfoEl.style.display = "";
        }
      }

      syncPdfUiToState();
    } catch (e) {
      // ticho ignorujeme
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY helpery
  // ---------------------------------------------------------------------------
  function updateStep3Summary() {
    if (k3TypeEl) k3TypeEl.textContent = state.fromStep1TypeLabel || "Vysunutý balkón";
    if (k3ShapeEl) k3ShapeEl.textContent = shapeConfigs[state.shapeKey]?.label || "–";

    if (k3AreaEl) {
      if (state.area != null) k3AreaEl.textContent = state.area.toFixed(1).replace(".", ",");
      else if (state.geometryError) k3AreaEl.textContent = "skontrolujte rozmery";
      else k3AreaEl.textContent = "–";
    }

    if (k3PerimeterEl) {
      k3PerimeterEl.textContent =
        state.perimeter != null ? state.perimeter.toFixed(1).replace(".", ",") : "–";
    }
  }

  function updateStep4Summary() {
    if (!document.getElementById("step4")) return;

    if (k4TypeEl) k4TypeEl.textContent = state.fromStep1TypeLabel || "Vysunutý balkón";
    if (k4ShapeEl) k4ShapeEl.textContent = shapeConfigs[state.shapeKey]?.label || "–";

    if (k4AreaEl) {
      if (state.area != null) k4AreaEl.textContent = state.area.toFixed(1).replace(".", ",");
      else if (state.geometryError) k4AreaEl.textContent = "skontrolujte rozmery";
      else k4AreaEl.textContent = "–";
    }

    if (k4PerimeterEl) {
      k4PerimeterEl.textContent =
        state.perimeter != null ? state.perimeter.toFixed(1).replace(".", ",") : "–";
    }

    if (k4HeightLabelEl) k4HeightLabelEl.textContent = getHeightLabel(state.heightDomId) || "–";
    if (k4DrainLabelEl) k4DrainLabelEl.textContent = getDrainLabel(state.drainDomId) || "–";

    if (k4SystemNameEl)
      k4SystemNameEl.textContent = state.system ? state.system.uiTitle || "Vybraný systém" : "–";
  }

  function updateStep4Preview() {
    if (!k4PreviewImageEl || !k4PreviewTitleEl || !k4PreviewCaptionEl) return;

    if (!state.system) {
      k4PreviewTitleEl.textContent = "Zatiaľ nevybraný – doplňte výšku a odtok vo kroku 3.";
      k4PreviewImageEl.src = "";
      k4PreviewCaptionEl.textContent =
        "Po výbere systému zobrazíme orientačný prierez so skladbou Schlüter® pre váš balkón.";
      return;
    }

    const cfg = getPreviewConfigForSystem(state.system);
    k4PreviewTitleEl.textContent = state.system.uiTitle || "Technický náhľad skladby balkóna";

    if (cfg) {
      k4PreviewImageEl.src = cfg.src;
      k4PreviewCaptionEl.textContent =
        cfg.caption || "Orientačný prierez skladby Schlüter® pre zvolený systém.";
    } else {
      k4PreviewImageEl.src = "";
      k4PreviewCaptionEl.textContent = "Technický náhľad pre túto kombináciu pripravíme v PDF podklade.";
    }
  }

  function syncBomToStep4() {
    if (
      !k4BomAreaEl ||
      !k4BomMembraneAreaEl ||
      !k4BomPerimeterEl ||
      !k4BomProfilesCountEl ||
      !k4BomAdhesiveBagsEl
    )
      return;

    k4BomAreaEl.textContent = bomAreaEl ? bomAreaEl.textContent : "–";
    k4BomMembraneAreaEl.textContent = bomMembraneAreaEl ? bomMembraneAreaEl.textContent : "–";
    k4BomPerimeterEl.textContent = bomPerimeterEl ? bomPerimeterEl.textContent : "–";
    k4BomProfilesCountEl.textContent = bomProfilesCountEl ? bomProfilesCountEl.textContent : "–";
    k4BomAdhesiveBagsEl.textContent = bomAdhesiveBagsEl ? bomAdhesiveBagsEl.textContent : "–";
  }

  function updateRecommendedBox() {
    if (!recommendedName || !recommendedNote) return;

    if (!state.heightDomId || !state.drainDomId) {
      if (state.heightDomId === "high") {
        recommendedName.textContent = "Zatiaľ nevybraná – zvoľte spôsob odtoku vody.";
        recommendedNote.textContent =
          "Pri vyššej konštrukčnej výške Schlüter® neponúka systém s voľnou hranou. Vyberte prosím variant so žľabom pri hrane alebo s podlahovou vpustou.";
      } else {
        recommendedName.textContent = "Zatiaľ nevybraná – zvoľte výšku a odtok vody.";
        recommendedNote.textContent =
          "Po výbere konštrukčnej výšky aj spôsobu odtoku vody vám zobrazíme návrh skladby. Detailný popis a prierezy dostanete v PDF priamo v Lištobooku.";
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

    recommendedName.textContent = state.system.uiTitle || "Navrhovaná skladba";
    recommendedNote.textContent =
      state.system.description || "Detailný popis skladby doplníme v PDF podklade z Lištobooku.";
  }

  function updateBom() {
    if (
      !bomAreaEl ||
      !bomMembraneAreaEl ||
      !bomPerimeterEl ||
      !bomProfilesCountEl ||
      !bomAdhesiveBagsEl ||
      !bomNoteEl
    )
      return;

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

    if (state.geometryError) {
      resetBom("Najprv opravte rozmery balkóna v kroku 2 (L-tvar musí sedieť geometricky).");
      syncBomToStep4();
      return;
    }

    if (area == null || per == null) {
      resetBom("Na výpočet materiálu potrebujeme mať doplnené rozmery tak, aby sme vedeli plochu aj obvod balkóna.");
      syncBomToStep4();
      return;
    }

    const profilePieces = Math.max(1, Math.ceil(per / 2.5));
    const adhesiveBags = Math.max(1, Math.ceil(area / 5));

    bomAreaEl.textContent = area.toFixed(1).replace(".", ",");
    bomMembraneAreaEl.textContent = area.toFixed(1).replace(".", ",");
    bomPerimeterEl.textContent = per.toFixed(1).replace(".", ",");
    bomProfilesCountEl.textContent = String(profilePieces);
    bomAdhesiveBagsEl.textContent = String(adhesiveBags);

    const drainDom = state.drainDomId;
    if (drainDom === "edge-free") {
      bomNoteEl.textContent =
        "Výpočet vychádza z plochy balkóna a obvodu voľnej hrany (bez stien). Ukončovacie profily rátame len po voľných hranách.";
    } else if (drainDom === "edge-gutter") {
      bomNoteEl.textContent =
        "Výpočet je prispôsobený balkónu so žľabom pri hrane. Profily rátame po voľných hranách podľa zadania.";
    } else if (drainDom === "internal-drain") {
      bomNoteEl.textContent =
        "Pre balkón s vnútorným vpustom rátame plochu pre izoláciu/drenáž a orientačné množstvo lepidla. Detaily doplníme v PDF.";
    } else {
      bomNoteEl.textContent =
        "Hodnoty sú orientačné. Presný výpočet doplníme po konzultácii s technikom Lištového centra.";
    }

    syncBomToStep4();
  }

  // ---------------------------------------------------------------------------
  // PREPOČET
  // ---------------------------------------------------------------------------
  function recomputeFromInputs() {
    const dims = {};

    for (const [side, input] of Object.entries(dimInputs)) {
      if (!input) {
        dims[side] = null;
        continue;
      }

      const field = fieldElems[side];
      if (field && field.classList.contains("hidden")) dims[side] = null;
      else dims[side] = parseVal(input.value);
    }

    state.dims = dims;

    const base = computeAreaPerimeter(state.shapeKey, dims);
    state.area = base.area;
    state.geometryError = base.geometryError || null;

    let per = base.perimeter;
    if (per != null) {
      const deduction = getWallDeduction(dims);
      per = Math.max(0, per - deduction);
    }
    state.perimeter = per;

    if (summaryAreaEl) {
      if (state.area != null) summaryAreaEl.textContent = state.area.toFixed(1).replace(".", ",");
      else if (state.geometryError) summaryAreaEl.textContent = state.geometryError;
      else summaryAreaEl.textContent = "–";
    }

    if (summaryPerimeterEl) {
      summaryPerimeterEl.textContent =
        state.perimeter != null ? state.perimeter.toFixed(1).replace(".", ",") : "–";
    }

    updateShapePreviewLabels();
    updateStep2ContinueButton();
    updateStep3Summary();
    updateRecommendedBox();
    updateBom();
    updateStep3ContinueButton();
    updateStep4Summary();
    updateStep4Preview();
    // odporúčanie pre veľký formát dlažby (UI refresh)
    const recommendationBox = document.getElementById("tileRecommendationBox");

    if (recommendationBox) {
      if (state.tileSizeCm > 30) {
        recommendationBox.style.display = "block";
      } else {
        recommendationBox.style.display = "none";
      }
    }
    // technické upozornenie v kroku 4 (LOW + veľký formát)
    const tileWarningBox = document.getElementById("tileWarningBox");

    if (tileWarningBox) {
      if (state.heightDomId === "low" && state.tileSizeCm > 30) {
        tileWarningBox.style.display = "block";
      } else {
        tileWarningBox.style.display = "none";
      }
    }
    updatePdfButtons();
  }

  function setShape(shapeKey) {
    if (!shapeConfigs[shapeKey]) return;

    state.shapeKey = shapeKey;

    document.querySelectorAll(".shape-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.shape === shapeKey);
    });

    const cfg = shapeConfigs[shapeKey];
    if (dimShapeInfo && cfg) dimShapeInfo.textContent = cfg.info;

    const activeSides = new Set(cfg.sides);
    Object.keys(fieldElems).forEach((side) => {
      const field = fieldElems[side];
      if (!field) return;
      field.classList.toggle("hidden", !activeSides.has(side));
    });

    state.geometryError = null;

    // ✅ kľúčové: wall checkboxy podľa tvaru
    applyWallOptionsForCurrentShape();
    recomputeFromInputs();
  }

  // ---------------------------------------------------------------------------
  // DRAIN availability
  // ---------------------------------------------------------------------------
  function updateDrainButtonsAvailability() {
    const isHigh = state.heightDomId === "high";

    drainOptions.forEach((btn) => {
      const opt = btn.dataset.drainOption;

      if (isHigh && opt === "edge-free") {
        btn.disabled = true;
        btn.classList.add("drain-disabled");
        if (state.drainDomId === "edge-free") state.drainDomId = null;
      } else {
        btn.disabled = false;
        btn.classList.remove("drain-disabled");
      }
    });
  }

  function toggleBarinExtraQuestions() {
  const box = document.getElementById("barinExtraBox");
  if (!box) return;

  if (state.drainDomId === "edge-gutter") {
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
    state.barinHasDownpipe = false;
    state.barinHeightCm = null;
  }
}

  function recalcSystemFromSelections() {
    state.system = findBalconySystem(state.heightDomId, state.drainDomId);
    updateRecommendedBox();
    updateBom();
    updateStep3ContinueButton();
    updateStep4Summary();
    updateStep4Preview();
    updatePdfButtons();
  }

  // ---------------------------------------------------------------------------
  // TILE MODAL
  // ---------------------------------------------------------------------------
  function openTileModal() {
    if (!tileModal) return;

    if (tileThicknessInput) {
      tileThicknessInput.value =
        state.tileThicknessMm != null ? String(state.tileThicknessMm) : "";
      tileThicknessInput.focus();
    }

    tileModal.classList.add("visible");
  }

  function closeTileModal() {
    if (!tileModal) return;
    tileModal.classList.remove("visible");
  }

  function ensureTileThicknessBefore(actionName) {
    if (
      state.tileThicknessMm != null &&
      Number.isFinite(state.tileThicknessMm) &&
      state.tileThicknessMm > 0 &&
      state.tileSizeCm != null &&               // ⬅️ DOPLNIŤ
      Number.isFinite(state.tileSizeCm) &&
      state.tileSizeCm > 0
    ) {
      return true;
    }

    state.pendingAction = actionName;
    openTileModal();
    return false;
  }

  async function runPendingActionIfAny() {
    const a = state.pendingAction;
    state.pendingAction = null;

    if (a === "download") return postPdfDownload(true);
    if (a === "email") return postPdfEmail(true);
    if (a === "offer") return;
  }

  function confirmTileThickness() {
   if (!tileThicknessInput || !tileSizeInput) return;

   const v = parseFloat(String(tileThicknessInput.value || "").replace(",", "."));
   if (!Number.isFinite(v) || v <= 0) {
    alert("Prosím zadajte platnú hrúbku dlažby v mm (napr. 10, 20, 30).");
    return;
   }

   const s = parseFloat(String(tileSizeInput.value || "").replace(",", "."));
   if (!Number.isFinite(s) || s <= 0) {
    alert("Prosím zadajte rozmer dlažby v cm (napr. 30, 60, 90).");
    return;
   }

   state.tileThicknessMm = Math.round(v);
   state.tileSizeCm = Math.round(s); // ⬅️ TU SA TO ULOŽÍ

   // ✅ odporúčanie pre veľký formát dlažby
  const recommendationBox = document.getElementById("tileRecommendationBox");

  if (recommendationBox) {
    if (state.tileSizeCm > 30) {
      recommendationBox.style.display = "block";
    } else {
      recommendationBox.style.display = "none";
    }
  }

   recomputeFromInputs();
   closeTileModal();
   runPendingActionIfAny();
}

  if (tileConfirmBtn) tileConfirmBtn.addEventListener("click", confirmTileThickness);

  if (tileCloseBtn) {
    tileCloseBtn.addEventListener("click", () => {
      state.pendingAction = null;
      closeTileModal();
    });
  }

  if (tileModal) {
    const bd = tileModal.querySelector(".preview-backdrop");
    if (bd) {
      bd.addEventListener("click", () => {
        state.pendingAction = null;
        closeTileModal();
      });
    }

    if (tileThicknessInput) {
      tileThicknessInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirmTileThickness();
      });
    }
  }
// -----------------------------------------------------------
// BARIN – výpočet setov (minimalizácia odpadu)
// -----------------------------------------------------------
function calculateBarinSets(totalLength) {
  const result = {
    totalLength: totalLength || 0,
    set25: 0,
    set15: 0,
    totalSuppliedLength: 0,
    waste: 0,
  };

  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    return result;
  }

  // 1️⃣ najprv čo najviac 2,5 m
  let count25 = Math.floor(totalLength / 2.5);
  let remainder = totalLength - count25 * 2.5;

  // 2️⃣ dorovnanie zvyšku
  if (remainder > 0) {
    if (remainder <= 1.5) {
      result.set15 = 1;
    } else {
      count25 += 1;
    }
  }

  result.set25 = count25;

  result.totalSuppliedLength =
    result.set25 * 2.5 +
    result.set15 * 1.5;

  result.waste =
    Math.max(0, result.totalSuppliedLength - totalLength);

  return result;
}
  // ---------------------------------------------------------------------------
  // ✅ PAYLOAD + PDF akcie
  // ---------------------------------------------------------------------------
  function buildBridgePayload() {
    syncPdfUiToState();

    const sys = state.system;
    const preview = sys ? getPreviewConfigForSystem(sys) : null;

    const bom = {
      area: bomAreaEl ? parseFloat(String(bomAreaEl.textContent).replace(",", ".")) : null,
      membraneArea: bomMembraneAreaEl
        ? parseFloat(String(bomMembraneAreaEl.textContent).replace(",", "."))
        : null,
      perimeter: bomPerimeterEl
        ? parseFloat(String(bomPerimeterEl.textContent).replace(",", "."))
        : null,
      profilesCount: bomProfilesCountEl
        ? parseInt(String(bomProfilesCountEl.textContent || "0"), 10)
        : null,
      adhesiveBags: bomAdhesiveBagsEl
        ? parseInt(String(bomAdhesiveBagsEl.textContent || "0"), 10)
        : null,
    };

    const dimsNormalized = buildNormalizedDims();
    // 🔹 BARIN výpočet zo súčtu voľných hrán
    const barinCalc =
      state.drainDomId === "edge-gutter"
        ? calculateBarinSets(state.perimeter)
        : null;
    const wallSidesNormalized = buildNormalizedWallSides();

    const bara = recommendBaraProfile(state.tileThicknessMm);

    // ✅ pravidlo:
    // Meno -> Firma -> Prezývka (autoName)
    const bestCustomerLabel =
      (state.pdfCustomerName || "").trim() ||
      (state.pdfCustomerCompany || "").trim() ||
      (state.userAutoName || "").trim() ||
      "";

    // recipient pre mail/ponuku: prihlásený email alebo ručne zadaný
    const recipientEmail = email || (state.pdfCustomerEmail || "").trim();

    return {
      meta: { app: "calc_balkony", version: 6, email: email || "" },

      pdfMeta: {
        customerLabel: bestCustomerLabel,
        customerEmail: recipientEmail || "",
        showEmailInPdf: !!state.pdfShowEmailInPdf,
        ownerEmail: email || "",
      },

      calc: {
        typeKey: state.fromStep1TypeKey,
        typeLabel: state.fromStep1TypeLabel,

        shapeKey: state.shapeKey,
        shapeLabel: shapeConfigs[state.shapeKey]?.label || "",

        dimsRaw: { ...state.dims },
        wallSidesRaw: { ...state.wallSides },

        dims: dimsNormalized,
        wallSides: wallSidesNormalized,

        area: state.area,
        perimeter: state.perimeter,

        tileThicknessMm: bara.tileMm,
        tileSizeCm: state.tileSizeCm,
        baraFamily: bara.family,
        baraRecommendationText: bara.recommendationText,
        baraNote: bara.note,
        baraRwOptionsText: bara.rwOptionsText || "",

        heightId: state.heightDomId,
        heightLabel: getHeightLabel(state.heightDomId),

        drainId: state.drainDomId,
        drainLabel: getDrainLabel(state.drainDomId),

        barinHasDownpipe: state.barinHasDownpipe,
        barinHeightCm: state.barinHeightCm,

        barin: barinCalc,

        systemId: sys ? sys.id : null,
        systemTitle: sys ? sys.uiTitle || "" : null,

        previewId: sys ? sys.id : null,
        previewSrc: preview ? preview.src : null,
      },

      bom,
    };
  }

  async function tryPdfDownloadEndpoints(payload) {
    const candidates = [
      "/api/pdf/balkon-final-html",
      "/api/pdf/balkon-final",
      "/api/pdf/balkon-download",
      "/api/pdf/generate-balkon",
      "/api/pdf/html/balkon",
      "/api/pdf/balkon",
      "/api/pdf/balkony",
    ];

    let lastErr = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          lastErr = new Error(`${url}: HTTP ${res.status}${txt ? " - " + txt : ""}`);
          continue;
        }

        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (!ct.includes("pdf") && !ct.includes("octet-stream")) {
          const txt = await res.text().catch(() => "");
          lastErr = new Error(
            `${url}: Nečakaný content-type (${ct || "?"})${txt ? " - " + txt : ""}`
          );
          continue;
        }

        const blob = await res.blob();
        if (!blob || blob.size < 50) {
          lastErr = new Error(`${url}: PDF blob je prázdny/poškodený`);
          continue;
        }

        return { ok: true, usedUrl: url, blob };
      } catch (e) {
        lastErr = new Error(`${url}: ${e?.message || e}`);
      }
    }

    return {
      ok: false,
      error: lastErr || new Error("Nepodarilo sa nájsť funkčný PDF endpoint."),
    };
  }

  async function tryPdfMailEndpoints(payload) {
    // ✅ posielame len originál (HTML→PDF + prílohy)
    const url = "/api/pdf/balkon-final-html-send";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      return { ok: true, usedUrl: url, data };
    } catch (e) {
      return { ok: false, error: new Error(`${url}: ${e?.message || e}`) };
    }
  }

  async function postPdfDownload(skipTileCheck = false) {
    if (!canGoToStep4()) return;

    if (!skipTileCheck) {
      const ok = ensureTileThicknessBefore("download");
      if (!ok) return;
    }

    const btn = btnPdfDownload;
    const oldText = btn ? btn.textContent : "";

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Generujem PDF...";
      }

      const payload = buildBridgePayload();
      const out = await tryPdfDownloadEndpoints(payload);
      if (!out.ok) throw out.error;

      const url = URL.createObjectURL(out.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "balkon-final.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Chyba pri generovaní PDF: ${e?.message || e}`);
    } finally {
      if (btn) {
        btn.textContent = oldText;
        updatePdfButtons();
      }
    }
  }

  async function postPdfEmail(skipTileCheck = false) {
    if (!canGoToStep4()) return;

    if (!hasRecipientEmailForMailOrOffer()) {
      alert("Chýba e-mail pre odoslanie. Prihláste sa, alebo zadajte e-mail v údajoch do PDF.");
      return;
    }

    if (!skipTileCheck) {
      const ok = ensureTileThicknessBefore("email");
      if (!ok) return;
    }

    const btn = btnPdfToEmail;
    const oldText = btn ? btn.textContent : "";

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Odosielam e-mail...";
      }

      const payload = buildBridgePayload();
      const out = await tryPdfMailEndpoints(payload);
      if (!out.ok) throw out.error;

      alert(out.data?.message || "PDF bolo odoslané.");
    } catch (e) {
      alert(`Chyba pri odosielaní PDF: ${e?.message || e}`);
    } finally {
      if (btn) {
        btn.textContent = oldText;
        updatePdfButtons();
      }
    }
  }

  if (btnPdfDownload) btnPdfDownload.addEventListener("click", () => postPdfDownload(false));
  if (btnPdfToEmail) btnPdfToEmail.addEventListener("click", () => postPdfEmail(false));

  async function postPdfOffer(skipTileCheck = false) {
  if (!canGoToStep4()) return;

  if (!hasRecipientEmailForMailOrOffer()) {
    alert("Chýba e-mail pre ponuku. Prihláste sa, alebo zadajte e-mail v údajoch do PDF.");
    return;
  }

  if (!skipTileCheck) {
    const ok = ensureTileThicknessBefore("offer");
    if (!ok) return;
  }

  const btn = btnPdfRequestOffer;
  const oldText = btn ? btn.textContent : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Odosielam požiadavku...";
    }

    const payload = buildBridgePayload();

    const res = await fetch("/api/pdf/balkon-final-html-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    alert("Požiadavka o cenovú ponuku bola odoslaná. Potvrdenie nájdete v e-maile.");
  } catch (e) {
    alert(`Chyba pri odoslaní ponuky: ${e?.message || e}`);
  } finally {
    if (btn) {
      btn.textContent = oldText;
      updatePdfButtons();
    }
  }
}

if (btnPdfRequestOffer) {
  btnPdfRequestOffer.addEventListener("click", () => postPdfOffer(false));
}

  // ---------------------------------------------------------------------------
  // LISTENERY – KROK 2
  // ---------------------------------------------------------------------------
  if (shapeGrid) {
    shapeGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".shape-card");
      if (!card) return;

      setShape(card.dataset.shape);

      if (window.innerWidth <= 768) {
        const sideAInput = dimInputs.A;
        if (sideAInput) sideAInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  Object.values(dimInputs).forEach((input) => {
    if (!input) return;
    ["input", "change", "blur"].forEach((evt) => input.addEventListener(evt, recomputeFromInputs));
  });

  Object.entries(wallCheckboxes).forEach(([side, checkbox]) => {
    checkbox.addEventListener("change", () => {
      state.wallSides[side] = checkbox.checked;
      recomputeFromInputs();
    });
  });

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener("click", () => {
      const target = "calc_terasa_base.html";
      window.location.href = email ? `${target}?email=${encodeURIComponent(email)}` : target;
    });
  }

  if (goToStep3Btn) {
    goToStep3Btn.addEventListener("click", () => {
      recomputeFromInputs();
      if (!canGoToStep3()) return;

      showStep(3);
      updateStep3Summary();
      updateBom();
      updateStep3ContinueButton();
      updatePdfButtons();
    });
  }

  // ---------------------------------------------------------------------------
  // LISTENERY – KROK 3
  // ---------------------------------------------------------------------------
  if (heightRadios.length) {
    heightRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        state.heightDomId = radio.value;
        updateDrainButtonsAvailability();
        recalcSystemFromSelections();
      });
    });
  }

  if (drainOptions.length) {
    drainOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        state.drainDomId = btn.dataset.drainOption;

        drainOptions.forEach((other) => other.classList.toggle("selected", other === btn));
        toggleBarinExtraQuestions();
        recalcSystemFromSelections();
      });
    });
  }
  // -----------------------------------------------------------
// BARIN – listener pre zvod a výšku
// -----------------------------------------------------------
const barinHeightInput = document.getElementById("barinHeightInput");

// výber strany zvodu (L / R)
document.addEventListener("change", (e) => {

  // checkbox zvodu
  if (e.target && e.target.id === "barinHasDownpipe") {

    const sideBox = document.getElementById("barinDownpipeSideBox");

    if (e.target.checked) {
      sideBox.style.display = "block";
    } else {
      sideBox.style.display = "none";

      document
        .querySelectorAll('input[name="barinDownpipeSide"]')
        .forEach(r => r.checked = false);

      state.barinDownpipeSide = null;
    }

    state.barinHasDownpipe = e.target.checked;
  }

  // 🔥 výber strany zvodu (delegation)
  if (e.target && e.target.name === "barinDownpipeSide") {
    if (e.target.checked) {
      state.barinDownpipeSide = e.target.value; // left / right
    }
  }

});

if (barinHeightInput) {
  barinHeightInput.addEventListener("input", () => {
    const v = parseFloat(
      String(barinHeightInput.value || "").replace(",", ".")
    );

    state.barinHeightCm =
      Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  });
}

  if (backToStep2Btn) backToStep2Btn.addEventListener("click", () => showStep(2));

  if (goToStep4Btn) {
    goToStep4Btn.addEventListener("click", () => {
      recomputeFromInputs();
      updateStep3ContinueButton();
      if (!canGoToStep4()) return;

      showStep(4);
      updateStep4Summary();
      updateStep4Preview();
      syncBomToStep4();
      updatePdfUiEnabled();
      updatePdfButtons();
    });
  }

  // ---------------------------------------------------------------------------
  // LISTENERY – KROK 4
  // ---------------------------------------------------------------------------
  if (backToStep3Btn) backToStep3Btn.addEventListener("click", () => showStep(3));

  if (previewBtn && previewModal) {
    previewBtn.addEventListener("click", () => {
      // (ponechané – ak používaš previewBtn, inak nevadí)
    });

    if (previewCloseBtn) previewCloseBtn.addEventListener("click", () => {});
  }

  // ---------------------------------------------------------------------------
  // INITIALIZÁCIA
  // ---------------------------------------------------------------------------
  showStep(2);
  setShape("square"); // default

  // ✅ wall možnosti hneď po štarte
  applyWallOptionsForCurrentShape();

  updateStep2ContinueButton();
  updateStep3Summary();
  updateDrainButtonsAvailability();
  updateBom();
  updateRecommendedBox();
  updateStep3ContinueButton();
  updateStep4Summary();
  updateStep4Preview();
  syncBomToStep4();
  updateShapePreviewLabels();
  updatePdfUiEnabled();
  updatePdfButtons();

  // ✅ skús načítať meno/prezývku prihláseného
  tryLoadLoggedUserName();
  toggleBarinExtraQuestions();
  
});
// ================= MOBILE WIZARD STEP 1 (FIX) =================
document.addEventListener("DOMContentLoaded", () => {
  if (window.innerWidth > 640) return;

  document.body.classList.add("mobile-wizard");

  const overlay = document.getElementById("wizardOverlay");
  const originalGrid = document.getElementById("shapeGrid");

  if (!overlay || !originalGrid) return;

  // presunieme ORIGINÁL grid do overlay (žiadna kópia!)
  const mount = document.getElementById("wizardShapeMount");
  mount.appendChild(originalGrid);

  // po kliknutí na tvar zavri wizard
  originalGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".shape-card");
    if (!card) return;

    overlay.style.display = "none";
    document.querySelector(".wrap").style.visibility = "visible";

    setTimeout(() => {
      const a = document.getElementById("sideA");
      if (a) a.focus();
    }, 300);
  });
});
