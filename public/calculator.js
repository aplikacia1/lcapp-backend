// public/calculator.js

document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".step"));
  const dots = Array.from(document.querySelectorAll(".step-dot"));
  const shapeButtons = Array.from(
    document.querySelectorAll(".shape-btn[data-shape]")
  );
  const profileTiles = Array.from(
    document.querySelectorAll(".profile-tile[data-profile-id]")
  );

  // Zatiaľ jeden typ – Metal Line 90, 2 m, výška 6 cm
  const profiles = [
    {
      id: "metal-line-90",
      name: "Metal Line 90",
      lengthM: 2.0,
      heightCm: 6,
    },
  ];

  let currentStep = 1;
  let currentShape = "rectangle";
  let userEmail = "";
  let selectedProfile = profiles[0];

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

  function selectProfileById(profileId) {
    const found =
      profiles.find((p) => p.id === profileId) || profiles[0] || null;
    if (!found) return;

    selectedProfile = found;

    // vizuálne zvýraznenie
    profileTiles.forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.getAttribute("data-profile-id") === selectedProfile.id
      );
    });

    // nastav dĺžku profilu do readonly inputu
    const plInput = document.getElementById("profileLength");
    if (plInput) {
      plInput.value = String(selectedProfile.lengthM).replace(".", ",");
    }
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
      (selectedProfile && selectedProfile.lengthM) || 1.0; // Metal Line 90 = 2.0 m

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
    // rohy – klasická izba, 4 vnútorné rohy, ak má zmysel
    const internalCorners = perimeter > 0 ? 4 : 0;

    // koncovky pri dverách – pri jednom otvore 2 ks
    const endCaps = doorExists ? 2 : 0;

    // spoje medzi lištami
    const totalJoins = pieces > 0 ? Math.max(pieces - 1, 0) : 0;
    // každý spoj je buď roh, koncovka alebo spojka
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
      summaryProfile.textContent = `${selectedProfile.name} · výška ${selectedProfile.heightCm} cm · dĺžka profilu ${String(
        selectedProfile.lengthM
      ).replace(".", ",")} m`;
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
    if (!profiles.length) return;
    // predvolene vyberieme prvý profil
    selectProfileById(profiles[0].id);

    profileTiles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-profile-id");
        if (id) selectProfileById(id);
      });
    });
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
        // TU neskôr napojíme reálne generovanie PDF
        alert(
          "PDF výpočet pripravujeme. V ďalšom kroku ho prepojíme s Lištobookom."
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
