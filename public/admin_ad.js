// public/admin_ad.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adForm");
  const imageInput = document.getElementById("adImage");
  const targetUrlInput = document.getElementById("targetUrl");
  const isActiveInput = document.getElementById("isActive");
  const statusMsg = document.getElementById("statusMsg");

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
      setStatus("Ukladám reklamu...");

      const fd = new FormData();
      fd.append("image", file); // MUSÍ byť "image" – adRoutes čaká toto pole
      fd.append("targetUrl", targetUrlInput.value.trim());
      fd.append("isActive", isActiveInput.checked ? "true" : "false");

      const res = await fetch(`${API_BASE_URL}/api/ads`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      console.log("Ad save response:", res.status, data);

      if (!res.ok || data?.ok !== true) {
        const msg =
          data?.message || `Ukladanie reklamy zlyhalo (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      setStatus("Reklama bola úspešne uložená. 🎉");
      // form.reset(); // ak chceš po uložení vyčistiť formulár
    } catch (err) {
      console.error("Chyba pri ukladaní reklamy:", err);
      setStatus(
        "Pri ukladaní reklamy nastala chyba. " +
          (err.message || "Skúste to prosím znova."),
        true
      );
    }
  });
});
