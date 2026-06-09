const PDFDocument = require("pdfkit");
const path = require("path");

async function generateInventoryPdfBuffer({
  warehouse,
  records,
  generatedAt,
  inventoryDate
}) {

  return new Promise((resolve, reject) => {

    const doc = new PDFDocument({
      size: "A4",
      margin: 40
    });

    const chunks = [];

    doc.on("data", chunk => chunks.push(chunk));

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);

    const fontPath = path.join(
      __dirname,
      "fonts",
      "DejaVuSans.ttf"
    );

    doc.font(fontPath);

    // =========================
    // VÝPOČTY
    // =========================

    const countedProducts = records.filter(
      r => r.countedQty !== undefined &&
           r.countedQty !== null
    ).length;

    const notCountedProducts =
      records.length - countedProducts;

    const totalDifference = records.reduce(
      (sum, item) =>
        sum + Number(item.difference || 0),
      0
    );

    // =========================
    // TITULNÁ STRANA
    // =========================

    doc.fontSize(24);
    doc.text(
      "INVENTÚRNY VÝSTUP",
      {
        align: "center"
      }
    );

    doc.moveDown(2);

    doc.fontSize(16);

    doc.text(
      `Sklad: ${warehouse}`,
      {
        align: "center"
      }
    );

    doc.moveDown(2);

    doc.fontSize(12);

    doc.text(
      `Dátum inventúry: ${inventoryDate}`
    );

    doc.text(
      `Dátum exportu: ${generatedAt}`
    );

    doc.moveDown();

    doc.text(
      `Počet produktov: ${records.length}`
    );

    doc.text(
      `Spočítané produkty: ${countedProducts}`
    );

    doc.text(
      `Nespočítané produkty: ${notCountedProducts}`
    );

    doc.text(
      `Celkový rozdiel: ${totalDifference}`
    );

    // =========================
    // TABUĽKA
    // =========================

    doc.addPage();

    doc.fontSize(16);
    doc.text(
      "Konečný stav inventúry"
    );

    doc.moveDown();

    const startY = doc.y;

    doc.fontSize(9);

    doc.text("#", 40, startY);
    doc.text("Kód", 65, startY);
    doc.text("Názov", 140, startY);
    doc.text("Systém", 360, startY);
    doc.text("Reál", 430, startY);
    doc.text("Rozdiel", 490, startY);

    doc.moveTo(40, startY + 15)
      .lineTo(555, startY + 15)
      .stroke();

    let y = startY + 22;

    records.forEach((item, index) => {

      if (y > 760) {

        doc.addPage();

        y = 40;

        doc.fontSize(9);

        doc.text("#", 40, y);
        doc.text("Kód", 65, y);
        doc.text("Názov", 140, y);
        doc.text("Systém", 360, y);
        doc.text("Reál", 430, y);
        doc.text("Rozdiel", 490, y);

        doc.moveTo(40, y + 15)
          .lineTo(555, y + 15)
          .stroke();

        y += 22;
      }

      doc.fontSize(8);

      doc.text(
        String(index + 1),
        40,
        y,
        { width: 20 }
      );

      doc.text(
        item.productCode || "-",
        65,
        y,
        { width: 70 }
      );

      doc.text(
        item.productName || "-",
        140,
        y,
        { width: 210 }
      );

      doc.text(
        String(item.systemStock ?? 0),
        360,
        y,
        { width: 60 }
      );

      doc.text(
        String(item.countedQty ?? ""),
        430,
        y,
        { width: 50 }
      );

      doc.text(
        String(item.difference ?? 0),
        490,
        y,
        { width: 50 }
      );

      y += 18;
    });

    doc.end();

  });

}

module.exports = {
  generateInventoryPdfBuffer
};