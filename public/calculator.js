// public/calculator.js

document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".step"));
  const dots = Array.from(document.querySelectorAll(".step-dot"));
  const shapeButtons = Array.from(
    document.querySelectorAll(".shape-btn[data-shape]")
  );

  // --- ELEMENTY KROKU 1 (profil, výška, farba) ---
  const profileHeightSelect = document.getElementById("profileHeight");
  const profileColorSelect = document.getElementById("profileColor");
  const profileMetaText = document.getElementById("profileMetaText");

  const colorPreview = document.getElementById("colorPreview");
  const colorSwatch = document.getElementById("colorSwatch");
  const colorPreviewLabel = document.getElementById("colorPreviewLabel");

  const step1NextBtn = document.getElementById("step1Next");

  // --- ELEMENTY KROKU 2 ---
  const step2BackBtn = document.getElementById("step2Back");
  const step2NextBtn = document.getElementById("step2Next");

  // --- ELEMENTY KROKU 3 ---
  const step3BackBtn = document.getElementById("step3Back");
  const createPdfBtn = document.getElementById("createPdfBtn");

  // --- HLAVIČKA / NAVIGÁCIA ---
  const userChip = document.getElementById("userChip");
  const backBtn = document.getElementById("backBtn");

  // --- OVERLAY NÁHĽADU LIŠTY ---
  const profileThumb = document.getElementById("profileThumb");
  const profilePreviewOverlay = document.getElementById(
    "profilePreviewOverlay"
  );
  const profilePreviewBackdrop = document.getElementById(
    "profilePreviewBackdrop"
  );
  const profilePreviewClose = document.getElementById("profilePreviewClose");

  // --- SUMMARY ELEMENTY ---
  const summaryProfile = document.getElementById("summaryProfile");
  const summaryRoom = document.getElementById("summaryRoom");
  const summaryMeters = document.getElementById("summaryMeters");
  const summaryPieces = document.getElementById("summaryPieces");
  const summaryComponents = document.getElementById("summaryComponents");
  const summaryComponentsDetail = document.getElementById(
    "summaryComponentsDetail"
  );
  const summaryDoorSplit = document.getElementById("summaryDoorSplit");
  const doorSplitRow = document.getElementById("doorSplitRow");

  // Polia pre izbu / dvere
  const roomNameInput = document.getElementById("roomName");
  const roomWidthInput = document.getElementById("roomWidth");
  const roomLengthInput = document.getElementById("roomLength");
  const doorSideInput = document.getElementById("doorSide");
  const doorWidthInput = document.getElementById("doorWidth");
  const doorBeforeInput = document.getElementById("doorBefore");
  const wastePercentInput = document.getElementById("wastePercent");
  const profileLengthInput = document.getElementById("profileLength");

  // --- KONŠTANTY PROFILU ---
  const PROFILE_BASE = {
    id: "metal-line-90",
    name: "Metal Line 90",
    lengthM: 2.0,
  };

  let currentStep = 1;
  let currentShape = "rectangle";
  let userEmail = "";

  // aktuálne zvolený typ (rodina) lišty
  let currentFamilyId = "metal-line-90";
  let familyLabels = {}; // { familyId: "Metal Line 90" }

  // aktuálne zvolená varianta (výška + farba)
  let selectedHeightCm = null;
  let selectedVariant = null;

  // Normalizované profily z calculator-profiles.js
  let allProfiles = [];
  let ml90Profiles = []; // v skutočnosti profily podľa currentFamilyId
  let profileByKey = {};

  // ============================================================
  //  POMOCNÉ FUNKCIE
  // ============================================================

  function showStep(stepNumber) {
    currentStep = stepNumber;

    steps.forEach((stepEl, index) => {
      stepEl.classList.toggle("step-active", index === stepNumber - 1);
    });

    dots.forEach((dot, index) => {
      dot.classList.remove("active", "done");
      if (index < stepNumber - 1) dot.classList.add("done");
      else if (index === stepNumber - 1) dot.classList.add("active");
    });
  }

  function toNumber(value) {
    if (typeof value !== "string") return 0;
    const normalized = value.replace(",", ".").trim();
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  // určí farbu štvorčeka podľa názvu/badge, ak nie je explicitný hex
  function getColorHexForVariant(variant) {
    if (variant.colorHex) return variant.colorHex;

    const name = (variant.colorName || "").toLowerCase();
    const badge = (variant.badgeKey || "").toLowerCase();

    // biele odtiene
    if (name.includes("biela") || name.includes("biely")) {
      if (name.includes("stone")) return "#e5e7eb"; // drsnejšie
      return "#f9fafb"; // čistá biela
    }

    // čierne / antracit
    if (
      name.includes("čierny") ||
      name.includes("antracit") ||
      badge === "anthracite"
    ) {
      return "#111827";
    }

    // zlato – lesklé/brúsené
    if (name.includes("zlato")) {
      if (name.includes("brúsené")) return "#f59e0b"; // trochu matnejšie
      return "#fbbf24"; // žiarivé zlato
    }

    // titán
    if (name.includes("titán") || badge === "titan") {
      if (name.includes("lesklý")) return "#9ca3af";
      return "#6b7280";
    }

    // hliník / eloxované striebro
    if (name.includes("eloxované") || badge === "alu") {
      if (name.includes("lesklé")) return "#d1d5db";
      return "#9ca3af";
    }

    // nerez
    if (name.includes("nerez") || badge === "steel") {
      if (name.includes("brúsená")) return "#9ca3af";
      return "#6b7280";
    }

    // fallback
    return "#e5e7eb";
  }

  // Normalizácia jedného profilu z global PROFILES / ML90_PROFILES
  function normalizeProfile(raw) {
    const heightCm =
      raw.heightCm ?? raw.height ?? raw.vyska ?? raw.height_cm ?? null;

    const colorName =
      raw.colorName ?? raw.color ?? raw.farba ?? raw.name ?? "Farba";

    const profileCode =
      raw.profileCode ??
      raw.codeList ??
      raw.listCode ??
      raw.kodListy ??
      raw.kod ??
      null;

    const innerCornerCode = raw.innerCornerCode ?? null;
    const outerCornerCode = raw.outerCornerCode ?? null;
    const connectorCode = raw.connectorCode ?? null;
    const endCapCode = raw.endCapCode ?? null;

    const colorHex =
      raw.colorHex ?? raw.hex ?? raw.previewColor ?? raw.hexColor ?? null;

    const lengthM = raw.lengthM ?? PROFILE_BASE.lengthM ?? 2.0;

    return {
      id: raw.id ?? null,
      familyId: raw.familyId ?? null,
      familyName: raw.familyName ?? null,
      system: raw.system ?? "components", // "components" | "clips"
      clipsPerBar:
        typeof raw.clipsPerBar === "number" ? raw.clipsPerBar : 0,
      heightCm:
        typeof heightCm === "number"
          ? heightCm
          : toNumber(String(heightCm || "")),
      colorName: String(colorName),
      profileCode,
      codeList: profileCode, // pre meta text
      innerCornerCode,
      outerCornerCode,
      connectorCode,
      endCapCode,
      colorHex,
      lengthM,
      badgeKey: raw.badgeKey ?? raw.badge ?? null,
    };
  }

  function updateProfileBaseName() {
    const label =
      familyLabels[currentFamilyId] || familyLabels["metal-line-90"] || "Metal Line";
    PROFILE_BASE.name = label;
  }

  function refreshProfilesForFamily() {
    if (!allProfiles.length) return;

    if (!currentFamilyId) {
      ml90Profiles = allProfiles.slice();
    } else {
      ml90Profiles = allProfiles.filter(
        (p) => p.familyId === currentFamilyId
      );
    }

    // reset výšky/farby
    selectedHeightCm = null;
    selectedVariant = null;
    hideColorPreview();
    updateProfileBaseName();
    buildHeightOptions();
    updateProfileMetaText();
  }

  function loadProfilesFromGlobal() {
    let rawArray = [];

    if (Array.isArray(window.ML90_PROFILES)) {
      rawArray = window.ML90_PROFILES;
    } else if (Array.isArray(window.PROFILES)) {
      rawArray = window.PROFILES;
    } else if (
      typeof PROFILES !== "undefined" &&
      Array.isArray(PROFILES)
    ) {
      rawArray = PROFILES;
    }

    if (!rawArray.length) {
      if (profileHeightSelect) {
        profileHeightSelect.innerHTML =
          '<option value="">– profily sa nepodarilo načítať –</option>';
        profileHeightSelect.disabled = true;
      }
      if (profileColorSelect) {
        profileColorSelect.innerHTML =
          '<option value="">– profily sa nepodarilo načítať –</option>';
        profileColorSelect.disabled = true;
      }
      console.warn(
        "ML90 profily sa nepodarilo načítať. Skontroluj calculator-profiles.js."
      );
      return;
    }

    allProfiles = rawArray
      .map(normalizeProfile)
      .filter((p) => p.heightCm > 0);

    // vybudujeme mapu rodín (typov)
    familyLabels = {};
    allProfiles.forEach((p) => {
      if (p.familyId && !familyLabels[p.familyId]) {
        familyLabels[p.familyId] = p.familyName || p.familyId;
      }
    });

    // ak currentFamilyId neexistuje, vezmeme prvú
    const familyIds = Object.keys(familyLabels);
    if (!familyIds.includes(currentFamilyId) && familyIds.length) {
      currentFamilyId = familyIds[0];
    }

    updateProfileBaseName();
    refreshProfilesForFamily();
    initFamilySelector();
  }

  function buildHeightOptions() {
    if (!profileHeightSelect) return;

    const heightsSet = new Set();
    ml90Profiles.forEach((p) => {
      heightsSet.add(p.heightCm);
    });

    const heights = Array.from(heightsSet).sort((a, b) => a - b);

    profileHeightSelect.innerHTML =
      '<option value="">– vyber výšku lišty –</option>';

    heights.forEach((h) => {
      const opt = document.createElement("option");
      opt.value = String(h);
      opt.textContent = `${h} cm`;
      profileHeightSelect.appendChild(opt);
    });

    profileHeightSelect.disabled = heights.length === 0;

    if (profileColorSelect) {
      profileColorSelect.innerHTML =
        '<option value="">– najprv zvoľ výšku lišty –</option>';
      profileColorSelect.disabled = true;
    }
  }

  function updateColorOptionsForHeight(heightCm) {
    if (!profileColorSelect) return;

    selectedHeightCm = heightCm || null;
    selectedVariant = null;
    hideColorPreview();

    if (!heightCm) {
      profileColorSelect.innerHTML =
        '<option value="">– vyber farbu –</option>';
      profileColorSelect.disabled = true;
      updateProfileMetaText();
      return;
    }

    const variants = ml90Profiles.filter((p) => p.heightCm === heightCm);

    if (!variants.length) {
      profileColorSelect.innerHTML =
        '<option value="">– pre túto výšku nie sú farby –</option>';
      profileColorSelect.disabled = true;
      updateProfileMetaText();
      return;
    }

    profileColorSelect.disabled = false;
    profileColorSelect.innerHTML =
      '<option value="">– vyber farbu –</option>';

    variants.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p._key;
      opt.textContent = p.colorName;
      profileColorSelect.appendChild(opt);
    });

    updateProfileMetaText();
  }

  function showColorPreview(variant) {
    if (!colorPreview || !colorSwatch || !colorPreviewLabel) return;

    if (!variant) {
      hideColorPreview();
      return;
    }

    colorPreviewLabel.textContent = variant.colorName;

    const hex = getColorHexForVariant(variant);
    colorSwatch.style.background = hex;

    colorPreview.style.display = "inline-flex";
  }

  function hideColorPreview() {
    if (!colorPreview || !colorSwatch || !colorPreviewLabel) return;
    colorPreview.style.display = "none";
    colorPreviewLabel.textContent = "";
    colorSwatch.style.background = "#e5e7eb";
  }

  function updateProfileMetaText() {
    if (!profileMetaText) return;

    let text = `soklová lišta · dĺžka profilu ${String(
      PROFILE_BASE.lengthM
    ).replace(".", ",")} m`;

    if (selectedHeightCm) {
      text = `soklová lišta · výška ${selectedHeightCm} cm · dĺžka profilu ${String(
        PROFILE_BASE.lengthM
      ).replace(".", ",")} m`;
    }

    if (selectedVariant) {
      text += ` · ${selectedVariant.colorName}`;
      if (selectedVariant.codeList) {
        text += ` · kód lišty ${selectedVariant.codeList}`;
      }
    }

    profileMetaText.textContent = text;
  }

  function calculateAndFillSummary() {
    const roomName =
      (roomNameInput && roomNameInput.value.trim()) || "Miestnosť";
    const width = toNumber(roomWidthInput?.value || "");
    let length = toNumber(roomLengthInput?.value || "");

    const doorSide = (doorSideInput?.value || "").toUpperCase();
    const doorWidth = toNumber(doorWidthInput?.value || "");
    const doorBefore = toNumber(doorBeforeInput?.value || "");

    const wastePercent = toNumber(wastePercentInput?.value || "");
    const profileLength = PROFILE_BASE.lengthM || 1.0;

    if (currentShape === "square") {
      length = length > 0 ? length : width;
    }

    let perimeter = 0;
    if (width > 0 && length > 0) {
      perimeter = currentShape === "square" ? 4 * width : 2 * (width + length);
    }

    let wallTotalForDoor = 0;
    if (doorSide === "A") wallTotalForDoor = width;
    else if (doorSide === "B") wallTotalForDoor = length;

    let doorExists = false;
    let doorAfter = 0;

    if (wallTotalForDoor > 0 && doorWidth > 0) {
      const rawAfter = wallTotalForDoor - doorBefore - doorWidth;
      doorAfter = rawAfter > 0 ? rawAfter : 0;
      doorExists = true;
    }

    const doorsTotalLength = doorExists ? doorWidth : 0;

    let baseLength = perimeter - doorsTotalLength;
    if (baseLength < 0) baseLength = 0;

    const metersWithWaste = baseLength * (1 + wastePercent / 100);

    const piecesExact = metersWithWaste / profileLength;
    const pieces = Math.ceil(piecesExact || 0);

    const internalCorners = perimeter > 0 ? 4 : 0;
    const endCaps = doorExists ? 2 : 0;
    const totalJoins = pieces > 0 ? Math.max(pieces - 1, 0) : 0;
    let connectors = totalJoins - internalCorners - endCaps;
    if (connectors < 0) connectors = 0;

    const componentsTotal = internalCorners + endCaps + connectors;

    let profileLabel = PROFILE_BASE.name;
    if (selectedHeightCm) {
      profileLabel += ` · výška ${selectedHeightCm} cm`;
    }
    profileLabel += ` · dĺžka profilu ${String(PROFILE_BASE.lengthM).replace(
      ".",
      ","
    )} m`;

    if (selectedVariant) {
      profileLabel += ` · ${selectedVariant.colorName}`;
      if (selectedVariant.codeList) {
        profileLabel += ` · kód lišty ${selectedVariant.codeList}`;
      }
    }

    const metersText = metersWithWaste.toFixed(2).replace(".", ",");

    if (summaryProfile) summaryProfile.textContent = profileLabel;
    if (summaryRoom) summaryRoom.textContent = roomName;
    if (summaryMeters) summaryMeters.textContent = `${metersText} m`;
    if (summaryPieces)
      summaryPieces.textContent = pieces > 0 ? `${pieces} ks` : "– ks";

    if (doorExists && doorSplitRow && summaryDoorSplit) {
      const beforeText = doorBefore.toFixed(2).replace(".", ",");
      const widthText = doorWidth.toFixed(2).replace(".", ",");
      const afterText = doorAfter.toFixed(2).replace(".", ",");
      const wallLabel = doorSide === "A" ? "Stena A" : "Stena B";
      summaryDoorSplit.textContent = `${wallLabel}: ${beforeText} m | dvere ${widthText} m | ${afterText} m`;
      doorSplitRow.style.display = "";
    } else if (doorSplitRow && summaryDoorSplit) {
      summaryDoorSplit.textContent = "—";
      doorSplitRow.style.display = "none";
    }

    if (summaryComponents) {
      summaryComponents.textContent =
        componentsTotal > 0 ? `${componentsTotal} ks` : "– ks";
    }

    if (summaryComponentsDetail) {
      if (componentsTotal > 0) {
        summaryComponentsDetail.textContent = `Rozpis (orientačne): vnútorné rohy ${internalCorners} ks, spojky ${connectors} ks, koncovky pri dverách ${endCaps} ks.`;
      } else {
        summaryComponentsDetail.textContent =
          "Po zadaní rozmerov izby a dverí doplníme aj odhad komponentov.";
      }
    }
  }

  // vytvorí objekt s podkladmi pre PDF
  function buildPdfPayload() {
    const roomName =
      (roomNameInput && roomNameInput.value.trim()) || "Miestnosť";
    const width = toNumber(roomWidthInput?.value || "");
    let length = toNumber(roomLengthInput?.value || "");

    const doorSide = (doorSideInput?.value || "").toUpperCase();
    const doorWidth = toNumber(doorWidthInput?.value || "");
    const doorBefore = toNumber(doorBeforeInput?.value || "");

    const wastePercent = toNumber(wastePercentInput?.value || "");
    const profileLength = PROFILE_BASE.lengthM || 1.0;

    if (currentShape === "square") {
      length = length > 0 ? length : width;
    }

    let perimeter = 0;
    if (width > 0 && length > 0) {
      perimeter = currentShape === "square" ? 4 * width : 2 * (width + length);
    }

    let wallTotalForDoor = 0;
    if (doorSide === "A") wallTotalForDoor = width;
    else if (doorSide === "B") wallTotalForDoor = length;

    let doorExists = false;
    let doorAfter = 0;

    if (wallTotalForDoor > 0 && doorWidth > 0) {
      const rawAfter = wallTotalForDoor - doorBefore - doorWidth;
      doorAfter = rawAfter > 0 ? rawAfter : 0;
      doorExists = true;
    }

    const doorsTotalLength = doorExists ? doorWidth : 0;

    let baseLength = perimeter - doorsTotalLength;
    if (baseLength < 0) baseLength = 0;

    const metersWithWaste = baseLength * (1 + wastePercent / 100);

    const piecesExact = metersWithWaste / profileLength;
    const pieces = Math.ceil(piecesExact || 0);

    const internalCorners = perimeter > 0 ? 4 : 0;
    const endCaps = doorExists ? 2 : 0;
    const totalJoins = pieces > 0 ? Math.max(pieces - 1, 0) : 0;
    let connectors = totalJoins - internalCorners - endCaps;
    if (connectors < 0) connectors = 0;

    const componentsTotal = internalCorners + endCaps + connectors;

    const variant = selectedVariant || null;

    // výpočet klipov pre klipové systémy (92/93)
    let clipsPerBar = 0;
    let totalClips = 0;
    let system = "components";

    if (variant && variant.system === "clips") {
      system = "clips";
      clipsPerBar =
        typeof variant.clipsPerBar === "number" &&
        variant.clipsPerBar > 0
          ? variant.clipsPerBar
          : 0;
      if (clipsPerBar > 0 && pieces > 0) {
        totalClips = pieces * clipsPerBar;
      }
    }

    const payload = {
      lang: "sk", // zatiaľ natvrdo, neskôr prepojíme na jazykový prepínač
      profile: {
        familyId: variant?.familyId ?? PROFILE_BASE.id,
        familyName:
          variant?.familyName ?? familyLabels[currentFamilyId] ?? PROFILE_BASE.name,
        system,
        heightCm: selectedHeightCm,
        colorName: variant?.colorName ?? null,
        profileCode: variant?.profileCode ?? variant?.codeList ?? null,
        innerCornerCode: variant?.innerCornerCode ?? null,
        outerCornerCode: variant?.outerCornerCode ?? null,
        connectorCode: variant?.connectorCode ?? null,
        endCapCode: variant?.endCapCode ?? null,
        clipsPerBar,
        lengthM: PROFILE_BASE.lengthM,
      },
      room: {
        name: roomName,
        shape: currentShape,
        width,
        length,
        doorSide,
        doorWidth,
        doorBefore,
      },
      wastePercent,
      result: {
        perimeter,
        doorsTotalLength,
        baseLength,
        metersWithWaste,
        pieces,
        internalCorners,
        connectors,
        endCaps,
        componentsTotal,
        clips: totalClips,
      },
    };

    return payload;
  }

  function prefillEmailFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get("email");
      if (email) {
        const emailInput = document.getElementById("customerEmail");
        if (emailInput && !emailInput.value) {
          emailInput.value = email;
        }
      }
      return email || "";
    } catch (e) {
      console.warn("Nepodarilo sa načítať e-mail z URL.", e);
      return "";
    }
  }

  function initHeader() {
    if (userChip) {
      userChip.textContent = userEmail
        ? `Prihlásený: ${userEmail}`
        : "Prihlásený:";
    }

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        const url = userEmail
          ? `entertainment.html?email=${encodeURIComponent(userEmail)}`
          : "entertainment.html";
        window.location.href = url;
      });
    }
  }

  function initShapeSwitch() {
    if (!shapeButtons.length) return;

    shapeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const shape = btn.getAttribute("data-shape") || "rectangle";
        currentShape = shape;

        shapeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const lengthInput = document.getElementById("roomLength");
        if (shape === "square" && lengthInput) {
          lengthInput.placeholder = "rovnaká ako stena A";
        } else if (lengthInput) {
          lengthInput.placeholder = "napr. 3,8";
        }
      });
    });
  }

  function initProfileBasics() {
    if (profileLengthInput) {
      profileLengthInput.value = String(PROFILE_BASE.lengthM).replace(".", ",");
    }

    if (profileHeightSelect) {
      profileHeightSelect.addEventListener("change", (e) => {
        const value = e.target.value;
        const height = toNumber(value);
        if (height > 0) {
          updateColorOptionsForHeight(height);
        } else {
          updateColorOptionsForHeight(null);
        }
      });
    }

    if (profileColorSelect) {
      profileColorSelect.addEventListener("change", (e) => {
        const key = e.target.value;
        if (key && profileByKey[key]) {
          selectedVariant = profileByKey[key];
          showColorPreview(selectedVariant);
        } else {
          selectedVariant = null;
          hideColorPreview();
        }
        updateProfileMetaText();
      });
    }
  }

  function initProfilePreviewOverlay() {
    if (!profileThumb || !profilePreviewOverlay) return;

    function openOverlay() {
      profilePreviewOverlay.classList.add("is-open");
      profilePreviewOverlay.setAttribute("aria-hidden", "false");
    }

    function closeOverlay() {
      profilePreviewOverlay.classList.remove("is-open");
      profilePreviewOverlay.setAttribute("aria-hidden", "true");
    }

    profileThumb.addEventListener("click", openOverlay);

    if (profilePreviewBackdrop) {
      profilePreviewBackdrop.addEventListener("click", closeOverlay);
    }
    if (profilePreviewClose) {
      profilePreviewClose.addEventListener("click", closeOverlay);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeOverlay();
      }
    });
  }

  function initFamilySelector() {
    if (!profileHeightSelect) return;
    const familyIds = Object.keys(familyLabels);
    if (!familyIds.length) return;

    // snažíme sa nájsť "skupinu" okolo selectu výšky
    const heightGroup =
      profileHeightSelect.closest(".form-group") ||
      profileHeightSelect.parentElement;
    if (!heightGroup || !heightGroup.parentElement) return;

    const container = heightGroup.parentElement;

    const wrapper = document.createElement("div");
    wrapper.className = heightGroup.className || "";
    wrapper.style.marginBottom = "0.75rem";

    const label = document.createElement("label");
    label.textContent = "Typ soklovej lišty";

    const select = document.createElement("select");
    select.id = "profileFamilySelect";
    select.className = profileHeightSelect.className || "";
    select.style.marginTop = "0.25rem";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "– vyber typ lišty –";
    select.appendChild(defaultOption);

    familyIds.forEach((fid) => {
      const opt = document.createElement("option");
      opt.value = fid;
      opt.textContent = familyLabels[fid];
      select.appendChild(opt);
    });

    select.value = currentFamilyId || "";

    select.addEventListener("change", (e) => {
      const fid = e.target.value || currentFamilyId;
      currentFamilyId = fid;
      refreshProfilesForFamily();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    container.insertBefore(wrapper, heightGroup);
  }

  function initStepButtons() {
    if (step1NextBtn) {
      step1NextBtn.addEventListener("click", () => {
        showStep(2);
      });
    }

    if (step2BackBtn) {
      step2BackBtn.addEventListener("click", () => {
        showStep(1);
      });
    }

    if (step2NextBtn) {
      step2NextBtn.addEventListener("click", () => {
        calculateAndFillSummary();
        showStep(3);
      });
    }

    if (step3BackBtn) {
      step3BackBtn.addEventListener("click", () => {
        showStep(2);
      });
    }

    if (createPdfBtn) {
      createPdfBtn.addEventListener("click", () => {
        const payload = buildPdfPayload();
        console.log("PDF payload:", payload);

        alert(
          "Test PDF: podklady pre PDF sú pripravené. Otvor F12 → Console, tam ich uvidíš."
        );

        // Tu neskôr spravíme reálny POST na server, napr.:
        // fetch("/api/calculator-pdf", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(payload),
        // });
      });
    }
  }

  // ============================================================
  //  INIT
  // ============================================================

  userEmail = prefillEmailFromUrl();
  initHeader();
  initShapeSwitch();
  initProfileBasics();
  initProfilePreviewOverlay();
  initStepButtons();
  loadProfilesFromGlobal();
  showStep(1);
});
