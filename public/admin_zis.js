const saveBtn = document.getElementById("saveBtn");
const result = document.getElementById("result");
const cardsTable = document.getElementById("cardsTable");

let editingCardId = null;

let allCards = [];

async function getProductName(productId) {

  try {

    const res =
      await fetch(`/api/products/${productId}`);

    if (!res.ok) {
      return productId;
    }

    const product =
      await res.json();

    return product.name || productId;

  } catch {

    return productId;

  }

}

async function loadCards() {
  try {

    const res = await fetch("/api/zis");
    const cards = await res.json();

    allCards = cards;

    cardsTable.innerHTML = "";

    for (const card of cards) {

      const tr = document.createElement("tr");

      const productName =
  await getProductName(
    card.productId?._id || card.productId
  );      

      tr.innerHTML = `
  <td>${card.manufacturer || ""}</td>
  <td>${productName}</td>
  <td>${card.youtubeUrl || ""}</td>
  <td>
  <button onclick="editCard('${card._id}')">
    ✏️ Upraviť
  </button>

  <button onclick="deleteCard('${card._id}')">
    🗑️ Vymazať
  </button>
</td>
`;

      cardsTable.appendChild(tr);

      }

  } catch (err) {

    console.error(err);

  }
}

saveBtn.addEventListener("click", async () => {

  const productId =
    document.getElementById("productId").value.trim();

  if (!productId) {

    alert("Zadaj Product ID.");
    return;

  }

  const manufacturer =
    document.getElementById("manufacturer").value.trim();

  const youtubeUrl =
    document.getElementById("youtubeUrl").value.trim();

  const barcodes =
    document.getElementById("barcodes")
      .value
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);

  const productCodes =
    document.getElementById("productCodes")
      .value
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);

  const categories =
    document.getElementById("categories")
      .value
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);

  const keywords =
    document.getElementById("keywords")
      .value
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);

  const adminNote =
    document.getElementById("adminNote").value.trim();

    const content =
  document.getElementById("content").value.trim();

  const active =
    document.getElementById("active").checked;

  try {

    const url = editingCardId
  ? `/api/zis/${editingCardId}`
  : "/api/zis";

const method = editingCardId
  ? "PUT"
  : "POST";

const res = await fetch(url, {

  method,

  headers: {
    "Content-Type": "application/json"
  },

      body: JSON.stringify({

        productId,
        manufacturer,
        youtubeUrl,

        barcodes,
        productCodes,

        categories,
        keywords,

        content,

        adminNote,
        active

      })

    });

    if (!res.ok) {

      throw new Error("Nepodarilo sa uložiť");

    }

    result.innerHTML =
      "✅ Karta uložená.";

    await loadCards();

  } catch (err) {

    console.error(err);

    result.innerHTML =
      "❌ Chyba pri ukladaní.";

  }

});

loadCards();

document
  .getElementById("searchCards")
  .addEventListener("input", async function () {

    const text =
      this.value
        .toLowerCase()
        .trim();

    const rows =
      cardsTable.querySelectorAll("tr");

    rows.forEach(row => {

      const value =
        row.innerText
          .toLowerCase();

      row.style.display =
        value.includes(text)
          ? ""
          : "none";

    });

});

async function deleteCard(id) {

  if (!confirm("Naozaj vymazať túto ZIS kartu?")) {
    return;
  }

  try {

    const res = await fetch(`/api/zis/${id}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      throw new Error();
    }

    await loadCards();

  } catch (err) {

    alert("Nepodarilo sa vymazať kartu.");

  }
}

async function editCard(id) {

try {

const res =
  await fetch(`/api/zis/${id}`);

const card =
  await res.json();

editingCardId = id;

document.getElementById("productId").value =
  card.productId?._id || card.productId || "";

document.getElementById("manufacturer").value =
  card.manufacturer || "";

document.getElementById("youtubeUrl").value =
  card.youtubeUrl || "";

document.getElementById("barcodes").value =
  (card.barcodes || []).join("\n");

document.getElementById("productCodes").value =
  (card.productCodes || []).join("\n");

document.getElementById("categories").value =
  (card.categories || []).join("\n");

document.getElementById("keywords").value =
  (card.keywords || []).join("\n");

document.getElementById("adminNote").value =
  card.adminNote || "";

document.getElementById("content").value =
  card.content || "";

document.getElementById("active").checked =
  !!card.active;

window.scrollTo({
  top: 0,
  behavior: "smooth"
});

} catch (err) {

console.error(err);

alert("Nepodarilo sa načítať kartu.");

}
}