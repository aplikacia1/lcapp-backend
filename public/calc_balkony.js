// public/calc_balkony.js
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------------------
  // EMAIL v hlavičke + späť
  // ---------------------------------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");

  const userChip = document.getElementById("userChip");
  if (userChip) {
    userChip.textContent = email ? `Prihlásený: ${email}` : "Prihlásený: –";
  }

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const target = "calc_terasa_base.html";
      if (email) {
        window.location.href = `${target}?email=${encodeURIComponent(email)}`;
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
      src: "img/systems/balkon-low-edge-gutter.png поправло??",
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

  const heightRadios = Array.from(
    document.querySelectorAll('input[name="heightOption"]')
  );
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
  const previewImage = document.getElementById("previewImage");
  const previewCaption = document.getElementById("previewCaption");
  const previewCloseBtn = document.getElementById("previewCloseBtn");

  const k4PreviewTitleEl = document.getElementById("k4PreviewTitle");
  const k4PreviewImageEl = document.getElementById("k4PreviewImage");
  const k4PreviewCaptionEl = document.getElementById("k4PreviewCaption");

  // ✅ PDF tlačidlá – napojenie
  const btnPdfDownload = document.getElementById("btnPdfDownload");
  const btnPdfToEmail = document.getElementById("btnPdfToEmail");
  const btnPdfRequestOffer = document.getElementById("btnPdfRequestOffer");

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
      info: "Obdĺžnik – dve rôzne strany A a B. Mierna šikmina nevadí.",
    },
    "l-shape": {
      label: "Balkón v tvare L",
      sides: ["A", "B", "C", "D", "E", "F"],
      info: "Balkón v tvare L – doplňte všetkých 6 strán A–F v smere hodinových ručičiek (pravé uhly).",
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

  function approxEqual(a, b, tol = 0.01) {
    return Math.abs(a - b) <= tol;
  }

  function canGoToStep3() {
    const d = state.dims;
    if (state.shapeKey === "square") return d.A != null;
    if (state.shapeKey === "rectangle") return d.A != null && d.B != null;
    if (state.shapeKey === "l-shape") {
      const all = ["A", "B", "C", "D", "E", "F"].every((key) => d[key] != null);
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

  function updateStep2ContinueButton() {
    if (!goToStep3Btn) return;
    goToStep3Btn.disabled = !canGoToStep3();
  }

  function updateStep3ContinueButton() {
    if (!goToStep4Btn) return;
    goToStep4Btn.disabled = !canGoToStep4();
  }

  // ✅ zapínanie PDF tlačidiel v kroku 4
  function updatePdfButtons() {
    const ok = canGoToStep4();
    if (btnPdfDownload) btnPdfDownload.disabled = !ok;
    if (btnPdfToEmail) btnPdfToEmail.disabled = !ok;
    if (btnPdfRequestOffer) btnPdfRequestOffer.disabled = true;
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
        } else if (
          !approxEqual(E, expectE, 0.02) ||
          !approxEqual(B, expectB, 0.02)
        ) {
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
  // “kótovanie” (UI)
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
  // ✅ SVG náčrt pre PDF (krok 2)
  // ---------------------------------------------------------------------------
  function buildShapeSketchSvg() {
    const shape = state.shapeKey;
    const d = state.dims || {};
    const w = state.wallSides || {};

    const fmt = (v) => (v != null ? formatLen(v) : "");
    const esc = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const vbW = 360;
    const vbH = 260;
    const pad = 26;

    const stroke = "#facc15";
    const strokeWall = "#facc15";
    const bg = "rgba(0,0,0,0)";

    const txt = "#e5e7eb";
    const txtMuted = "#9ca3af";

    const lineSolid = (x1, y1, x2, y2) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>`;

    const lineWall = (x1, y1, x2, y2) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeWall}" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 10"/>`;

    const label = (x, y, t, anchor = "middle") =>
      `<text x="${x}" y="${y}" fill="${txt}" font-size="18" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle">${esc(
        t
      )}</text>`;

    const labelSmall = (x, y, t, anchor = "middle") =>
      `<text x="${x}" y="${y}" fill="${txtMuted}" font-size="14" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle">${esc(
        t
      )}</text>`;

    const x1 = pad;
    const y1 = pad;
    const x2 = vbW - pad;
    const y2 = vbH - pad;

    let body = "";

    if (shape === "square") {
      const A = d.A;
      if (A == null) return "";

      const topLen = fmt(A);
      const rightLen = fmt(A);
      const bottomLen = fmt(A);
      const leftLen = fmt(A);

      const topWall = !!w.A;
      const rightWall = !!w.B;
      const bottomWall = !!w.C;
      const leftWall = !!w.D;

      body += (topWall ? lineWall(x1, y1, x2, y1) : lineSolid(x1, y1, x2, y1));
      body += (rightWall ? lineWall(x2, y1, x2, y2) : lineSolid(x2, y1, x2, y2));
      body += (bottomWall ? lineWall(x1, y2, x2, y2) : lineSolid(x1, y2, x2, y2));
      body += (leftWall ? lineWall(x1, y1, x1, y2) : lineSolid(x1, y1, x1, y2));

      body += label((x1 + x2) / 2, y1 - 16, topLen);
      body += label(x2 + 18, (y1 + y2) / 2, rightLen, "start");
      body += label((x1 + x2) / 2, y2 + 16, bottomLen);
      body += label(x1 - 18, (y1 + y2) / 2, leftLen, "end");

      // rohové písmená A B C D (nie A A A A)
      body += labelSmall(x1 + 10, y1 + 18, "A", "start");
      body += labelSmall(x2 - 10, y1 + 18, "B", "end");
      body += labelSmall(x2 - 10, y2 - 18, "C", "end");
      body += labelSmall(x1 + 10, y2 - 18, "D", "start");
    }

    if (shape === "rectangle") {
      const A = d.A;
      const B = d.B;
      if (A == null || B == null) return "";

      const topLen = fmt(A);
      const rightLen = fmt(B);
      const bottomLen = fmt(A);
      const leftLen = fmt(B);

      const topWall = !!w.A;
      const rightWall = !!w.B;
      const bottomWall = !!w.C;
      const leftWall = !!w.D;

      body += (topWall ? lineWall(x1, y1, x2, y1) : lineSolid(x1, y1, x2, y1));
      body += (rightWall ? lineWall(x2, y1, x2, y2) : lineSolid(x2, y1, x2, y2));
      body += (bottomWall ? lineWall(x1, y2, x2, y2) : lineSolid(x1, y2, x2, y2));
      body += (leftWall ? lineWall(x1, y1, x1, y2) : lineSolid(x1, y1, x1, y2));

      body += label((x1 + x2) / 2, y1 - 16, topLen);
      body += label(x2 + 18, (y1 + y2) / 2, rightLen, "start");
      body += label((x1 + x2) / 2, y2 + 16, bottomLen);
      body += label(x1 - 18, (y1 + y2) / 2, leftLen, "end");

      body += labelSmall(x1 + 10, y1 + 18, "A", "start");
      body += labelSmall(x2 - 10, y1 + 18, "B", "end");
      body += labelSmall(x2 - 10, y2 - 18, "C", "end");
      body += labelSmall(x1 + 10, y2 - 18, "D", "start");
    }

    if (shape === "l-shape") {
      const A = d.A, B = d.B, C = d.C, D = d.D, E = d.E, F = d.F;
      const all = [A, B, C, D, E, F].every((v) => v != null);
      if (!all) return "";

      const maxX = Math.max(A, C, E);
      const maxY = Math.max(F, D);
      const sx = (vbW - 2 * pad) / (maxX || 1);
      const sy = (vbH - 2 * pad) / (maxY || 1);
      const s = Math.min(sx, sy);

      const p0 = { x: 0, y: 0 };
      const p1 = { x: A, y: 0 };
      const p2 = { x: A, y: B };
      const p3 = { x: C, y: B };
      const p4 = { x: C, y: B + D };
      const p5 = { x: 0, y: B + D };
      const p6 = { x: 0, y: 0 + F };

      const pts = [p0, p1, p2, p3, p4, p5, p6];
      const minX = Math.min(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxXX = Math.max(...pts.map((p) => p.x));
      const maxYY = Math.max(...pts.map((p) => p.y));

      const shapeW = (maxXX - minX) * s;
      const shapeH = (maxYY - minY) * s;

      const offX = (vbW - 2 * pad - shapeW) / 2;
      const offY = (vbH - 2 * pad - shapeH) / 2;

      const X = (v) => pad + offX + (v - minX) * s;
      const Y = (v) => pad + offY + (v - minY) * s;

      const seg = [
        { from: p0, to: p1, id: "A", len: A, wall: !!w.A, pos: "top" },
        { from: p1, to: p2, id: "B", len: B, wall: !!w.B, pos: "right" },
        { from: p2, to: p3, id: "C", len: C, wall: !!w.C, pos: "mid-top" },
        { from: p3, to: p4, id: "D", len: D, wall: !!w.D, pos: "mid-right" },
        { from: p4, to: p5, id: "E", len: E, wall: !!w.E, pos: "bottom" },
        { from: p5, to: p6, id: "F", len: F, wall: !!w.F, pos: "left" },
      ];

      seg.forEach((s1) => {
        const xA = X(s1.from.x), yA = Y(s1.from.y);
        const xB = X(s1.to.x), yB = Y(s1.to.y);
        body += (s1.wall ? lineWall(xA, yA, xB, yB) : lineSolid(xA, yA, xB, yB));

        const mx = (xA + xB) / 2;
        const my = (yA + yB) / 2;

        if (Math.abs(yA - yB) < 1) {
          const dy = s1.pos === "bottom" ? 18 : -16;
          body += label(mx, my + dy, fmt(s1.len));
        } else {
          const dx = s1.pos === "left" ? -18 : 18;
          body += label(mx + dx, my, fmt(s1.len), dx < 0 ? "end" : "start");
        }

        body += labelSmall(mx, my, s1.id);
      });
    }

    if (!body) return "";

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="100%" height="100%" style="display:block;background:${bg}">
  ${body}
</svg>`.trim();
  }

  // ---------------------------------------------------------------------------
  // ✅ NORMALIZÁCIA STRÁN (kľúčové)
  // - štvorcový: A,B,C,D = A
  // - obdĺžnik: A,C = A ; B,D = B
  // - L: necháme A–F
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
    if (state.shapeKey === "l-shape") {
      return { ...d };
    }
    return { ...d };
  }

  function buildNormalizedWallSides() {
    const w = state.wallSides || {};
    if (state.shapeKey === "square") {
      // umožní označiť aj B/C/D (ak checkboxy existujú)
      return { A: !!w.A, B: !!w.B, C: !!w.C, D: !!w.D };
    }
    if (state.shapeKey === "rectangle") {
      return { A: !!w.A, B: !!w.B, C: !!w.C, D: !!w.D };
    }
    if (state.shapeKey === "l-shape") {
      return { ...w };
    }
    return { ...w };
  }

  // ---------------------------------------------------------------------------
  // krok 3/4 summary helpery
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
      recommendedName.textContent = "Zatiaľ nevybraná – skladbu pre túto kombináciu ešte nemáme.";
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
      resetBom(
        "Na výpočet materiálu potrebujeme mať doplnené rozmery tak, aby sme vedeli plochu aj obvod balkóna."
      );
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

    const isLShape = state.shapeKey === "l-shape";
    const lComplete =
      isLShape && ["A", "B", "C", "D", "E", "F"].every((k) => dims[k] != null);

    if (summaryAreaEl) {
      if (state.area != null) summaryAreaEl.textContent = state.area.toFixed(1).replace(".", ",");
      else if (state.geometryError) summaryAreaEl.textContent = state.geometryError;
      else if (lComplete) summaryAreaEl.textContent = "–";
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
    if (!previewModal || !previewImage || !previewCaption || !previewBtn) return;
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
        btn.disabled = true;
        btn.classList.add("drain-disabled");
        if (state.drainDomId === "edge-free") state.drainDomId = null;
      } else {
        btn.disabled = false;
        btn.classList.remove("drain-disabled");
      }
    });
  }

  function recalcSystemFromSelections() {
    state.system = findBalconySystem(state.heightDomId, state.drainDomId);

    updateRecommendedBox();
    updateBom();
    updatePreviewButton();
    updateStep3ContinueButton();
    updateStep4Summary();
    updateStep4Preview();
    updatePdfButtons();
  }

  // ---------------------------------------------------------------------------
  // ✅ PAYLOAD + PDF akcie (download / email)
  // ---------------------------------------------------------------------------
  function buildBridgePayload() {
    const sys = state.system;
    const preview = sys ? getPreviewConfigForSystem(sys) : null;

    const bom = {
      area: bomAreaEl ? parseFloat(String(bomAreaEl.textContent).replace(",", ".")) : null,
      membraneArea: bomMembraneAreaEl
        ? parseFloat(String(bomMembraneAreaEl.textContent).replace(",", "."))
        : null,
      perimeter: bomPerimeterEl ? parseFloat(String(bomPerimeterEl.textContent).replace(",", ".")) : null,
      profilesCount: bomProfilesCountEl
        ? parseInt(String(bomProfilesCountEl.textContent || "0"), 10)
        : null,
      adhesiveBags: bomAdhesiveBagsEl
        ? parseInt(String(bomAdhesiveBagsEl.textContent || "0"), 10)
        : null,
    };

    const shapeSketchSvg = buildShapeSketchSvg();

    // ✅ kľúčové: normalizované strany (A,B,C,D) pre štvorec/obdĺžnik
    const dimsNormalized = buildNormalizedDims();
    const wallSidesNormalized = buildNormalizedWallSides();

    return {
      meta: {
        app: "calc_balkony",
        version: 2,
        email: email || "",
      },
      calc: {
        typeKey: state.fromStep1TypeKey,
        typeLabel: state.fromStep1TypeLabel,
        shapeKey: state.shapeKey,
        shapeLabel: shapeConfigs[state.shapeKey]?.label || "",

        // RAW (tak ako zadávaš dnes)
        dimsRaw: { ...state.dims },
        wallSidesRaw: { ...state.wallSides },

        // NORMALIZED (pre PDF a ďalšie kroky)
        dims: dimsNormalized,
        wallSides: wallSidesNormalized,

        area: state.area,
        perimeter: state.perimeter,

        heightId: state.heightDomId,
        heightLabel: getHeightLabel(state.heightDomId),
        drainId: state.drainDomId,
        drainLabel: getDrainLabel(state.drainDomId),

        systemId: sys ? sys.id : null,
        systemTitle: sys ? sys.uiTitle || "" : null,

        previewId: sys ? sys.id : null,
        previewSrc: preview ? preview.src : null,

        shapeSketchSvg,
      },
      bom,
    };
  }

  async function postPdfDownload() {
    if (!canGoToStep4()) return;

    const btn = btnPdfDownload;
    const oldText = btn ? btn.textContent : "";
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Generujem PDF...";
      }

      const payload = buildBridgePayload();

      const res = await fetch("/api/pdf/balkon-final-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "balkon-final.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Chyba pri generovaní PDF: ${e.message || e}`);
    } finally {
      if (btn) {
        btn.textContent = oldText;
        updatePdfButtons();
      }
    }
  }

  async function postPdfEmail() {
    if (!canGoToStep4()) return;

    if (!email) {
      alert("Chýba e-mail v URL. Otvorte kalkulačku s parametrom ?email=...");
      return;
    }

    const btn = btnPdfToEmail;
    const oldText = btn ? btn.textContent : "";
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Odosielam e-mail...";
      }

      const payload = buildBridgePayload();

      const res = await fetch("/api/pdf/balkon-final-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      alert(data.message || "PDF bolo odoslané.");
    } catch (e) {
      alert(`Chyba pri odosielaní PDF: ${e.message || e}`);
    } finally {
      if (btn) {
        btn.textContent = oldText;
        updatePdfButtons();
      }
    }
  }

  if (btnPdfDownload) btnPdfDownload.addEventListener("click", postPdfDownload);
  if (btnPdfToEmail) btnPdfToEmail.addEventListener("click", postPdfEmail);

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
        if (sideAInput)
          sideAInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  Object.values(dimInputs).forEach((input) => {
    if (!input) return;
    ["input", "change", "blur"].forEach((evt) => input.addEventListener(evt, recomputeFromInputs));
  });

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
        recalcSystemFromSelections();
      });
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
      updatePdfButtons();
    });
  }

  // ---------------------------------------------------------------------------
  // LISTENERY – KROK 4
  // ---------------------------------------------------------------------------
  if (backToStep3Btn) backToStep3Btn.addEventListener("click", () => showStep(3));

  if (previewBtn && previewModal) {
    previewBtn.addEventListener("click", openPreviewModal);
    if (previewCloseBtn) previewCloseBtn.addEventListener("click", closePreviewModal);

    const backdrop = previewModal.querySelector(".preview-backdrop");
    if (backdrop) backdrop.addEventListener("click", closePreviewModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && previewModal.classList.contains("visible")) closePreviewModal();
    });
  }

  if (btnPdfRequestOffer) btnPdfRequestOffer.disabled = true;

  // ---------------------------------------------------------------------------
  // INITIALIZÁCIA
  // ---------------------------------------------------------------------------
  if (k3TypeEl) k3TypeEl.textContent = state.fromStep1TypeLabel;
  if (k4TypeEl) k4TypeEl.textContent = state.fromStep1TypeLabel;

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
  updateShapePreviewLabels();
  updatePdfButtons();
});
