// public/js/calculator.js

document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".step"));
  const dots = Array.from(document.querySelectorAll(".step-dot"));

  let currentStep = 1;

  // --- Pomocné funkcie ---

  function showStep(stepNumber) {
    currentStep = stepNumber;

    // prepni viditeľnosť krokov
    steps.forEach((stepEl, index) => {
      if (index === stepNumber - 1) {
        stepEl.classList.add("step-active");
      } else {
        stepEl.classList.remove("step-active");
      }
    });

    // aktualizuj indikátor krokov
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

  function calculateAndFillSummary() {
    const roomNameInput = document.getElementById("roomName");
    const perimeterInput = document.getElementById("perimeter");
    const doorsCountInput = document.getElementById("doorsCount");
    const doorWidthInput = document.getElementById("doorWidth");
    const profileLengthInput = document.getElementById("profileLength");
    const wastePercentInput = document.getElementById("wastePercent");

    const roomName = roomNameInput.value.trim() || "Miestnosť";
    const perimeter = toNumber(perimeterInput.value);
    const doorsCount = toNumber(doorsCountInput.value);
    const doorWidth = toNumber(doorWidthInput.value);
    const profileLength = toNumber(profileLengthInput.value) || 1; // ochrana pred delením nulou
    const wastePercent = toNumber(wastePercentInput.value);

    // dĺžka zaberaná dverami
    const doorsTotalLength = doorsCount * doorWidth;

    // čistá dĺžka na lišty (bez dverí)
    let baseLength = perimeter - doorsTotalLength;
    if (baseLength < 0) baseLength = 0;

    // pripočítame rezervu / odpad
    const metersWithWaste = baseLength * (1 + wastePercent / 100);

    // počet kusov líšt (zaokrúhlené nahor)
    const piecesExact = metersWithWaste / profileLength;
    const pieces = Math.ceil(piecesExact || 0);

    // vyplnenie zhrnutia
    const summaryRoom = document.getElementById("summaryRoom");
    const summaryMeters = document.getElementById("summaryMeters");
    const summaryPieces = document.getElementById("summaryPieces");

    // použijeme formát s čiarkou
    const metersText = metersWithWaste.toFixed(2).replace(".", ",");

    summaryRoom.textContent = roomName;
    summaryMeters.textContent = `${metersText} m`;
    summaryPieces.textContent = pieces > 0 ? `${pieces} ks` : "– ks";
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
    } catch (e) {
      console.warn("Nepodarilo sa načítať e-mail z URL.", e);
    }
  }

  // --- Handlery pre tlačidlá ---

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
        // TU neskôr napojíme reálne generovanie PDF (backend alebo client-side)
        alert(
          "PDF výpočet pripravujeme. V ďalšom kroku ho prepojíme s Lištobookom."
        );
      });
    }
  }

  // predvyplníme e-mail z URL parametra ?email=
  prefillEmailFromUrl();

  // zobrazíme prvý krok (pre istotu)
  showStep(1);
});
