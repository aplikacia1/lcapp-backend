const params = new URLSearchParams(window.location.search);

const email = params.get("email") || "";
const cardId = params.get("id") || params.get("cardId") || "";
const barcode = params.get("barcode") || "";
const search = params.get("search") || "";
const productCode = params.get("code") || "";

const DEV_EMAIL = "sabla.marcel@gmail.com";

const loading = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");
const wrap = document.getElementById("zisContentWrap");

const zisManufacturer = document.getElementById("zisManufacturer");
const zisRating = document.getElementById("zisRating");
const zisImage = document.getElementById("zisImage");
const zisTitle = document.getElementById("zisTitle");
const zisContent = document.getElementById("zisContent");

const techBtn = document.getElementById("techBtn");
const videoBtn = document.getElementById("videoBtn");
const eshopBtn = document.getElementById("eshopBtn");
const ratingBtn = document.getElementById("ratingBtn");
const searchBtn = document.getElementById("searchBtn");
const backBtn = document.getElementById("backBtn");

const marsabSymbol = document.getElementById("marsabSymbol");
const marsabInitials = document.getElementById("marsabInitials");

/*
OCHRANA PRIHLÁSENIA — zatiaľ vypnutá.
Keď ju budeme chcieť zapnúť, odstránime //.

// if (!email) {
//   const next = encodeURIComponent(
//     window.location.pathname + window.location.search
//   );
//
//   window.location.href = "pin_login.html?next=" + next;
// }
*/

/*
OCHRANA PC — zatiaľ vypnutá.
Keď ju budeme chcieť zapnúť, odstránime //.

// const isDesktop = window.innerWidth > 820;
//
// if (isDesktop && email !== DEV_EMAIL) {
//   document.body.classList.add("desktop-lock");
// }
*/

if (marsabSymbol && marsabInitials) {
  marsabSymbol.addEventListener("click", () => {
    marsabInitials.style.display =
      marsabInitials.style.display === "block"
        ? "none"
        : "block";
  });
}

if (email) {
  const encodedEmail = encodeURIComponent(email);

  searchBtn.href = "zis.html?email=" + encodedEmail;
  backBtn.href = "zis.html?email=" + encodedEmail;
}

function showError(message) {
  loading.style.display = "none";
  wrap.style.display = "none";
  errorBox.style.display = "block";
  errorBox.textContent = message || "ZIS kartu sa nepodarilo načítať.";
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function getProduct(card) {
  if (!card) return {};

  if (card.productId && typeof card.productId === "object") {
    return card.productId;
  }

  if (card.product && typeof card.product === "object") {
    return card.product;
  }

  return {};
}

function getProductName(product, card) {
  return (
    product.name ||
    product.title ||
    product.productName ||
    card.title ||
    card.name ||
    "Produkt"
  );
}

function getProductImage(product) {

  if (product.image) {
    return product.image;
  }

  return "img/no-image.jpg";

}

function getRatingText(product) {
  const avg =
    product.averageRating ||
    product.ratingAverage ||
    product.rating ||
    "";

  const count =
    product.ratingCount ||
    product.ratingsCount ||
    product.reviewsCount ||
    "";

  if (!avg) {
    return "⭐ Bez hodnotenia";
  }

  if (count) {
    return `⭐ ${avg} (${count} hodnotení)`;
  }

  return `⭐ ${avg}`;
}

function normalizeUrl(url) {
  if (!url) return "";

  const cleanUrl = String(url).trim();

  if (!cleanUrl) return "";

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("/")
  ) {
    return cleanUrl;
  }

  return "https://" + cleanUrl;
}

function showButton(button, url) {
  if (!button) return;

  const finalUrl = normalizeUrl(url);

  if (!finalUrl) {
    button.classList.remove("show");
    button.href = "#";
    return;
  }

  button.href = finalUrl;
  button.classList.add("show");
}

function sanitizeHtml(html) {
  const allowedTags = [
    "H2",
    "H3",
    "P",
    "UL",
    "OL",
    "LI",
    "STRONG",
    "B",
    "EM",
    "I",
    "BR",
    "HR"
  ];

  const template = document.createElement("template");
  template.innerHTML = html || "";

  const all = template.content.querySelectorAll("*");

  all.forEach(el => {
    if (!allowedTags.includes(el.tagName)) {
      el.replaceWith(
        document.createTextNode(el.textContent || "")
      );
      return;
    }

    [...el.attributes].forEach(attr => {
      el.removeAttribute(attr.name);
    });
  });

  return template.innerHTML;
}

async function fetchJson(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Server vrátil chybu: " + res.status);
  }

  return await res.json();
}

async function loadInventoryInfo() {

  if (!search) {
    return;
}

  try {

    const code = search;

    const res = await fetch(
      "/api/inventura/check-product/" +
      encodeURIComponent(code)
    );

    const data = await res.json();

    if (!data.success) {
      return;
    }

    document.getElementById("inventoryCode").textContent =
      data.product.code || "";

    document.getElementById("inventoryName").textContent =
      data.product.name || "";

    document.getElementById("inventoryPrice").textContent =
      Number(data.product.price || 0).toFixed(2) +
      " € s DPH";

    document.getElementById("inventoryInfo").style.display =
      "block";

  } catch(err){

    console.error(err);

  }

}

async function loadCardByBarcode() {
  const cards = await fetchJson("/api/zis");

  if (!Array.isArray(cards)) {
    throw new Error("ZIS zoznam nemá správny formát");
  }

  return cards.find(card => {
    const barcodes = card.barcodes || [];

    return barcodes
      .map(item => String(item).trim())
      .includes(String(barcode).trim());
  });
}

async function loadCard() {
  console.log("LOAD CARD", new Date().toISOString());
  try {
    let card = null;

    if (cardId) {
      card = await fetchJson(
        "/api/zis/" + encodeURIComponent(cardId)
      );
    } else if (barcode) {
      card = await loadCardByBarcode();

      if (!card) {
        throw new Error("Čiarový kód nebol nájdený");
      }
    } else {
      throw new Error("Chýba ID karty alebo čiarový kód");
    }

    renderCard(card);

  } catch (err) {
    console.error("ZIS DETAIL ERROR:", err);
    showError("ZIS kartu sa nepodarilo načítať.");
  }
}

function renderCard(card) {
  const product = getProduct(card);

  zisManufacturer.textContent =
    safeText(card.manufacturer, "");

  zisTitle.textContent =
    getProductName(product, card);

  zisImage.src =
    getProductImage(product, card);

  zisImage.onerror = () => {
    zisImage.src = "img/no-image.jpg";
  };

  zisRating.textContent =
    getRatingText(product);

  const content =
    card.content ||
    card.description ||
    card.text ||
    "";

  if (content) {
    zisContent.innerHTML = sanitizeHtml(content);
  } else {
    zisContent.innerHTML =
      "<p>Táto ZIS karta zatiaľ nemá doplnený technický text.</p>";
  }

  showButton(
  techBtn,
  product.techSheetUrl
);

  showButton(
    videoBtn,
    card.youtubeUrl || card.videoUrl
  );

  showButton(
  eshopBtn,
  product.shopUrl
);

if (product._id) {

  let ratingUrl =
    "/product_detail.html?id=" +
    encodeURIComponent(product._id);

  if (email) {

    ratingUrl +=
      "&email=" +
      encodeURIComponent(email);

  }

  showButton(
    ratingBtn,
    ratingUrl
  );

}

  loading.style.display = "none";
  errorBox.style.display = "none";
  wrap.style.display = "block";
}

loadCard();
loadInventoryInfo();