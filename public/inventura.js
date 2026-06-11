const params =
  new URLSearchParams(window.location.search);

const currentEmail =
  params.get("email") || "";

  const sessionId =
  params.get("id") || "";

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

     let lastScannedCode = "";
let lastScanTime = 0;

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

startCamera();

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

    async (result, err) => {

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

          const product =
            await findProduct(code);

          if (product) {

            showProduct(product);

          }

        }

      }

    }

  );

}

let selectedWarehouse = "BA";
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

  scanInput.focus();

}

window.addEventListener("load", () => {

  setWarehouse("BA");

});
    
    let currentProduct = null;

    const scanInput = document.getElementById("scanInput");
    const countInput = document.getElementById("countInput");
    const saveBtn = document.getElementById("saveBtn");
    const message = document.getElementById("message");

    const productName = document.getElementById("productName");
    const productCode = document.getElementById("productCode");
    const productStock = document.getElementById("productStock");
    const duplicateModal =
  document.getElementById("duplicateModal");

const duplicateIgnoreBtn =
  document.getElementById("duplicateIgnoreBtn");

  const duplicateAddBtn =
  document.getElementById("duplicateAddBtn");

const confirmAddModal =
  document.getElementById("confirmAddModal");

const confirmAddText =
  document.getElementById("confirmAddText");

  const confirmAddBtn =
  document.getElementById("confirmAddBtn");

const cancelAddBtn =
  document.getElementById("cancelAddBtn");

  duplicateIgnoreBtn.addEventListener(
  "click",
  () => {

    duplicateModal.style.display =
      "none";

    scanInput.value = "";

    countInput.value = "";

    currentProduct = null;

    productName.textContent =
      "Čakám na ďalší produkt…";

    productCode.textContent =
      "Kód: —";

    productStock.textContent =
      "Systémový stav: —";

    scanInput.focus();

   }
);
  duplicateAddBtn.addEventListener(
  "click",
  () => {

    const total =
      duplicateOriginalQty +
      duplicateNewQty;

    confirmAddText.innerHTML =

      "<strong>" +
      currentEmail +
      "</strong> : " +
      duplicateOriginalQty +
      " ks<br><br>" +

      "<strong>Nové počítanie</strong> : " +
      duplicateNewQty +
      " ks<br><br>" +

      "────────────<br><br>" +

      "<strong>Spolu : " +
      total +
      " ks</strong>";

    duplicateModal.style.display =
      "none";

    confirmAddModal.style.display =
      "flex";

  }
);

cancelAddBtn.addEventListener(
  "click",
  () => {

    confirmAddModal.style.display =
      "none";

    duplicateModal.style.display =
      "flex";

  }
);

confirmAddBtn.addEventListener(
  "click",
  async () => {

    try {

      const total =
        duplicateOriginalQty +
        duplicateNewQty;

      const response =
        await fetch(
          "/api/inventura/save-duplicate",
          {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              sessionId,

              warehouse:
                selectedWarehouse,

              productCode:
                currentProduct.code,

              newQty:
                total,

              countedBy:
                "Marcel"

            })

          }
        );

      const data =
        await response.json();

      if (!data.success) {

        showMessage(
          "Nepodarilo sa uložiť súčet.",
          "err"
        );

        return;
      }

      confirmAddModal.style.display =
        "none";

      duplicateModal.style.display =
        "none";

      showMessage(
        "Uložené: " +
        currentProduct.code +
        " (" +
        total +
        " ks)",
        "ok"
      );

      currentProduct = null;

      scanInput.value = "";

      countInput.value = "";

      productName.textContent =
        "Čakám na ďalší produkt…";

      productCode.textContent =
        "Kód: —";

      productStock.textContent =
        "Systémový stav: —";

      setTimeout(() => {

        clearMessage();

        scanInput.focus();

      }, 1200);

    } catch (err) {

      console.error(err);

      showMessage(
        "Chyba servera.",
        "err"
      );

    }

  }
);

    function showMessage(text, type) {
      message.textContent = text;
      message.className = "message " + type;
    }

    function clearMessage() {
      message.textContent = "";
      message.className = "message";
    }

    async function findProduct(code) {

  try {

    const response = await fetch(

  "/api/inventura/product/" +

  encodeURIComponent(code) +

  "?warehouse=" +

  selectedWarehouse

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

    function showProduct(product) {
      currentProduct = product;
      productName.textContent = product.name;
      productCode.textContent = "Kód: " + product.code;
      productStock.textContent = "Systémový stav: " + product.stock + " ks";
      countInput.value = "";
      countInput.focus();
      clearMessage();
    }

    scanInput.addEventListener("input", async function() {

  const code = scanInput.value.trim();

  if (code.length < 3) return;

  const product = await findProduct(code);

  if (!product) {

    currentProduct = null;

    productName.textContent = "Produkt sa nenašiel";

    productCode.textContent = "Kód: " + code;

    productStock.textContent = "Systémový stav: —";

    showMessage(
      "Produkt zatiaľ nie je v testovacom zozname.",
      "err"
    );

    return;
  }

  showProduct(product);

});

let duplicateOriginalQty = 0;
let duplicateNewQty = 0;

    saveBtn.addEventListener("click", async function() {

  if (!currentProduct) {

    showMessage("Najprv naskenuj alebo napíš produkt.", "err");

    scanInput.focus();

    return;
  }

  if (countInput.value === "") {

    showMessage("Zadaj reálny počet.", "err");

    countInput.focus();

    return;
  }

  try {

    const response = await fetch("/api/inventura/save", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        sessionId,

        warehouse: selectedWarehouse,

        productCode: currentProduct.code,

        productName: currentProduct.name,

        systemStock: currentProduct.stock,

        countedQty: Number(countInput.value),

        countedBy: "Marcel"

      })

    });

    const data = await response.json();

if (data.duplicate) {

  duplicateOriginalQty =
  Number(data.countedQty || 0);

duplicateNewQty =
  Number(countInput.value || 0);

  document.getElementById(
    "duplicateText"
  ).innerHTML =

    "<strong>" +
    data.countedBy +
    "</strong><br><br>" +

    "už napočítal<br>" +

    "<strong>" +
    data.countedQty +
    " ks</strong>";

  document.getElementById(
    "duplicateModal"
  ).style.display = "flex";

  return;

}

if (!data.success) {

  showMessage("Nepodarilo sa uložiť inventúru.", "err");

  return;
}

showMessage(
  "Uložené: " + currentProduct.code,
  "ok"
);
currentProduct = null;

scanInput.value = "";

countInput.value = "";

productName.textContent = "Čakám na ďalší produkt…";

productCode.textContent = "Kód: —";

productStock.textContent = "Systémový stav: —";

setTimeout(() => {

  clearMessage();

  scanInput.focus();

}, 900);

} catch (err) {

  console.error(err);

  showMessage("Chyba servera.", "err");

}

});