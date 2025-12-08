// Jednoduchý stav kalkulačky – aby sme vedeli preniesť dáta do ďalších krokov
const TERASA_STATE = {
  constructionType: null,
  constructionLabel: null,
  shape: "square",
  sideA: null,
  sideB: null,
  areaM2: null,
  perimeterM: null,
  drainType: null, // len pre vysunutý balkón
  recommendedSystemKey: null,
};

// Pomoc: formátovanie na 1 desatinné miesto (ak máme číslo)
function fmt1(value) {
  if (typeof value !== "number" || !isFinite(value)) return "–";
  return value.toFixed(1).replace(".", ",");
}

// ==== KROK 1 – výber typu ==========================================
const cards = Array.from(document.querySelectorAll(".type-card"));
const currentTypeLabelEl = document.getElementById("currentTypeLabel");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const goToStep2Btn = document.getElementById("goToStep2Btn");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    TERASA_STATE.constructionType = card.dataset.type || null;
    TERASA_STATE.constructionLabel = card.dataset.label || null;
    currentTypeLabelEl.textContent =
      TERASA_STATE.constructionLabel || "žiadny";
    goToStep2Btn.disabled = !TERASA_STATE.constructionType;
    console.log("Krok 1 – stav:", TERASA_STATE);
  });
});

clearSelectionBtn.addEventListener("click", () => {
  cards.forEach((c) => c.classList.remove("selected"));
  TERASA_STATE.constructionType = null;
  TERASA_STATE.constructionLabel = null;
  currentTypeLabelEl.textContent = "žiadny";
  goToStep2Btn.disabled = true;
  console.log("Krok 1 – vymazané:", TERASA_STATE);
  // Plynulý scroll späť hore
  document.getElementById("step1").scrollIntoView({ behavior: "smooth" });
});

