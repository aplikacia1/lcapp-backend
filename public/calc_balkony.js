/* calc_balkony.js
   Schlüter® vysunutý balkón – kalkulačka (kroky 2–4)
   - výpočty plochy + obvodu pre lišty (s možnosťou "pri stene")
   - výber konštrukčnej výšky + odtoku vody
   - sumár pre PDF + odosielanie dát na backend
*/

(() => {
  "use strict";

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const round1 = (n) => {
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 10) / 10;
  };

  const toNum = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const isEmail = (s) => {
    const v = String(s || "").trim();
    if (!v) return false;
    // jednoduchá, praktická validácia
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const clampMin0 = (n) => (Number.isFinite(n) && n >= 0 ? n : null);

  const getUrlEmail = () => {
    const u = new URL(window.location.href);
    const e = (u.searchParams.get("email") || "").trim();
    return e || null;
  };

  const getApiBase = () => {
    // ak niekde používaš config.js / config_balkony.js, nechytáme sa na konkrétny názov
    // a fungujeme aj keď je to prázdne.
    return (
      window.API_BASE_URL ||
      window.API_BASE ||
      window.BACKEND_URL ||
      window.CONFIG?.API_BASE ||
      ""
    );
  };

  const apiFetch = async (path, options = {}) => {
    const base = getApiBase();
    const url = base ? `${base}${path}` : path;
    const res = await fetch(url, options);
    return res;
  };

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  // ---------------------------
  // State
  // ---------------------------
  const state = {
    // step2
    shape: "square", // square | rectangle | l-shape
    dims: { A: null, B: null, C: null, D: null, E: null, F: null },
    wall: new Set(), // sides at wall

    area: null,
    perimeterForProfiles: null,

    // step3
    height: null, // low | medium | high
    drain: null, // edge-free | edge-gutter | internal-drain

    system: {
      title: null,
      note: null,
      previewImg: null,
      previewCaption: null,
    },

    // bom (oriented)
    bom: {
      membraneArea: null,
      profilesCount: null,
      adhesiveBags: null,
    },

    // customer (step4)
    customer: {
      name: "",
      company: "",
      email: "",
      showEmailInPdf: false,
      nickname: "", // ak sa raz bude dať dotiahnuť
      loggedEmail: null,
    },

    tileThicknessMm: 15, // default (aby PDF strany fungovali, kým sa zapojí modal logika)
  };

  // ---------------------------
  // DOM refs
  // ---------------------------
  const el = {
    // header
    backBtn: $("#backBtn"),
    userChip: $("#userChip"),

    // steps
    step2: $("#step2"),
    step3: $("#step3"),
    step4: $("#step4"),

    // step2 controls
    shapeCards: $$("#shapeGrid .shape-card"),
    dimShapeInfo: $("#dimShapeInfo"),
    sideA: $("#sideA"),
    sideB: $("#sideB"),
    sideC: $("#sideC"),
    sideD: $("#sideD"),
    sideE: $("#sideE"),
    sideF: $("#sideF"),

    fieldSideA: $("#fieldSideA"),
    fieldSideB: $("#fieldSideB"),
    fieldSideC: $("#fieldSideC"),
    fieldSideD: $("#fieldSideD"),
    fieldSideE: $("#fieldSideE"),
    fieldSideF: $("#fieldSideF"),

    wallBox: $("#wallBox"),
    wallCheckboxes: $$(".wall-side-checkbox"),
    wallLabels: $$("#wallCheckboxRow .wall-box-label"),
    previewSideLabels: $$("[data-preview-side]"),

    summaryArea: $("#summaryArea"),
    summaryPerimeter: $("#summaryPerimeter"),

    backToStep1Btn: $("#backToStep1Btn"),
    goToStep3Btn: $("#goToStep3Btn"),

    // step3 summary
    k3Shape: $("#k3Shape"),
    k3Area: $("#k3Area"),
    k3Perimeter: $("#k3Perimeter"),

    // step3 questions
    heightRadios: $$('input[name="heightOption"]'),
    drainOptions: $$(".drain-option"),
    recommendedName: $("#recommendedName"),
    recommendedNote: $("#recommendedNote"),

    bomArea: $("#bomArea"),
    bomMembraneArea: $("#bomMembraneArea"),
    bomPerimeter: $("#bomPerimeter"),
    bomProfilesCount: $("#bomProfilesCount"),
    bomAdhesiveBags: $("#bomAdhesiveBags"),

    backToStep2Btn: $("#backToStep2Btn"),
    goToStep4Btn: $("#goToStep4Btn"),

    // step4 summary
    k4Type: $("#k4Type"),
    k4Shape: $("#k4Shape"),
    k4Area: $("#k4Area"),
    k4Perimeter: $("#k4Perimeter"),
    k4HeightLabel: $("#k4HeightLabel"),
    k4DrainLabel: $("#k4DrainLabel"),
    k4SystemName: $("#k4SystemName"),

    k4BomArea: $("#k4BomArea"),
    k4BomMembraneArea: $("#k4BomMembraneArea"),
    k4BomPerimeter: $("#k4BomPerimeter"),
    k4BomProfilesCount: $("#k4BomProfilesCount"),
    k4BomAdhesiveBags: $("#k4BomAdhesiveBags"),

    // step4 preview + buttons
    k4PreviewTitle: $("#k4PreviewTitle"),
    k4PreviewImage: $("#k4PreviewImage"),
    k4PreviewCaption: $("#k4PreviewCaption"),

    btnPdfDownload: $("#btnPdfDownload"),
    btnPdfToEmail: $("#btnPdfToEmail"),
    btnPdfRequestOffer: $("#btnPdfRequestOffer"),

    // step4 pdf fields
    pdfCustomerName: $("#pdfCustomerName"),
    pdfCustomerCompany: $("#pdfCustomerCompany"),
    pdfCustomerEmail: $("#pdfCustomerEmail"),
    pdfShowEmail: $("#pdfShowEmail"),
    pdfAutoNameInfo: $("#pdfAutoNameInfo"),
    pdfAutoNameText: $("#pdfAutoNameText"),

    // preview modal
    previewModal: $("#previewModal"),
    previewBackdrop: $("#previewModal .preview-backdrop"),
    previewCloseBtn: $("#previewCloseBtn"),
    previewImage: $("#previewImage"),
    previewCaption: $("#previewCaption"),
    previewTitle: $("#previewTitle"),

    // tile modal (zatiaľ len pripravené)
    tileModal: $("#tileModal"),
    tileCloseBtn: $("#tileCloseBtn"),
    tileConfirmBtn: $("#tileConfirmBtn"),
    tileThicknessInput: $("#tileThicknessInput"),
  };

  // ---------------------------
  // UI: step switching
  // ---------------------------
  const setActiveStep = (stepId) => {
    $$(".step-section").forEach((s) => s.classList.remove("active"));
    const target = $(`#${stepId}`);
    if (target) target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---------------------------
  // Shapes + fields visibility
  // ---------------------------
  const applyShapeUI = () => {
    // selected cards
    el.shapeCards.forEach((c) => {
      c.classList.toggle("selected", c.dataset.shape === state.shape);
    });

    // show/hide fields
    const show = (fieldEl, yes) => fieldEl.classList.toggle("hidden", !yes);

    if (state.shape === "square") {
      el.dimShapeInfo.textContent = "Štvorec – všetky strany A sú rovnaké.";
      show(el.fieldSideA, true);
      show(el.fieldSideB, false);
      show(el.fieldSideC, false);
      show(el.fieldSideD, false);
      show(el.fieldSideE, false);
      show(el.fieldSideF, false);
      // wall checkboxes len pre A (zmysel)
      toggleWallCheckboxVisibility({ A: true, B: false, C: false, D: false, E: false, F: false });
    } else if (state.shape === "rectangle") {
      el.dimShapeInfo.textContent = "Obdĺžnik / „kosoštvorec“ – zadáte strany A a B (aj pri mierne šikmom pôdoryse).";
      show(el.fieldSideA, true);
      show(el.fieldSideB, true);
      show(el.fieldSideC, false);
      show(el.fieldSideD, false);
      show(el.fieldSideE, false);
      show(el.fieldSideF, false);
      toggleWallCheckboxVisibility({ A: true, B: true, C: false, D: false, E: false, F: false });
    } else {
      el.dimShapeInfo.textContent = "L-tvar – zadáte 6 strán A–F podľa náčrtu (po obvode v smere hodinových ručičiek).";
      show(el.fieldSideA, true);
      show(el.fieldSideB, true);
      show(el.fieldSideC, true);
      show(el.fieldSideD, true);
      show(el.fieldSideE, true);
      show(el.fieldSideF, true);
      toggleWallCheckboxVisibility({ A: true, B: true, C: true, D: true, E: true, F: true });
    }

    // zvýraznenie „pri stene“ vizuálne na náčrtoch
    updatePreviewWallHighlights();
  };

  const toggleWallCheckboxVisibility = (map) => {
    // map: {A: true/false, ...}
    el.wallLabels.forEach((lab) => {
      const cb = $("input.wall-side-checkbox", lab);
      const side = cb?.dataset?.side;
      const visible = !!map[side];
      lab.classList.toggle("hidden", !visible);
      if (!visible) {
        cb.checked = false;
        state.wall.delete(side);
      }
    });
  };

  const updatePreviewWallHighlights = () => {
    // všetky preview-side labely (span aj svg text)
    el.previewSideLabels.forEach((node) => {
      const side = node.getAttribute("data-preview-side");
      const atWall = state.wall.has(side);
      node.classList.toggle("at-wall", atWall);
    });
  };

  // ---------------------------
  // Calculations (area + perimeter for profiles)
  // ---------------------------
  const computeAreaPerimeter = () => {
    const A = clampMin0(state.dims.A);
    const B = clampMin0(state.dims.B);
    const C = clampMin0(state.dims.C);
    const D = clampMin0(state.dims.D);
    const E = clampMin0(state.dims.E);
    const F = clampMin0(state.dims.F);

    let area = null;
    let per = null;

    if (state.shape === "square") {
      if (A && A > 0) {
        area = A * A;
        per = 4 * A;
      }
    } else if (state.shape === "rectangle") {
      const a = A && A > 0 ? A : null;
      const b = B && B > 0 ? B : null;
      if (a && b) {
        area = a * b;
        per = 2 * (a + b);
      }
    } else if (state.shape === "l-shape") {
      // L-tvar – zatiaľ „prvá verzia“:
      // Aby si vedel pokračovať, rátame:
      // - obvod = súčet A..F
      // - plocha = jednoduchá aproximácia (rozdelíme na 2 obdĺžniky),
      //   ale ak je neisté, necháme plochu prázdnu a stále dovolíme krok 3 po vyplnení strán.
      //
      const all = [A, B, C, D, E, F];
      const okAll = all.every((x) => Number.isFinite(x) && x > 0);
      if (okAll) {
        per = all.reduce((s, x) => s + x, 0);

        // aproximácia: veľký obdĺžnik (A x F) mínus výrez (C x D) – podľa tvojho svg náčrtu
        // Pozn.: nie je to univerzálne, ale aspoň dá číselný základ pre orientačný BOM.
        const approx = A * F - C * D;
        area = approx > 0 ? approx : null;
      } else {
        per = null;
        area = null;
      }
    }

    // odpočítanie strán pri stene z „obvodu pre lišty“
    if (per !== null) {
      let subtract = 0;
      // pri štvorci je len A, ale v UI strana A sa môže týkať viacerých strán – tu to berieme jednoducho:
      // ak je zaškrtnutá A pri stene:
      // - pri štvorci odpočítame A (1 stranu) – je to konzervatívne
      // - pri obdĺžniku odpočítame A alebo B podľa checkboxov (jedna strana)
      // - pri L tvare odpočítame konkrétne zadané strany
      if (state.shape === "square") {
        if (state.wall.has("A") && A) subtract += A;
      } else if (state.shape === "rectangle") {
        if (state.wall.has("A") && A) subtract += A;
        if (state.wall.has("B") && B) subtract += B;
      } else {
        if (state.wall.has("A") && A) subtract += A;
        if (state.wall.has("B") && B) subtract += B;
        if (state.wall.has("C") && C) subtract += C;
        if (state.wall.has("D") && D) subtract += D;
        if (state.wall.has("E") && E) subtract += E;
        if (state.wall.has("F") && F) subtract += F;
      }
      const perProfiles = Math.max(0, per - subtract);
      state.area = area !== null ? round1(area) : null;
      state.perimeterForProfiles = round1(perProfiles);
    } else {
      state.area = null;
      state.perimeterForProfiles = null;
    }
  };

  const updateStep2SummaryUI = () => {
    el.summaryArea.textContent = state.area !== null ? String(state.area).replace(".", ",") : "–";
    el.summaryPerimeter.textContent =
      state.perimeterForProfiles !== null ? String(state.perimeterForProfiles).replace(".", ",") : "–";

    // povolenie krok 3:
    // - square: A > 0
    // - rectangle: A,B > 0
    // - L: všetky A..F > 0 (plochu možno aj nezrátať, ale aspoň obvod)
    const A = clampMin0(state.dims.A);
    const B = clampMin0(state.dims.B);
    const C = clampMin0(state.dims.C);
    const D = clampMin0(state.dims.D);
    const E = clampMin0(state.dims.E);
    const F = clampMin0(state.dims.F);

    let ok = false;
    if (state.shape === "square") ok = !!(A && A > 0);
    if (state.shape === "rectangle") ok = !!(A && A > 0 && B && B > 0);
    if (state.shape === "l-shape") ok = [A, B, C, D, E, F].every((x) => x && x > 0);

    el.goToStep3Btn.disabled = !ok;
  };

  // ---------------------------
  // Step 3: system recommendation + BOM + enabling Step4
  // ---------------------------
  const heightLabel = (v) => {
    if (v === "low") return "Nízka konštrukčná výška (do cca 60 mm)";
    if (v === "medium") return "Stredná konštrukčná výška (cca 60–100 mm)";
    if (v === "high") return "Vysoká konštrukčná výška (cca 100–150+ mm)";
    return "–";
  };

  const drainLabel = (v) => {
    if (v === "edge-free") return "Voda steká cez voľnú hranu";
    if (v === "edge-gutter") return "Voda ide do žľabu pri hrane";
    if (v === "internal-drain") return "Voda odteká do vpustu v podlahe";
    return "–";
  };

  const buildSystem = () => {
    if (!state.height || !state.drain) {
      state.system.title = null;
      state.system.note = null;
      state.system.previewImg = null;
      state.system.previewCaption = null;
      return;
    }

    // Default map (vieš upraviť názvy / obrázky podľa toho, čo máš v public/img)
    // Ak už config_balkony.js nastavuje window.BALKON_SYSTEMS, použijeme ho.
    const map = window.BALKON_SYSTEMS || {
      low: {
        "edge-free": {
          title: "Základná skladba balkóna – nízka výška, voľná hrana",
          note: "Orientačne: DITRA + KERDI-KEBA/Coll + BARA (RT/RW podľa dlažby). Detaily napojenia doplníme v PDF.",
          previewImg: "/img/balkon/low-edge-free.png",
          caption: "Nízka výška – voda steká cez voľnú hranu, orientačný prierez skladby Schlüter® – DITRA."
        },
        "edge-gutter": {
          title: "Základná skladba balkóna – nízka výška, žľab pri hrane",
          note: "Orientačne: DITRA + systémové tesnenia + ukončenie do žľabu. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/low-edge-gutter.png",
          caption: "Nízka výška – odvodnenie do žľabu pri hrane (orientačný prierez)."
        },
        "internal-drain": {
          title: "Základná skladba balkóna – nízka výška, podlahový vpust",
          note: "Orientačne: DITRA + systémové tesnenia + riešenie okolo vpustu. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/low-internal-drain.png",
          caption: "Nízka výška – odvodnenie do vnútorného vpustu (orientačný prierez)."
        }
      },
      medium: {
        "edge-free": {
          title: "Základná skladba balkóna – stredná výška, voľná hrana",
          note: "Orientačne: vyššia skladba so spádom/drenážou podľa detailu. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/medium-edge-free.png",
          caption: "Stredná výška – voľná hrana (orientačný prierez)."
        },
        "edge-gutter": {
          title: "Základná skladba balkóna – stredná výška, žľab pri hrane",
          note: "Orientačne: skladba so spádom + odvodnenie do žľabu. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/medium-edge-gutter.png",
          caption: "Stredná výška – žľab pri hrane (orientačný prierez)."
        },
        "internal-drain": {
          title: "Základná skladba balkóna – stredná výška, podlahový vpust",
          note: "Orientačne: skladba so spádom + riešenie vpustu. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/medium-internal-drain.png",
          caption: "Stredná výška – podlahový vpust (orientačný prierez)."
        }
      },
      high: {
        "edge-free": {
          title: "Základná skladba balkóna – vysoká výška, voľná hrana",
          note: "Orientačne: vysoká skladba so spádom/drenážou. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/high-edge-free.png",
          caption: "Vysoká výška – voľná hrana (orientačný prierez)."
        },
        "edge-gutter": {
          title: "Základná skladba balkóna – vysoká výška, žľab pri hrane",
          note: "Orientačne: vysoká skladba + žľab. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/high-edge-gutter.png",
          caption: "Vysoká výška – žľab pri hrane (orientačný prierez)."
        },
        "internal-drain": {
          title: "Základná skladba balkóna – vysoká výška, podlahový vpust",
          note: "Orientačne: vysoká skladba + riešenie vpustu. Detaily doplníme v PDF.",
          previewImg: "/img/balkon/high-internal-drain.png",
          caption: "Vysoká výška – podlahový vpust (orientačný prierez)."
        }
      }
    };

    const chosen = map?.[state.height]?.[state.drain] || null;
    if (!chosen) {
      state.system.title = "Zatiaľ nevybraná – doplňte výšku a odtok.";
      state.system.note = "Nepodarilo sa načítať mapovanie skladby. Skontrolujte config_balkony.js alebo cesty k obrázkom.";
      state.system.previewImg = "";
      state.system.previewCaption = "";
      return;
    }

    state.system.title = chosen.title;
    state.system.note = chosen.note;
    state.system.previewImg = chosen.previewImg || "";
    state.system.previewCaption = chosen.caption || "";
  };

  const computeBom = () => {
    const area = state.area;
    const per = state.perimeterForProfiles;

    // membrane area = plocha
    state.bom.membraneArea = area !== null ? area : null;

    // profily 2.50m -> kusy = ceil(per / 2.5)
    if (per !== null) {
      state.bom.profilesCount = Math.ceil(per / 2.5);
    } else {
      state.bom.profilesCount = null;
    }

    // lepidlo - orientačne:
    // tvoja PDF strana (napr. DITRA) používa cca 5,2 kg/m², 25kg vrece.
    if (area !== null) {
      const kg = area * 5.2;
      state.bom.adhesiveBags = Math.max(1, Math.ceil(kg / 25));
    } else {
      state.bom.adhesiveBags = null;
    }
  };

  const updateStep3UI = () => {
    // ľavý sumár
    const shapeText =
      state.shape === "square" ? "Štvorec" :
      state.shape === "rectangle" ? "Obdĺžnik / „kosoštvorec“" :
      "L-tvar";

    el.k3Shape.textContent = shapeText;
    el.k3Area.textContent = state.area !== null ? String(state.area).replace(".", ",") : "–";
    el.k3Perimeter.textContent = state.perimeterForProfiles !== null ? String(state.perimeterForProfiles).replace(".", ",") : "–";

    // odporúčanie
    buildSystem();
    computeBom();

    const readySystem = !!(state.system.title && state.height && state.drain);

    el.recommendedName.textContent = readySystem
      ? state.system.title
      : "Zatiaľ nevybraná – zvoľte výšku a odtok vody.";
    el.recommendedNote.textContent = readySystem
      ? state.system.note
      : "Po výbere konštrukčnej výšky a odtoku vody vám zobrazíme „zlatú strednú cestu“ pre vysunutý balkón.";

    // BOM
    const areaText = state.area !== null ? String(state.area).replace(".", ",") : "–";
    const memText = state.bom.membraneArea !== null ? String(state.bom.membraneArea).replace(".", ",") : "–";
    const perText = state.perimeterForProfiles !== null ? String(state.perimeterForProfiles).replace(".", ",") : "–";
    const pcsText = state.bom.profilesCount !== null ? String(state.bom.profilesCount) : "–";
    const bagsText = state.bom.adhesiveBags !== null ? String(state.bom.adhesiveBags) : "–";

    el.bomArea.textContent = areaText;
    el.bomMembraneArea.textContent = memText;
    el.bomPerimeter.textContent = perText;
    el.bomProfilesCount.textContent = pcsText;
    el.bomAdhesiveBags.textContent = bagsText;

    // povoliť krok 4 keď je vybraná výška aj odtok
    el.goToStep4Btn.disabled = !(state.height && state.drain);
  };

  // ---------------------------
  // Step4 UI + enabling buttons
  // ---------------------------
  const updateStep4UI = () => {
    const shapeText =
      state.shape === "square" ? "Štvorec" :
      state.shape === "rectangle" ? "Obdĺžnik / „kosoštvorec“" :
      "L-tvar";

    el.k4Type.textContent = "Vysunutý balkón (konzola)";
    el.k4Shape.textContent = shapeText;
    el.k4Area.textContent = state.area !== null ? String(state.area).replace(".", ",") : "–";
    el.k4Perimeter.textContent = state.perimeterForProfiles !== null ? String(state.perimeterForProfiles).replace(".", ",") : "–";
    el.k4HeightLabel.textContent = heightLabel(state.height);
    el.k4DrainLabel.textContent = drainLabel(state.drain);
    el.k4SystemName.textContent = state.system.title || "–";

    // BOM
    el.k4BomArea.textContent = state.area !== null ? String(state.area).replace(".", ",") : "–";
    el.k4BomMembraneArea.textContent = state.bom.membraneArea !== null ? String(state.bom.membraneArea).replace(".", ",") : "–";
    el.k4BomPerimeter.textContent = state.perimeterForProfiles !== null ? String(state.perimeterForProfiles).replace(".", ",") : "–";
    el.k4BomProfilesCount.textContent = state.bom.profilesCount !== null ? String(state.bom.profilesCount) : "–";
    el.k4BomAdhesiveBags.textContent = state.bom.adhesiveBags !== null ? String(state.bom.adhesiveBags) : "–";

    // preview
    if (state.system.title) el.k4PreviewTitle.textContent = state.system.title;
    if (state.system.previewCaption) el.k4PreviewCaption.textContent = state.system.previewCaption;

    // obrázok: ak je prázdny alebo 404, necháme bez pádu
    if (state.system.previewImg) {
      el.k4PreviewImage.src = state.system.previewImg;
      el.k4PreviewImage.style.display = "block";
    } else {
      el.k4PreviewImage.removeAttribute("src");
      el.k4PreviewImage.style.display = "none";
    }

    // Enable PDF actions:
    // - Download: stačí mať dokončený krok 3 (height + drain) a aspoň perimeter
    const canPdf = !!(state.height && state.drain);

    // Email send: potrebuje cieľový email (URL email alebo input email)
    const targetEmail = getTargetEmailForSending();
    const canEmail = canPdf && isEmail(targetEmail);

    el.btnPdfDownload.disabled = !canPdf;
    el.btnPdfRequestOffer.disabled = !canPdf;
    el.btnPdfToEmail.disabled = !canEmail;
  };

  const getCustomerDisplayName = () => {
    const name = (state.customer.name || "").trim();
    const company = (state.customer.company || "").trim();
    const nick = (state.customer.nickname || "").trim();
    if (name) return name;
    if (company) return company;
    if (nick) return nick;
    return "Zákazník";
  };

  const getTargetEmailForSending = () => {
    // 1) prihlásený email v URL (?email=)
    if (state.customer.loggedEmail && isEmail(state.customer.loggedEmail)) return state.customer.loggedEmail;
    // 2) ručný email v poli
    const inputEmail = (state.customer.email || "").trim();
    if (isEmail(inputEmail)) return inputEmail;
    return "";
  };

  // ---------------------------
  // PDF calls (frontend -> backend)
  // ---------------------------
  const buildPdfPayload = (mode) => {
    // mode: "download" | "email" | "offer"
    const showEmail = !!state.customer.showEmailInPdf;
    const emailForPdf = showEmail ? (state.customer.email || state.customer.loggedEmail || "").trim() : "";

    return {
      mode,
      // zákazník
      customerName: getCustomerDisplayName(),
      customerCompany: (state.customer.company || "").trim(),
      customerEmail: emailForPdf,
      showEmailInPdf: showEmail,

      // identita (na backend môžeš použiť pre audit/log)
      loggedEmail: (state.customer.loggedEmail || "").trim(),

      // kalkulačka dáta
      constructionType: "Vysunutý balkón (konzola)",
      shape: state.shape,
      dims: { ...state.dims },
      wallSides: Array.from(state.wall),
      area: state.area,
      perimeterForProfiles: state.perimeterForProfiles,

      height: state.height,
      heightLabel: heightLabel(state.height),
      drain: state.drain,
      drainLabel: drainLabel(state.drain),

      systemTitle: state.system.title,
      systemNote: state.system.note,

      bom: { ...state.bom },

      tileThicknessMm: state.tileThicknessMm || 15
    };
  };

  const setBusyButtons = (busy, text) => {
    const set = (btn, on) => {
      if (!btn) return;
      btn.disabled = on ? true : btn.disabled;
      btn.dataset._oldText = btn.dataset._oldText || btn.textContent;
      if (on && text) btn.textContent = text;
      if (!on && btn.dataset._oldText) btn.textContent = btn.dataset._oldText;
    };
    set(el.btnPdfDownload, busy);
    set(el.btnPdfToEmail, busy);
    set(el.btnPdfRequestOffer, busy);
  };

  const tryDownloadPdf = async () => {
    setBusyButtons(true, "⏳ Generujem PDF…");
    try {
      const payload = buildPdfPayload("download");

      // Skúšame najprv „preferované“ endpointy, potom fallback.
      const candidates = [
        { path: "/api/pdf/balkon", expects: "blob" },
        { path: "/api/pdf/balkony", expects: "blob" },
        { path: "/api/pdf/balcony", expects: "blob" },
        { path: "/api/pdf/test-mail", expects: "json" } // fallback (ak máš len test endpoint)
      ];

      let res = null;
      let used = null;
      for (const c of candidates) {
        res = await apiFetch(c.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res && res.ok) {
          used = c;
          break;
        }
      }

      if (!res || !res.ok) {
        const err = await safeJson(res);
        alert(`PDF sa nepodarilo vygenerovať. ${err?.error || ""}`.trim());
        return;
      }

      // blob download (ak endpoint vracia PDF)
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "technicky-podklad-balkon.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      // json (fallback)
      const data = await safeJson(res);
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        return;
      }

      // ak nič, aspoň oznámime
      alert("PDF bolo vygenerované, ale server nevrátil súbor ani downloadUrl.");
    } catch (e) {
      console.error(e);
      alert("Chyba pri generovaní PDF.");
    } finally {
      setBusyButtons(false);
      updateStep4UI();
    }
  };

  const trySendPdfToEmail = async () => {
    const targetEmail = getTargetEmailForSending();
    if (!isEmail(targetEmail)) {
      alert("Zadajte e-mail (alebo otvorte kalkulačku s ?email=...).");
      return;
    }

    setBusyButtons(true, "⏳ Posielam PDF…");
    try {
      const payload = buildPdfPayload("email");
      payload.targetEmail = targetEmail;

      const candidates = [
        "/api/pdf/balkon-email",
        "/api/pdf/balkony-email",
        "/api/pdf/balcony-email",
        "/api/pdf/send-balkon",
        "/api/pdf/test-mail" // fallback
      ];

      let res = null;
      for (const path of candidates) {
        res = await apiFetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res && res.ok) break;
      }

      if (!res || !res.ok) {
        const err = await safeJson(res);
        alert(`Nepodarilo sa poslať e-mail. ${err?.error || ""}`.trim());
        return;
      }

      alert(`PDF bolo odoslané na: ${targetEmail}`);
    } catch (e) {
      console.error(e);
      alert("Chyba pri odosielaní e-mailu.");
    } finally {
      setBusyButtons(false);
      updateStep4UI();
    }
  };

  const tryRequestOffer = async () => {
    // zatiaľ len placeholder – backend si dopojíš neskôr
    alert("Žiadosť o ponuku: zatiaľ len UI (ďalší krok vývoja).");
  };

  // ---------------------------
  // Events wiring
  // ---------------------------
  const bindStep2 = () => {
    // shape click
    el.shapeCards.forEach((card) => {
      card.addEventListener("click", () => {
        state.shape = card.dataset.shape;
        // reset wall selection (aby nevznikali skryté zvyšky)
        state.wall.clear();
        el.wallCheckboxes.forEach((cb) => (cb.checked = false));
        applyShapeUI();
        computeAreaPerimeter();
        updateStep2SummaryUI();
      });
    });

    // dim inputs
    const bindDim = (input, key) => {
      input.addEventListener("input", () => {
        state.dims[key] = toNum(input.value);
        computeAreaPerimeter();
        updateStep2SummaryUI();
      });
    };

    bindDim(el.sideA, "A");
    bindDim(el.sideB, "B");
    bindDim(el.sideC, "C");
    bindDim(el.sideD, "D");
    bindDim(el.sideE, "E");
    bindDim(el.sideF, "F");

    // wall checkboxes
    el.wallCheckboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        const side = cb.dataset.side;
        if (cb.checked) state.wall.add(side);
        else state.wall.delete(side);
        updatePreviewWallHighlights();
        computeAreaPerimeter();
        updateStep2SummaryUI();
      });
    });

    // navigation
    el.goToStep3Btn.addEventListener("click", () => {
      // naplni step3 sumár
      updateStep3UI();
      setActiveStep("step3");
    });

    el.backToStep1Btn.addEventListener("click", () => {
      // v tvojej appke môže byť krok 1 inde – držíme fallback:
      // 1) ak je v URL ref, vráť sa
      // 2) inak history back
      window.history.back();
    });

    el.backBtn?.addEventListener("click", () => window.history.back());
  };

  const bindStep3 = () => {
    // height radios
    el.heightRadios.forEach((r) => {
      r.addEventListener("change", () => {
        state.height = r.checked ? r.value : state.height;
        updateStep3UI();
      });
    });

    // drain options
    el.drainOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.drainOption;
        state.drain = v;

        el.drainOptions.forEach((b) => b.classList.toggle("selected", b === btn));
        updateStep3UI();
      });
    });

    el.backToStep2Btn.addEventListener("click", () => setActiveStep("step2"));

    el.goToStep4Btn.addEventListener("click", () => {
      updateStep4UI();
      setActiveStep("step4");
    });
  };

  const bindStep4 = () => {
    // pdf fields
    el.pdfCustomerName.addEventListener("input", () => {
      state.customer.name = el.pdfCustomerName.value || "";
      updateStep4UI();
    });

    el.pdfCustomerCompany.addEventListener("input", () => {
      state.customer.company = el.pdfCustomerCompany.value || "";
      updateStep4UI();
    });

    el.pdfCustomerEmail.addEventListener("input", () => {
      state.customer.email = el.pdfCustomerEmail.value || "";
      updateStep4UI();
    });

    el.pdfShowEmail.addEventListener("change", () => {
      state.customer.showEmailInPdf = !!el.pdfShowEmail.checked;
      updateStep4UI();
    });

    // buttons
    el.btnPdfDownload.addEventListener("click", tryDownloadPdf);
    el.btnPdfToEmail.addEventListener("click", trySendPdfToEmail);
    el.btnPdfRequestOffer.addEventListener("click", tryRequestOffer);

    // modal close handlers (preview modal – ak sa neskôr použije)
    el.previewCloseBtn?.addEventListener("click", () => el.previewModal.classList.remove("visible"));
    el.previewBackdrop?.addEventListener("click", () => el.previewModal.classList.remove("visible"));

    // tile modal handlers (zatiaľ nepoužité, ale nech je pripravené)
    el.tileCloseBtn?.addEventListener("click", () => el.tileModal.classList.remove("visible"));
    el.tileConfirmBtn?.addEventListener("click", () => {
      const v = toNum(el.tileThicknessInput.value);
      if (v && v >= 5 && v <= 50) {
        state.tileThicknessMm = Math.round(v);
        el.tileModal.classList.remove("visible");
      } else {
        alert("Zadajte hrúbku dlažby v rozsahu 5–50 mm.");
      }
    });
  };

  // ---------------------------
  // “Logged-in” prefill (bez local/session storage)
  // ---------------------------
  const initUserIdentity = async () => {
    const urlEmail = getUrlEmail();
    state.customer.loggedEmail = urlEmail;

    // user chip (vizuálne)
    if (el.userChip) {
      el.userChip.textContent = `Prihlásený: ${urlEmail ? urlEmail : "–"}`;
    }

    // keď je prihlásený cez URL, umožníme posielanie PDF aj bez checkboxu a bez vypĺňania emailu v poli
    // (checkbox rieši iba "zobraziť email v PDF", nie kam poslať)
    if (urlEmail) {
      // predvyplniť email input (len ako hint, stále rešpektujeme "nezobrazovať automaticky")
      // nechávame prázdne pole, aby si email nevypísal bez vedomého kroku užívateľa.
      // Ak chceš opačne, stačí odkomentovať:
      // el.pdfCustomerEmail.value = urlEmail; state.customer.email = urlEmail;

      // jemný hint že vieme meno dotiahnuť (ak máš endpoint)
      // Skúsime získať profil – ak nevyjde, nič sa nedeje.
      try {
        // 1) preferovaný query endpoint
        let res = await apiFetch(`/api/users/by-email?email=${encodeURIComponent(urlEmail)}`);
        if (!res.ok) {
          // 2) fallback path endpoint
          res = await apiFetch(`/api/users/by-email/${encodeURIComponent(urlEmail)}`);
        }

        if (res.ok) {
          const data = await safeJson(res);
          // očakávané polia: name / nickname / company / note...
          const nick = (data?.name || data?.nickname || "").trim();
          const company = (data?.company || data?.firma || "").trim();

          if (nick) {
            state.customer.nickname = nick;
            // predvyplníme do PDF polí len keď užívateľ nič nenapísal
            if (!el.pdfCustomerName.value.trim() && !el.pdfCustomerCompany.value.trim()) {
              el.pdfCustomerName.value = nick;
              state.customer.name = nick;
              el.pdfAutoNameInfo.style.display = "block";
              el.pdfAutoNameText.textContent = nick;
            }
          }
          if (company && !el.pdfCustomerCompany.value.trim()) {
            el.pdfCustomerCompany.value = company;
            state.customer.company = company;
          }
        }
      } catch (e) {
        // ticho – endpoint možno ešte neexistuje
        console.debug("Prefill profile skipped:", e);
      }
    }
  };

  // ---------------------------
  // Init
  // ---------------------------
  const init = async () => {
    // základné UI
    applyShapeUI();
    computeAreaPerimeter();
    updateStep2SummaryUI();

    bindStep2();
    bindStep3();
    bindStep4();

    await initUserIdentity();

    // pri prvom načítaní udržuj správny stav tlačidiel v kroku 4, aj keď tam ešte nie sme
    updateStep4UI();
  };

  // Run
  document.addEventListener("DOMContentLoaded", init);
})();
