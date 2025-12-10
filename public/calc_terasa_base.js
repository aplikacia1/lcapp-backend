document.addEventListener("DOMContentLoaded", () => {

  // --- EMAIL ---
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const userChip = document.getElementById("userChip");
  if (userChip) userChip.textContent = email ? `Prihlásený: ${email}` : "Prihlásený: –";

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const target = "calc_index.html";
      window.location.href = email
        ? `${target}?email=${encodeURIComponent(email)}`
        : target;
    });
  }

  // --- GLOBAL STATE ---
  const state = {
    currentStep: 1,
    constructionTypeKey: null,
    constructionLabel: null,
    shapeKey: "square",
    dims: {},
    area: null,
    perimeter: null
  };

  // --- UI SECTIONS ---
  const stepSections = [...document.querySelectorAll(".step-section")];

  function showStep(n) {
    state.currentStep = n;
    stepSections.forEach(sec =>
      sec.classList.toggle("active", sec.id === `step${n}`)
    );
    document.getElementById(`step${n}`)?.scrollIntoView({ behavior: "smooth" });
  }

  // --- KROK 1 ---
  const constructionGrid = document.getElementById("constructionGrid");
  const currentTypeLabel = document.getElementById("currentTypeLabel");
  const goToStep2Btn = document.getElementById("goToStep2Btn");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");

  function loadModule(path) {
    const tag = document.getElementById("dynamicModule");
    tag.src = path;
  }

  if (constructionGrid) {
    constructionGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".type-card");
      if (!card) return;

      const type = card.dataset.type;
      const label = card.dataset.label;

      state.constructionTypeKey = type;
      state.constructionLabel = label;

      [...document.querySelectorAll(".type-card")].forEach(c =>
        c.classList.toggle("selected", c === card)
      );

      currentTypeLabel.textContent = label;
      goToStep2Btn.disabled = false;

      // Načítame špeciálny modul podľa typu
      if (type === "balcony-cantilever") {
        loadModule("calc_balkony.js");   // << sem príde nová logika
      }
      if (type === "terrace-ground") {
        loadModule("calc_terasy1.js");
      }
      if (type === "terrace-upper") {
        loadModule("calc_terasy2.js");
      }
      if (type === "winter-garden") {
        loadModule("calc_zimne.js");
      }
    });
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", () => {
      state.constructionTypeKey = null;
      state.constructionLabel = null;

      [...document.querySelectorAll(".type-card")].forEach(c =>
        c.classList.remove("selected")
      );

      currentTypeLabel.textContent = "žiadny";
      goToStep2Btn.disabled = true;

      // Vymažeme dynamický modul
      document.getElementById("dynamicModule").src = "";
      document.getElementById("step3DynamicArea").innerHTML = "";
    });
  }

  if (goToStep2Btn) {
    goToStep2Btn.addEventListener("click", () => showStep(2));
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
  const goToStep3Btn = document.getElementById("goToStep3Btn");
  const backToStep1Btn = document.getElementById("backToStep1Btn");

  const shapeConfigs = {
    square: { label: "Štvorec", sides: ["A"], info: "Všetky strany sú rovnaké." },
    rectangle: { label: "Obdĺžnik", sides: ["A", "B"], info: "Dve rôzne strany." },
    "l-shape": { label: "Tvar L", sides: ["A","B","C","D","E","F"], info: "Vyplňte všetkých 6 strán." }
  };

  function parseVal(v) {
    const num = parseFloat(String(v).replace(",", "."));
    return !isNaN(num) && num > 0 ? num : null;
  }

  function computeAreaPerimeter(shape, d) {
    if (shape === "square" && d.A) {
      return { area: d.A * d.A, perimeter: 4 * d.A };
    }
    if (shape === "rectangle" && d.A && d.B) {
      return { area: d.A * d.B, perimeter: 2 * (d.A + d.B) };
    }
    if (shape === "l-shape") {
      const vals = ["A","B","C","D","E","F"].map(k => d[k]);
      if (vals.every(v => v)) {
        return { area: null, perimeter: vals.reduce((a,b)=>a+b,0) };
      }
    }
    return { area: null, perimeter: null };
  }

  function recompute() {
    const d = {};
    for (const [k,input] of Object.entries(dimInputs)) {
      d[k] = fieldElems[k].classList.contains("hidden") ? null : parseVal(input.value);
    }
    state.dims = d;

    const r = computeAreaPerimeter(state.shapeKey, d);
    state.area = r.area;
    state.perimeter = r.perimeter;

    summaryAreaEl.textContent = r.area ? r.area.toFixed(1) : "–";
    summaryPerimeterEl.textContent = r.perimeter ? r.perimeter.toFixed(1) : "–";

    goToStep3Btn.disabled = r.perimeter == null;
  }

  function setShape(shape) {
    state.shapeKey = shape;
    [...document.querySelectorAll(".shape-card")].forEach(c =>
      c.classList.toggle("selected", c.dataset.shape === shape)
    );
    const cfg = shapeConfigs[shape];
    dimShapeInfo.textContent = cfg.info;

    const active = new Set(cfg.sides);
    for (const [k,f] of Object.entries(fieldElems)) {
      f.classList.toggle("hidden", !active.has(k));
    }

    recompute();
  }

  if (shapeGrid) {
    shapeGrid.addEventListener("click",(e)=>{
      const card = e.target.closest(".shape-card");
      if (!card) return;
      setShape(card.dataset.shape);
    });
  }

  Object.values(dimInputs).forEach(input =>
    ["input","change","blur"].forEach(evt =>
      input?.addEventListener(evt, recompute)
    )
  );

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener("click", () => showStep(1));
  }

  if (goToStep3Btn) {
    goToStep3Btn.addEventListener("click", () => showStep(3));
  }

  // --- INIT ---
  showStep(1);
  setShape("square");

});