goToStep2Btn.addEventListener("click", () => {
  document.getElementById("step2").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("backToStep1Btn").addEventListener("click", () => {
  document.getElementById("step1").scrollIntoView({ behavior: "smooth" });
});

// ==== KROK 2 – tvar a rozmery =======================================
const shapeCards = Array.from(document.querySelectorAll(".shape-card"));
const dimShapeInfo = document.getElementById("dimShapeInfo");
const sideAInput = document.getElementById("sideA");
const sideBInput = document.getElementById("sideB");
const fieldSideB = document.getElementById("fieldSideB");
const summaryAreaEl = document.getElementById("summaryArea");
const summaryPerimeterEl = document.getElementById("summaryPerimeter");

function updateShapeDescription() {
  if (TERASA_STATE.shape === "square") {
    dimShapeInfo.textContent = "Štvorec – všetky strany A sú rovnaké.";
    fieldSideB.style.opacity = "0.7";
  } else {
    dimShapeInfo.textContent =
      "Obdĺžnik – strana A a strana B môžu mať rôznu dĺžku.";
    fieldSideB.style.opacity = "1";
  }
}

function recalcDimensions() {
  const rawA = sideAInput.value.replace(",", ".");
  const rawB = sideBInput.value.replace(",", ".");
  const a = parseFloat(rawA);
  let b = parseFloat(rawB);

  if (TERASA_STATE.shape === "square") {
    if (!isNaN(a) && (isNaN(b) || b <= 0)) {
      b = a;
    }
  }

  if (isNaN(a) || a <= 0 || isNaN(b) || b <= 0) {
    TERASA_STATE.sideA = null;
    TERASA_STATE.sideB = null;
    TERASA_STATE.areaM2 = null;
    TERASA_STATE.perimeterM = null;
    summaryAreaEl.textContent = "–";
    summaryPerimeterEl.textContent = "–";
    return;
  }

  TERASA_STATE.sideA = a;
  TERASA_STATE.sideB = b;
  TERASA_STATE.areaM2 = a * b;
  TERASA_STATE.perimeterM = 2 * (a + b);

  summaryAreaEl.textContent = fmt1(TERASA_STATE.areaM2);
  summaryPerimeterEl.textContent = fmt1(TERASA_STATE.perimeterM);

  console.log("Krok 2 – rozmery:", TERASA_STATE);
}

shapeCards.forEach((card) => {
  card.addEventListener("click", () => {
    shapeCards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    TERASA_STATE.shape = card.dataset.shape || "square";
    updateShapeDescription();
    recalcDimensions();
  });
});

sideAInput.addEventListener("input", recalcDimensions);
sideBInput.addEventListener("input", recalcDimensions);

updateShapeDescription();

// ==== KROK 3 – skladba systému Schlüter® ============================

// Elementy pre prehľad (ľavý stĺpec)
const step3Section = document.getElementById("step3");
const k3TypeEl = document.getElementById("k3Type");
const k3ShapeEl = document.getElementById("k3Shape");
const k3AreaEl = document.getElementById("k3Area");
const k3PerimeterEl = document.getElementById("k3Perimeter");

// Otázka + výstup (pravý stĺpec)
const balconyQuestionBlock = document.getElementById("balconyQuestion");
const otherConstructionNote = document.getElementById("otherConstructionNote");
const drainButtons = Array.from(
  document.querySelectorAll("[data-drain-option]")
);
const recommendedNameEl = document.getElementById("recommendedName");
const recommendedNoteEl = document.getElementById("recommendedNote");

// Jednoduchá „mapa“ systémov pre vysunutý balkón – pracovné názvy
const BALCONY_SYSTEMS = {
  "edge-free": {
    key: "A2",
    name: "A2 – vysunutý balkón s voľnou odkvapovou hranou",
    note:
      "Univerzálna skladba pre konzolový balkón, kde voda voľne odteká cez hranu. " +
      "Počítame s kompletnou hydroizoláciou Schlüter® a odkvapovým profilom na hrane.",
  },
  "edge-gutter": {
    key: "A3",
    name: "A3 – vysunutý balkón s oplechovanou hranou a žľabom",
    note:
      "„Zlatá stredná cesta“ – skladba pre balkón s oplechovaním a žľabom pri hrane. " +
      "Hydroizolácia Schlüter® je napojená na oplechovanie tak, aby voda bezpečne odtiekla do žľabu.",
  },
  "internal-drain": {
    key: "A5",
    name: "A5 – vysunutý balkón s vpustom v podlahe",
    note:
      "Skladba s vnútorným vpustom (gulička alebo líniový žľab) v ploche balkóna. " +
      "Vhodné pri väčších plochách alebo tam, kde nechcete, aby voda odkvapkávala cez hranu.",
  },
};

function updateStep3Summary() {
  k3TypeEl.textContent = TERASA_STATE.constructionLabel || "nezadané";

  const shapeLabel =
    TERASA_STATE.shape === "square" ? "Štvorec" : "Obdĺžnik / kosoštvorec";
  k3ShapeEl.textContent = shapeLabel;

  k3AreaEl.textContent = fmt1(TERASA_STATE.areaM2);
  k3PerimeterEl.textContent = fmt1(TERASA_STATE.perimeterM);
}

function updateRecommendedSystem() {
  const isBalcony =
    TERASA_STATE.constructionType === "balcony-cantilever";

  if (!isBalcony) {
    TERASA_STATE.drainType = null;
    TERASA_STATE.recommendedSystemKey = null;
    recommendedNameEl.textContent =
      "Zatiaľ nevybraná – pre tento typ pripravujeme vlastné skladby.";
    recommendedNoteEl.textContent =
      "Na základe údajov z krokov 1 a 2 vám technik Lištového centra odporučí konkrétnu skladbu individuálne.";
    return;
  }

  // Ak ešte nie je zvolený spôsob odtoku, berieme „zlatú strednú cestu“ – žľab
  const drainKey =
    TERASA_STATE.drainType || "edge-gutter";
  TERASA_STATE.drainType = drainKey;

  const system = BALCONY_SYSTEMS[drainKey];
  if (!system) {
    recommendedNameEl.textContent =
      "Zatiaľ nevybraná – zvoľte odtok vody.";
    recommendedNoteEl.textContent =
      "Po kliknutí na jednu z možností odtoku vody navrhneme vhodnú skladbu Schlüter® pre váš balkón.";
    return;
  }

  TERASA_STATE.recommendedSystemKey = system.key;
  recommendedNameEl.textContent = system.name;
  recommendedNoteEl.textContent = system.note;
}

// Kliknutie na možnosti odtoku
drainButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.drainOption;
    TERASA_STATE.drainType = value;

    drainButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    updateRecommendedSystem();
    console.log("Krok 3 – odtok vody / systém:", TERASA_STATE);
  });
});

// Prechod z kroku 2 na krok 3
const goToStep3Btn = document.getElementById("goToStep3Btn");
goToStep3Btn.addEventListener("click", () => {
  updateStep3Summary();

  const isBalcony =
    TERASA_STATE.constructionType === "balcony-cantilever";

  // Zobrazenie správneho bloku
  balconyQuestionBlock.style.display = isBalcony ? "block" : "none";
  otherConstructionNote.style.display = isBalcony ? "none" : "block";

  // Reset výberu odtoku pri každom vstupe do kroku 3 (aby to bolo jasné)
  drainButtons.forEach((b) => b.classList.remove("selected"));

  if (isBalcony) {
    // Predvolená „stredná“ možnosť – žľab pri hrane
    TERASA_STATE.drainType = "edge-gutter";
    const defaultBtn = drainButtons.find(
      (b) => b.dataset.drainOption === "edge-gutter"
    );
    if (defaultBtn) {
      defaultBtn.classList.add("selected");
    }
  }

  updateRecommendedSystem();

  step3Section.scrollIntoView({ behavior: "smooth" });

  console.log("Krok 3 – otvorený, stav:", TERASA_STATE);
});

// tlačidlo späť v hlavičke – návrat na dashboard / späť v histórii
document.getElementById("backBtn").addEventListener("click", () => {
  if (history.length > 1) history.back();
});
