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

    // Titulka

    doc.fontSize(24);
    doc.text("INVENTÚRNY VÝSTUP", {
      align: "center"
    });

    doc.moveDown();

    doc.fontSize(16);
    doc.text(`Sklad: ${warehouse}`, {
      align: "center"
    });

    doc.moveDown();

    doc.fontSize(12);

    doc.text(`Dátum inventúry: ${inventoryDate}`);
    doc.text(`Dátum exportu: ${generatedAt}`);
    doc.text(`Počet produktov: ${records.length}`);

    doc.addPage();

    doc.fontSize(18);
    doc.text("Počiatočný stav skladu");

    doc.moveDown();

    records.forEach((item, index) => {

      doc.fontSize(10);

      doc.text(
        `${index + 1}. ${item.productCode || "-"} | ${item.productName || "-"} | ${item.systemStock ?? 0}`
      );

    });

    doc.end();

  });

}

module.exports = {
  generateInventoryPdfBuffer
};