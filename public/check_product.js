const params =
  new URLSearchParams(window.location.search);

const currentEmail =
  params.get("email") || "";

const backBtn =
  document.getElementById("backBtn");

backBtn?.addEventListener("click", () => {

  location.href =
    currentEmail
      ? `timeline.html?email=${encodeURIComponent(currentEmail)}`
      : "timeline.html";

});

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

let selectedWarehouse = "BA";
let barcodeDetector = null;
let scanningActive = false;
let lastScannedCode = "";
let lastScanTime = 0;

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

  const captureBtn =
  document.getElementById("captureBtn");

const captureCanvas =
  document.getElementById("captureCanvas");

const video =
  document.getElementById("camera");

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

async function showProductByCode(code) {

  const cleanCode =
    String(code || "").trim();

  if (cleanCode.length < 3) return;

  const product =
    await findProduct(cleanCode);

  if (!product) {

    productName.textContent =
      "Produkt sa nenašiel";

    productCode.textContent =
      "Kód: " + cleanCode;

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

scanInput.addEventListener(

  "input",

  async function() {

    await showProductByCode(scanInput.value);

  }

);

async function startCamera() {

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: "continuous"
        }

      });

    const video =
      document.getElementById("camera");

    video.srcObject = stream;

    await video.play();

    startBarcodeScanner(video);

  } catch (err) {

    console.error(
      "Kamera sa nepodarila spustiť:",
      err
    );

  }

}

function startBarcodeScanner(video) {

  if (
    !window.ZXingBrowser ||
    !ZXingBrowser.BrowserMultiFormatReader
  ) {

    console.warn(
      "ZXing sa nepodarilo načítať."
    );

    return;
  }

  const codeReader =
    new ZXingBrowser.BrowserMultiFormatReader();

  codeReader.decodeFromVideoDevice(

  undefined,
  video,

  (result, err) => {

    if (result) {

      const code =
        result.text;

      const now =
        Date.now();

      if (
        code &&
        (
          code !== lastScannedCode ||
          now - lastScanTime > 2500
        )
      ) {

        lastScannedCode = code;
        lastScanTime = now;

        scanInput.value = code;

        showProductByCode(code);

      }

    }

  }

);

}

startCamera();

captureBtn?.addEventListener(

  "click",

  async function() {

    try {

      if (
        !window.ZXingBrowser ||
        !ZXingBrowser.BrowserMultiFormatReader
      ) {

        alert(
          "ZXing nie je načítaný."
        );

        return;
      }

      const ctx =
        captureCanvas.getContext("2d");

      captureCanvas.width =
        video.videoWidth;

      captureCanvas.height =
        video.videoHeight;

      ctx.drawImage(

        video,
        0,
        0,
        captureCanvas.width,
        captureCanvas.height

      );

      const imageData =
  ctx.getImageData(
    0,
    0,
    captureCanvas.width,
    captureCanvas.height
  );

const data =
  imageData.data;

for (let i = 0; i < data.length; i += 4) {

  const avg =
    (
      data[i] +
      data[i + 1] +
      data[i + 2]
    ) / 3;

  data[i] = avg;
  data[i + 1] = avg;
  data[i + 2] = avg;

}

ctx.putImageData(imageData, 0, 0);

      const codeReader =
        new ZXingBrowser.BrowserMultiFormatReader();

      const imageDataUrl =
  captureCanvas.toDataURL("image/png");

const result =
  await codeReader.decodeFromImageUrl(
    imageDataUrl
  );

      if (
        result &&
        result.text
      ) {

        scanInput.value =
          result.text;

        await showProductByCode(
          result.text
        );

      } else {

        alert(
          "Čiarový kód sa nenašiel."
        );

      }

    } catch (err) {

      console.error(err);

      alert(
        "Nepodarilo sa načítať čiarový kód."
      );

    }

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

    lastScannedCode = "";
    lastScanTime = 0;

    scanInput.focus();

  }

);