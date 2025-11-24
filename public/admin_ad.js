// public/admin_ad.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adForm");
  const imageInput = document.getElementById("adImage");
  const targetUrlInput = document.getElementById("targetUrl");
  const isActiveInput = document.getElementById("isActive");
  const statusMsg = document.getElementById("statusMsg");

  // 🔴 PÔVODNE: window.API_BASE_URL || "http://localhost:5000"
  // ✅ NOVÉ: fallback na aktuálnu doménu (funguje na listobook.sk aj na lokále)
  const API_BASE_URL = (
    window.API_BASE_URL ||
    window.location.origin ||
    ""
  ).replace(/\/+$/, "");

  const setStatus = (msg, isError = false) => {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.style.color = isError ? "#ff8080" : "#80ff80";
  };

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file) {
      setStatus("Prosím, vyberte obrázok reklamy.", true);
      return;
    }

    try {
      setStatus("Nahrávam obrázok...");

      // 1️⃣ Najprv nahráme samotný obrázok cez /api/uploads
      const uploadData = new FormData();
      uploadData.append("image", file);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/uploads`, {
        method: "POST",
        body: uploadData,
        credentials: "include",
      });

      if (!uploadResponse.ok) {
        console.error("Upload error status:", uploadResponse.status);
        throw new Error("Nahrávanie obrázka zlyhalo.");
      }

      const uploadResult = await uploadResponse.json().catch(() => ({}));
      console.log("Upload result:", uploadResult);

      // Tu predpokladáme, že uploadRoutes vracia cestu v poli "imageUrl" alebo "filePath"
      const imageUrl = uploadResult.imageUrl || uploadResult.filePath || uploadResult.path;
      if (!imageUrl) {
        throw new Error("Server vrátil neplatnú cestu k obrázku (imageUrl/filePath/path).");
      }

      setStatus("Ukladám reklamu...");

      // 2️⃣ Teraz uložíme reklamu do DB cez /api/ads
      const payload = {
        imageUrl,
        targetUrl: targetUrlInput.value.trim(),
        isActive: isActiveInput.checked,
      };

      const adResponse = await fetch(`${API_BASE_URL}/api/ads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const adResult = await adResponse.json().catch(() => ({}));
      console.log("Ad save response:", adResponse.status, adResult);

      if (!adResponse.ok) {
        throw new Error(adResult?.message || "Ukladanie reklamy zlyhalo.");
      }

      setStatus("Reklama bola úspešne uložená. 🎉");
      // form.reset(); // ak chceš po uložení vyčistiť formulár, môžeš odkomentovať
    } catch (err) {
      console.error("Chyba pri ukladaní reklamy:", err);
      setStatus(
        "Pri ukladaní reklamy nastala chyba. Skúste to prosím znova.",
        true
      );
    }
  });
});
