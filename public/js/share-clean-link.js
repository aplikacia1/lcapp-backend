// public/js/share-clean-link.js
(function () {
  /**
   * Urobí pekný, krátky link na detail produktu:
   * - zachová len ?id=...
   * - úplne zahodí email, categoryId, atď.
   * - pri zdieľaní použije navigator.share, alebo skopíruje link do schránky
   */
  function buildCleanUrl() {
    const url = new URL(window.location.href);
    const p = url.searchParams;

    const id = p.get("id") || p.get("pid");
    if (!id) {
      // fallback – všeobecná stránka detailu
      return window.location.origin + "/product_detail.html";
    }

    const clean = new URL(window.location.origin + "/product_detail.html");
    clean.searchParams.set("id", id);

    return clean.toString();
  }

  function fallbackCopyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  window.setupShareButton = function (buttonId) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.addEventListener("click", function () {
      const shareUrl = buildCleanUrl();
      const shareTitle = "Produkt z Lištobooku";
      const shareText = "Pozrite si tento produkt z katalógu listobook:";

      // 📱 natívne zdieľanie (mobil, moderné prehliadače)
      if (navigator.share) {
        navigator
          .share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          })
          .catch(function (err) {
            console.warn("Share canceled or failed:", err);
          });
        return;
      }

      // 💻 fallback – skopíruj link do schránky
      fallbackCopyToClipboard(shareUrl)
        .then(function () {
          alert("Odkaz na produkt bol skopírovaný do schránky.\nMôžete ho vložiť do správy alebo e-mailu.");
        })
        .catch(function () {
          // posledná záchrana – otvoríme mailto
          window.location.href =
            "mailto:?subject=" +
            encodeURIComponent(shareTitle) +
            "&body=" +
            encodeURIComponent(shareText + " " + shareUrl);
        });
    });
  };
})();
