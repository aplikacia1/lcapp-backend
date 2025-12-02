// public/calculator.js

document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".step"));
  const dots = Array.from(document.querySelectorAll(".step-dot"));
  const shapeButtons = Array.from(
    document.querySelectorAll(".shape-btn[data-shape]")
  );

  let currentStep = 1;
  let currentShape = "rectangle";
  let userEmail = "";
  let selectedProfile = null;
  let familyProfiles = [];

  // --- Pomocné funkcie ---

  function showStep(stepNumber) {
    currentStep = stepNumber;

    steps.forEach((stepEl, index) => {
      if (index === stepNumber - 1) {
        stepEl.classList.add("step-active");
      } else {
        stepEl.classList.remove("step-active");
      }
    });

    dots.forEach((dot, index) => {
      dot.classList.remove("active", "done");
      if (index < stepNumber - 1) {
        dot.classList.add("done");
      } else if (index === stepNumber - 1) {
        dot.classList.add("active");
      }
    });
  }

  function toNumber(value) {
    if (typeof value !== "string") return 0;
    const normalized = value.replace(",", ".").trim();
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  function applyBadgeToThumb(key) {
    const thumb = document.getElementById("profileThumb");
    if (!thumb) return;
    const keys = ["alu", "white", "anthracite", "gold", "steel", "titan"];
    keys.forEach((k) => thumb.classList.remove("badge-" + k));
    if (key && keys.includes(key)) {
      thumb.classList.add("badge-" + key);
    }
  }

  function setSelectedProfile(profile) {
    selectedProfile = profile || null;

    const plInput = document.getElementById("profileLength");
    const profileNameEl = document.getElementById("profileName");
    const profileMetaEl = document.getElementById("profileMeta");
    const profileNoteEl = document.getElementById("profileNote");

    if (!selectedProfile) {
      if (plInput) plInput.value = "";
      if (profileNameEl) profileNameEl.textContent = "Metal Line 90";
      if (profileMetaEl)
        profileMetaEl.textContent = "vyber výšku a farbu profilu";
      if (profileNoteEl) profileNoteEl.textContent = "";
      applyBadgeToThumb(null);
      return;
    }

    if (plInput) {
      plInput.value = String(selectedProfile.lengthM).replace(".", ",");
    }

    if (profileNameEl) {
      profileNameEl.textContent = `${selectedProfile.familyName} – ${selectedProfile.heightCm} cm`;
    }

    if (profileMetaEl) {
      profileMetaEl.textContent = `${selectedProfile.colorName} · dĺžka profilu ${String(
        selectedProfile.lengthM
      ).replace(".", ",")} m · kód ${selectedProfile.profileCode}`;
    }

    if (profileNoteEl) {
      profileNoteEl.textContent = selectedProfile.note
        ? `Špecifikácia: ${selectedProfile.note}`
        : "";
    }

    applyBadgeToThumb(selectedProfile.badgeKey || null);
  }

  function calculateAndFillSummary() {
    const roomNameInput = document.getElementById("roomName");
    const roomWidthInput = document.getElementById("roomWidth");
    const roomLengthInput = document.getElementById("roomLength");

    const doorSideInput = document.getElementById("doorSide");
    const doorWidthInput = document.getElementById("doorWidth");
    const doorBeforeInput = document.getElementById("doorBefore");

    const wastePercentInput = document.getElementById("wastePercent");

    const roomName =
      (roomNameInput && roomNameInput.value.trim()) || "Miestnosť";
    const width = toNumber(roomWidthInput?.value || "");
    let length = toNumber(roomLengthInput?.value || "");

    const doorSide = (doorSideInput?.value || "").toUpperCase();
    const doorWidth = toNumber(doorWidthInput?.value || "");
    const doorBefore = toNumber(doorBeforeInput?.value || "");

    const wastePercent = toNumber(wastePercentInput?.value || "");

    const profileLength =
      (selectedProfile && selectedProfile.lengthM) || 1.0;

    // Ak je tvar štvorec a dĺžka nie je zadaná, berieme ju ako rovnakú ako šírku
    if (currentShape === "square") {
      length = length > 0 ? length : width;
    }

    // Obvod miestnosti
    let perimeter = 0;
    if (width > 0 && length > 0) {
      perimeter = currentShape === "square" ? 4 * width : 2 * (width + length);
    }

    // --- Dvere: jedna stena s dverami, rozdelenie pred / za dverami ---

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

    // čistá dĺžka na lišty (bez dverí, min 0)
    let baseLength = perimeter - doorsTotalLength;
    if (baseLength < 0) baseLength = 0;

    // pripočítame rezervu / odpad
    const metersWithWaste = baseLength * (1 + wastePercent / 100);

    // počet kusov líšt podľa zvoleného profilu
    const piecesExact = metersWithWaste / profileLength;
    const pieces = Math.ceil(piecesExact || 0);

    // --- komponenty (orientačne) ---
    const internalCorners = perimeter > 0 ? 4 : 0;
    const endCaps = doorExists ? 2 : 0;

    const totalJoins = pieces > 0 ? Math.max(pieces - 1, 0) : 0;
    let connectors = totalJoins - internalCorners - endCaps;
    if (connectors < 0) connectors = 0;

    const componentsTotal = internalCorners + endCaps + connectors;

    // vyplnenie zhrnutia
    const summaryProfile = document.getElementById("summaryProfile");
    const summaryRoom = document.getElementById("summaryRoom");
    const summaryMeters = document.getElementById("summaryMeters");
    const summaryPieces = document.getElementById("summaryPieces");
    const summaryComponents = document.getElementById("summaryComponents");
    const summaryComponentsDetail = document.getElementById(
      "summaryComponentsDetail"
    );
    const doorSplitRow = document.getElementById("doorSplitRow");
    const summaryDoorSplit = document.getElementById("summaryDoorSplit");

    const metersText = metersWithWaste.toFixed(2).replace(".", ",");

    if (summaryProfile && selectedProfile) {
      summaryProfile.textContent = `${selectedProfile.familyName} · ${selectedProfile.heightCm} cm · ${selectedProfile.colorName} · dĺžka profilu ${String(
        selectedProfile.lengthM
      ).replace(".", ",")} m · kód ${selectedProfile.profileCode}`;
    } else if (summaryProfile) {
      summaryProfile.textContent = "Metal Line 90";
    }

    if (summaryRoom) summaryRoom.textContent = roomName;
    if (summaryMeters) summaryMeters.textContent = `${metersText} m`;
    if (summaryPieces)
      summaryPieces.textContent = pieces > 0 ? `${pieces} ks` : "– ks";

    // Stena s dverami – vizuálny pomer
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

    // predvyplnenie kódu profilu do textového poľa (ak je prázdne)
    const productCodeInput = document.getElementById("productCode");
    if (productCodeInput && !productCodeInput.value && selectedProfile) {
      productCodeInput.value = `${selectedProfile.profileCode} – ${selectedProfile.colorName}`;
    }
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
    const chip = document.getElementById("userChip");
    if (chip) {
      chip.textContent = userEmail
        ? `Prihlásený: ${userEmail}`
        : "Prihlásený:";
    }

    const backBtn = document.getElementById("backBtn");
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

  function initProfiles() {
    const heightSelect = document.getElementById("profileHeight");
    const colorSelect = document.getElementById("profileColor");

    if (!heightSelect || !colorSelect) return;

    if (!Array.isArray(window.PROFILES)) {
      console.warn("PROFILES nie je načítané.");
      heightSelect.innerHTML =
        '<option value="">– profily sa nepodarilo načítať –</option>';
      colorSelect.innerHTML =
        '<option value="">– profily sa nepodarilo načítať –</option>';
      colorSelect.disabled = true;
      return;
    }

    familyProfiles = PROFILES.filter(
      (p) => p.familyId === "metal-line-90"
    );
    if (!familyProfiles.length) {
      heightSelect.innerHTML =
        '<option value="">– profily Metal Line 90 nie sú k dispozícii –</option>';
      colorSelect.innerHTML =
        '<option value="">– bez farieb –</option>';
      colorSelect.disabled = true;
      return;
    }

    const heights = Array.from(
      new Set(
        familyProfiles
          .map((p) => p.heightCm)
          .filter((h) => typeof h === "number" && !Number.isNaN(h))
      )
    ).sort((a, b) => a - b);

    heightSelect.innerHTML =
      '<option value="">– vyber výšku –</option>' +
      heights
        .map((h) => `<option value="${h}">${h} cm</option>`)
        .join("");

    function fillColorsForHeight(height) {
      const candidates = familyProfiles.filter(
        (p) => p.heightCm === height
      );
      if (!candidates.length) {
        colorSelect.innerHTML =
          '<option value="">– žiadne farby pre túto výšku –</option>';
        colorSelect.disabled = true;
        setSelectedProfile(null);
        return [];
      }

      colorSelect.disabled = false;
      colorSelect.innerHTML =
        '<option value="">– vyber farbu –</option>' +
        candidates
          .map(
            (p) =>
              `<option value="${p.profileCode}">${p.colorName}</option>`
          )
          .join("");

      return candidates;
    }

    heightSelect.addEventListener("change", () => {
      const h = parseInt(heightSelect.value, 10);
      if (!h) {
        colorSelect.innerHTML =
          '<option value="">– najprv zvoľ výšku –</option>';
        colorSelect.disabled = true;
        setSelectedProfile(null);
        return;
      }
      const candidates = fillColorsForHeight(h);
      if (candidates.length === 1) {
        colorSelect.value = candidates[0].profileCode;
        setSelectedProfile(candidates[0]);
      } else {
        setSelectedProfile(null);
      }
    });

    colorSelect.addEventListener("change", () => {
      const code = colorSelect.value;
      const profile = familyProfiles.find(
        (p) => p.profileCode === code
      );
      setSelectedProfile(profile || null);
    });

    // Predvolená voľba – najnižšia výška, prvá farba
    if (heights.length) {
      heightSelect.value = String(heights[0]);
      const candidates = fillColorsForHeight(heights[0]);
      if (candidates.length) {
        colorSelect.value = candidates[0].profileCode;
        setSelectedProfile(candidates[0]);
      }
    }
  }

  // --- Handlery pre tlačidlá krokov ---

  // Krok 1 – tlačidlo "Pokračovať"
  const step1 = document.getElementById("step-1");
  if (step1) {
    const nextBtn1 = step1.querySelector(".btn-primary");
    if (nextBtn1) {
      nextBtn1.addEventListener("click", () => {
        showStep(2);
      });
    }
  }

  // Krok 2 – tlačidlá "Späť" a "Pokračovať"
  const step2 = document.getElementById("step-2");
  if (step2) {
    const [backBtn2, nextBtn2] = step2.querySelectorAll(".actions .btn");
    if (backBtn2) {
      backBtn2.addEventListener("click", () => {
        showStep(1);
      });
    }
    if (nextBtn2) {
      nextBtn2.addEventListener("click", () => {
        calculateAndFillSummary();
        showStep(3);
      });
    }
  }

  // Krok 3 – tlačidlá "Späť" a "Vytvoriť PDF"
  const step3 = document.getElementById("step-3");
  if (step3) {
    const [backBtn3, createPdfBtn] = step3.querySelectorAll(".actions .btn");
    if (backBtn3) {
      backBtn3.addEventListener("click", () => {
        showStep(2);
      });
    }
    if (createPdfBtn) {
      createPdfBtn.addEventListener("click", () => {
        // TU neskôr napojíme reálne generovanie PDF a mailer
        alert(
          "PDF výpočet pripravujeme. V ďalšom kroku ho prepojíme s Lištobookom a mailerom."
        );
      });
    }
  }

  // --- INIT ---

  userEmail = prefillEmailFromUrl();
  initHeader();
  initShapeSwitch();
  initProfiles();
  showStep(1);
});
