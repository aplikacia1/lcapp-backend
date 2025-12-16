// utils/pdf/testPdf.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Vygeneruje jednoduchý testovací PDF na disk.
 * Slúži len na overenie, že pdfkit funguje.
 */
function generateTestPdf() {
  const outDir = path.join(__dirname, '../../_tmp');
  const outFile = path.join(outDir, 'test.pdf');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(outFile);

  doc.pipe(stream);

  doc.fontSize(20).text('PDFKit – test', { align: 'left' });
  doc.moveDown();
  doc.fontSize(12).text('Ak vidíš tento text, PDFKit na serveri funguje.');
  doc.moveDown();
  doc.text(`Čas generovania: ${new Date().toLocaleString('sk-SK')}`);

  doc.end();

  return outFile;
}

module.exports = { generateTestPdf };
