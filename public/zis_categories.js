const params = new URLSearchParams(window.location.search);

const search = params.get("search") || "";
const email = params.get("email") || "";

const result = document.getElementById("result");
const searchInfo = document.getElementById("searchInfo");
const backBtn = document.getElementById("backBtn");

if (email) {
  backBtn.href = "zis.html?email=" + encodeURIComponent(email);
}

function imageUrl(image) {
  if (!image) return "img/no-image.jpg";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("/")
  ) {
    return image;
  }

  return "/uploads/" + image;
}

async function loadCategories() {
  if (!search) {
    searchInfo.textContent = "Chýba hľadaný výraz.";
    result.innerHTML = "";
    return;
  }

  searchInfo.textContent = "Hľadané: " + search;
  result.innerHTML = "<div class='loading'>Hľadám oblasti...</div>";

  try {
    const res = await fetch(
      "/api/zis/categories/" + encodeURIComponent(search)
    );

    const categories = await res.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      result.innerHTML =
        "<div class='empty'>Nenašla sa žiadna oblasť.</div>";
      return;
    }

    result.innerHTML = "";

    categories.forEach(cat => {
      const card = document.createElement("div");
      card.className = "category-card";

      card.innerHTML = `
        <img src="${imageUrl(cat.image)}" alt="">
        <div class="category-body">
          <div class="category-title">${escapeHtml(cat.name)}</div>
          <div class="category-count">${cat.count} ZIS kariet</div>
        </div>
      `;

      card.addEventListener("click", () => {
        let url =
          "zis_products.html?search=" +
          encodeURIComponent(search) +
          "&category=" +
          encodeURIComponent(cat.name);

        if (email) {
          url += "&email=" + encodeURIComponent(email);
        }

        window.location.href = url;
      });

      result.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    result.innerHTML =
      "<div class='empty'>Chyba pri načítaní oblastí.</div>";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadCategories();