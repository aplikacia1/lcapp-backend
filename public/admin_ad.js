document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adForm");
  const imageInput = document.getElementById("adImage");
  const targetUrlInput = document.getElementById("targetUrl");
  const isActiveInput = document.getElementById("isActive");
  const statusMsg = document.getElementById("statusMsg");

  // Základná adresa API – ak ju máš v config.js ako window.API_BASE_URL, použije sa tá
  const API_BASE_URL =
    window.API_BASE_URL || "http://localhost:5000";

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
        throw new Error("Nahrávanie obrázka zlyhalo.");
      }

      const uploadResult = await uploadResponse.json();

      // POZOR:
      // Tu predpokladáme, že uploadRoutes vracia cestu v poli "filePath" alebo "imageUrl".
      // Ak u teba vracia iný názov, stačí upraviť tento riadok:
      const imageUrl =
        uploadResult.imageUrl || uploadResult.filePath;

      if (!imageUrl) {
        throw new Error(
          "Server vrátil neplatnú cestu k obrázku (imageUrl/filePath)."
        );
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

      if (!adResponse.ok) {
        throw new Error("Ukladanie reklamy zlyhalo.");
      }

      const adResult = await adResponse.json();
      console.log("Uložená reklama:", adResult);

      setStatus("Reklama bola úspešne uložená. 🎉");
      // voliteľne: vyčistiť formulár
      // form.reset();
    } catch (err) {
      console.error("Chyba pri ukladaní reklamy:", err);
      setStatus(
        "Pri ukladaní reklamy nastala chyba. Skúste to prosím znova.",
        true
      );
    }
  });
});
