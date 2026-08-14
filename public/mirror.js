// =========================
// MIRROR – PUSH / DEVICE GUARD
// =========================

document.addEventListener("DOMContentLoaded", async () => {

  const ready = await ensureMirrorUser();

  if (!ready) {
    return;
  }

  await loadMirror();
});


async function ensureMirrorUser() {

  const params = new URLSearchParams(window.location.search);

  // Ak už máme e-mail v URL, môžeme pokračovať
  const urlEmail = params.get("email");

  if (urlEmail) {
    localStorage.setItem("lb_user_email", urlEmail);
    return true;
  }


  // Skúsime používateľa, ktorého zariadenie pozná
  const email = localStorage.getItem("lb_user_email");
  const deviceToken = localStorage.getItem("lb_device_token");

  if (!deviceToken) {
    // Mirror je verejný – bez tokenu ho aj tak zobrazíme
    return true;
  }


  try {

    const res = await fetch("/api/device/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        deviceToken
      })
    });


    if (!res.ok) {
      // Mirror je verejný
      return true;
    }


    const data = await res.json();

    if (!data.trusted || !data.email) {
      return true;
    }


    localStorage.setItem(
      "lb_user_email",
      data.email
    );


    // Ak zariadenie práve vyžaduje PIN,
    // zapamätáme si, že po PIN-e sa máme vrátiť sem.
    if (data.requiresPin) {

      localStorage.setItem(
        "afterLoginRedirect",
        "/mirror.html"
      );

      window.location.replace(
        "/pin_login.html?email=" +
        encodeURIComponent(data.email) +
        "&next=" +
        encodeURIComponent("/mirror.html")
      );

      return false;
    }


    return true;

  } catch (err) {

    console.log(
      "Mirror device check skip"
    );

    // Mirror je verejný – chyba overenia
    // nesmie zabrániť jeho zobrazeniu.
    return true;
  }
}

async function loadMirror() {

  const loading = document.getElementById("mirrorLoading");
  const empty = document.getElementById("mirrorEmpty");

  const zisSection = document.getElementById("zisSection");
  const zisGrid = document.getElementById("zisGrid");
  const zisCount = document.getElementById("zisCount");

  const ratingsSection = document.getElementById("ratingsSection");
  const ratingsList = document.getElementById("ratingsList");
  const ratingsCount = document.getElementById("ratingsCount");

  try {

    const res = await fetch("/api/push/mirror");

    if (!res.ok) {
      throw new Error("Mirror API error");
    }

    const data = await res.json();

    loading.style.display = "none";

    const zisCards = data.zisCards || [];
    const ratings = data.ratings || [];

    // =========================
    // ZIS KARTY
    // =========================

    if (zisCards.length > 0) {

      zisSection.style.display = "block";
      zisCount.textContent = zisCards.length;

      zisCards.forEach(card => {

        const product = card.productId || {};

        const tile = document.createElement("div");
        tile.className = "zis-card";

        const image = getProductImage(product);
        const name =
          product.name ||
          product.title ||
          "Produkt";

        tile.innerHTML = `
          ${
            image
              ? `<img
                   src="${escapeHtml(image)}"
                   class="zis-card-image"
                   alt=""
                 >`
              : ""
          }

          <div class="zis-card-title">
            ${escapeHtml(name)}
          </div>

          ${
            card.manufacturer
              ? `
                <div class="zis-card-manufacturer">
                  ${escapeHtml(card.manufacturer)}
                </div>
              `
              : ""
          }

          <div class="zis-open">
            Otvoriť ZIS →
          </div>
        `;

        tile.addEventListener("click", () => {

          /*
            Zatiaľ posielame ID ZIS karty.
            Ak má tvoja existujúca ZIS stránka inú URL,
            upravíme iba tento jediný riadok.
          */

          window.location.href =
  "/zis_detail.html?id=" +
  encodeURIComponent(card._id) +
  "&from=mirror";

        });

        zisGrid.appendChild(tile);
      });
    }


    // =========================
    // HODNOTENIA
    // =========================

    if (ratings.length > 0) {

      ratingsSection.style.display = "block";
      ratingsCount.textContent = ratings.length;

      ratings.forEach(rating => {

        const product = rating.productId || {};

        const card = document.createElement("div");
        card.className = "rating-card";

        const image = getProductImage(product);

        const productName =
          product.name ||
          product.title ||
          "Produkt";

        const author =
          rating.authorName ||
          "Používateľ";

        const stars =
          "★".repeat(rating.stars || 0) +
          "☆".repeat(5 - (rating.stars || 0));

        card.innerHTML = `

          ${
            image
              ? `
                <img
                  src="${escapeHtml(image)}"
                  class="rating-image"
                  alt=""
                >
              `
              : ""
          }

          <div class="rating-content">

            <div class="rating-product">
              ${escapeHtml(productName)}
            </div>

            <div class="rating-stars">
              ${stars}
            </div>

            <div class="rating-author">
              ${escapeHtml(author)}
            </div>

            ${
              rating.comment
                ? `
                  <div class="rating-comment">
                    ${escapeHtml(rating.comment)}
                  </div>
                `
                : ""
            }

          </div>
        `;

        ratingsList.appendChild(card);
      });
    }


    // =========================
    // NIČ NOVÉ
    // =========================

    if (
      zisCards.length === 0 &&
      ratings.length === 0
    ) {
      empty.style.display = "block";
    }

  } catch (err) {

    console.error("MIRROR LOAD ERROR:", err);

    loading.textContent =
      "Dnešné novinky sa nepodarilo načítať.";

  }
}


// =========================
// OBRÁZOK PRODUKTU
// =========================

function getProductImage(product) {

  if (!product) return "";

  if (product.image) {
    return product.image;
  }

  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {

    const first = product.images[0];

    if (typeof first === "string") {
      return first;
    }

    if (first?.url) {
      return first.url;
    }

  }

  return "";
}


// =========================
// BEZPEČNÉ HTML
// =========================

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =========================
// SPÄŤ DO LISTOBOOKU
// =========================

function closeMirror() {

  if (
    window.parent &&
    window.parent !== window &&
    typeof window.parent.closeOverlay === "function"
  ) {
    window.parent.closeOverlay();
    return;
  }

  window.location.href = "/home.html";
}