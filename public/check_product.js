const params =
  new URLSearchParams(window.location.search);

const currentEmail =
  params.get("email") || "";

async function checkInventoryAccess(){

  try{

    const res = await fetch(
      "/api/inventory/settings"
    );

    const data = await res.json();

    if(!data.success){

      location.href =
        `timeline.html?email=${encodeURIComponent(currentEmail)}`;

      return;
    }

    const allowedUsers =
      data.allowedUsers || [];

    if(
      !allowedUsers.includes(currentEmail)
    ){

      location.href =
        `timeline.html?email=${encodeURIComponent(currentEmail)}`;

      return;
    }

  }catch(err){

    console.error(err);

    location.href =
      `timeline.html?email=${encodeURIComponent(currentEmail)}`;
  }

}

checkInventoryAccess();

async function startCamera() {

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode: "environment"
        }

      });

    const video =
      document.getElementById("camera");

    video.srcObject = stream;

  } catch (err) {

    console.error(
      "Kamera sa nepodarila spustiť:",
      err
    );

  }

}

startCamera();

let selectedWarehouse = "BA";

const scanInput =
  document.getElementById("scanInput");

const productName =
  document.getElementById("productName");

const productCode =
  document.getElementById("productCode");

const stockBA =
  document.getElementById("stockBA");

const stockZA =
  document.getElementById("stockZA");

const productPrice =
  document.getElementById("productPrice");

const productDescription =
  document.getElementById("productDescription");

const resetBtn =
  document.getElementById("resetBtn");

function setWarehouse(warehouse) {

  selectedWarehouse = warehouse;

  const btnBA =
    document.getElementById("warehouseBA");

  const btnZA =
    document.getElementById("warehouseZA");

  if (warehouse === "BA") {

    btnBA.style.background = "#18a558";
    btnZA.style.background = "#13284d";

  } else {

    btnZA.style.background = "#18a558";
    btnBA.style.background = "#13284d";

  }

}

window.addEventListener("load", () => {

  setWarehouse("BA");

});

document
  .getElementById("warehouseBA")
  .addEventListener("click", () => {

    setWarehouse("BA");

  });

document
  .getElementById("warehouseZA")
  .addEventListener("click", () => {

    setWarehouse("ZA");

  });

async function findProduct(code) {

  try {

    const response = await fetch(

      "/api/inventura/check-product/"
      + encodeURIComponent(code)

    );

    const data = await response.json();

    if (!data.success) {
      return null;
    }

    return data.product;

  } catch (err) {

    console.error(err);

    return null;

  }

}

scanInput.addEventListener(

  "input",

  async function() {

    const code =
      scanInput.value.trim();

    if (code.length < 3) return;

    const product =
      await findProduct(code);

    if (!product) {

      productName.textContent =
        "Produkt sa nenašiel";

      productCode.textContent =
        "Kód: " + code;

      stockBA.textContent =
        "BA sklad: —";

      stockZA.textContent =
        "ZA sklad: —";

      productPrice.textContent =
        "Cena: —";

      productDescription.textContent =
        "Produkt zatiaľ neexistuje.";

      return;
    }

    productName.textContent =
      product.name || "Bez názvu";

    productCode.textContent =
      "Kód: " + product.code;

    stockBA.textContent =
      "BA sklad: "
      + (product.stockBA ?? 0)
      + " ks";

    stockZA.textContent =
      "ZA sklad: "
      + (product.stockZA ?? 0)
      + " ks";

    productPrice.textContent =
      "Cena: "
      + Number(product.price || 0).toFixed(2)
      + " €";

    productDescription.textContent =
      product.description
      || "Bez popisu.";

  }

);

resetBtn.addEventListener(

  "click",

  function() {

    scanInput.value = "";

    productName.textContent =
      "Čakám na produkt…";

    productCode.textContent =
      "Kód: —";

    stockBA.textContent =
      "BA sklad: —";

    stockZA.textContent =
      "ZA sklad: —";

    productPrice.textContent =
      "Cena: —";

    productDescription.textContent =
      "—";

    scanInput.focus();

  }

);