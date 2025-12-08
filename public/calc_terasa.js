// public/calc_terasa.js
// Základná logika kalkulačky Schlüter terasa – Krok 1 + Krok 2 (jednoduché tvary)

/*
  DOM OČAKÁVANIA (nič z toho nemusí byť hneď, kód je ošetrený):

  KROK 1 – výber typu konštrukcie
  --------------------------------
  - Každá karta má atribút data-construct-id, napr.:
      data-construct-id="zimna-zahrada"
      data-construct-id="strecha-terasa"
      data-construct-id="terasa-na-zemi"
      data-construct-id="balkon-vysunuty"

    + voliteľne data-construct-label="Prekrytá terasa / zimná záhrada"

  - Pravý info panel:
      [data-construct-selected-label]  – text „Aktuálne zvolený typ: …“
      [data-construct-selected-id]     – interný identifikátor (napr. na Krok 3)

  KROK 2 – výber tvaru a strán
  -----------------------------
  - tlačidlá tvaru:
      [data-shape="rect"]   – štvorec / obdĺžnik
      [data-shape="L"]      – tvar L (pripravujeme)

  - vstupy strán:
      input[data-side="A"]
      input[data-side="B"]
      input[data-side="C"]
      input[data-side="D"]
      (neskôr pre L aj E,F)

  - kto sa dotýka domu:
      select[name="attachedSide"] (hodnoty "A","B","C","D" alebo "")

  - výsledky:
      [data-result="area"]       – plocha v m²
      [data-result="perimeter"]  – obvod pre ukončovacie lišty v bm
*/


// Jednoduchý stav kalkulačky – môžeme ho neskôr rozšíriť o ďalšie kroky.
const calcState = {
  constructId: null,       // napr. "strecha-terasa"
  constructLabel: null,    // napr. "Terasa na poschodí"
  shape: "rect",           // "rect" alebo neskôr "L"
  sides: {
    A: null,
    B: null,
    C: null,
    D: null,
    E: null,
    F: null
  },
  attachedSide: null,      // ktorá strana sa dotýka domu (A–F)
  areaM2: 0,
  perimeterM: 0
};


/* Pomocné funkcie -------------------------------------------------------- */

// pre parsovanie čísla z inputu (podporí aj čiarku)
function parseNumber(value) {
  if (typeof value !== "string") return NaN;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return NaN;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

// zaokrúhlenie na 1 desatinné miesto
function round1(x) {
  const f = Number.isFinite(x) ? x : 0;
  return Math.round(f * 10) / 10;
}


/* KROK 1 – Výber typu konštrukcie ---------------------------------------- */

function initConstructStep() {
  const cards = document.querySelectorAll("[data-construct-id]");
  if (!cards.length) {
    console.debug("[calc_terasa] Nenašiel som žiadne karty s data-construct-id – Krok 1 preskakujem.");
    return;
  }

  const selectedLabelEl = document.querySelector("[data-construct-selected-label]");
  const selectedIdEl = document.querySelector("[data-construct-selected-id]");

  function selectCard(card) {
    cards.forEach(c => c.classList.remove("is-selected"));
    card.classList.add("is-selected");

    const id = card.getAttribute("data-construct-id");
    const label =
      card.getAttribute("data-construct-label") ||
      card.querySelector("[data-construct-title]")?.textContent?.trim() ||
      id;

    calcState.constructId = id;
    calcState.constructLabel = label;

    if (selectedLabelEl) {
      selectedLabelEl.textContent = label || "žiadny";
    }
    if (selectedIdEl) {
      selectedIdEl.textContent = id || "";
    }
  }

  cards.forEach(card => {
    card.addEventListener("click", () => selectCard(card));
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        selectCard(card);
      }
    });
  });

  // Ak už je nejaká karta označená v HTML (trieda is-selected), preberieme ju ako východiskovú
  const preset = Array.from(cards).find(c => c.classList.contains("is-selected"));
  if (preset) {
    selectCard(preset);
  }

  console.debug("[calc_terasa] Krok 1 inicializovaný.");
}


/* KROK 2 – Tvar a rozmery ------------------------------------------------ */

function recalcShape() {
  const { shape, sides, attachedSide } = calcState;

  let area = 0;
  let perimeter = 0;

  if (shape === "rect") {
    // Očakávame A a B – ostatné môžu byť prázdne
    const A = sides.A ?? 0;
    const B = sides.B ?? 0 || sides.A ?? 0; // ak B chýba pri "štvorci", použijeme A

    area = A * B;
    perimeter = 2 * (A + B);

    // Ak máš v budúcnosti špeciálnu logiku pre attachedSide (strana pri dome),
    // vieme ju tu odrátať, príp. upraviť.
    // Zatiaľ perimeter nechávame celý.

  } else if (shape === "L") {
    // Tvar L – nechceme počítať zle, radšej dáme "pripravujeme"
    // Môžeme neskôr doplniť presný vzorec podľa nášho modelu strán.
    console.debug("[calc_terasa] Výpočet pre tvar L ešte nie je implementovaný.");
  }

  calcState.areaM2 = area;
  calcState.perimeterM = perimeter;

  const areaEl = document.querySelector("[data-result='area']");
  const perimeterEl = document.querySelector("[data-result='perimeter']");

  if (areaEl) {
    const v = round1(area);
    areaEl.textContent = v > 0 ? `${v.toLocaleString("sk-SK")} m²` : "–";
  }

  if (perimeterEl) {
    const v = round1(perimeter);
    perimeterEl.textContent = v > 0 ? `${v.toLocaleString("sk-SK")} bm` : "–";
  }
}

function initShapeStep() {
  const shapeButtons = document.querySelectorAll("[data-shape]");
  const sideInputs = document.querySelectorAll("input[data-side]");
  const attachedSelect = document.querySelector("select[name='attachedSide']");

  if (!shapeButtons.length && !sideInputs.length) {
    console.debug("[calc_terasa] Krok 2 ešte nemá priradené prvky – preskakujem inicializáciu.");
    return;
  }

  // výber tvaru (rect / L …)
  function selectShape(shapeId) {
    calcState.shape = shapeId;
    shapeButtons.forEach(btn => {
      btn.classList.toggle("is-active", btn.getAttribute("data-shape") === shapeId);
    });
    recalcShape();
  }

  shapeButtons.forEach(btn => {
    const id = btn.getAttribute("data-shape");
    btn.addEventListener("click", () => selectShape(id));
  });

  // default – ak je v HTML nejaký .is-active, použijeme ho, inak rect
  const presetShapeBtn = Array.from(shapeButtons).find(b => b.classList.contains("is-active"));
  if (presetShapeBtn) {
    calcState.shape = presetShapeBtn.getAttribute("data-shape") || "rect";
  } else if (shapeButtons.length) {
    selectShape(calcState.shape);
  }

  // vstupy strán A–F
  sideInputs.forEach(input => {
    const side = input.getAttribute("data-side"); // "A","B","C","D"...
    if (!side) return;

    input.addEventListener("input", () => {
      const n = parseNumber(input.value);
      calcState.sides[side] = Number.isFinite(n) ? n : null;
      recalcShape();
    });
  });

  // ktorá strana sa dotýka domu
  if (attachedSelect) {
    attachedSelect.addEventListener("change", () => {
      const v = attachedSelect.value || null;
      calcState.attachedSide = v;
      recalcShape();
    });
  }

  console.debug("[calc_terasa] Krok 2 inicializovaný.");
}


/* Spúšťame po načítaní DOM ------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  console.debug("[calc_terasa] Inicializácia kalkulačky terasy…");
  initConstructStep();
  initShapeStep();
  recalcShape();
});
