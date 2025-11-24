// public/js/share-clean-link.js

// Nastaví zdieľanie pre tlačidlo podľa ID.
// Link vyčistí od email/admin/test parametrov.
function setupShareButton(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const url = new URL(window.location.href);

    // odstránime citlivé/technické parametre
    url.searchParams.delete("email");
    url.searchParams.delete("admin");
    url.searchParams.delete("showAdTest");

    const cleanUrl = url.toString();

    try {
      // Mobil / PWA – Web Share API
      if (navigator.share) {
        await navigator.share({
          title: document.title || "Lištobook",
          url: cleanUrl,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Desktop – skopírujeme do schránky
        await navigator.clipboard.writeText(cleanUrl);
        alert("Odkaz bol skopírovaný do schránky.");
      } else {
        // Najjednoduchší fallback
        prompt("Skopírujte odkaz:", cleanUrl);
      }
    } catch (e) {
      console.error("Chyba pri zdieľaní:", e);
      alert("Nepodarilo sa zdieľať odkaz. Skúste ho skopírovať ručne.");
    }
  });
}
