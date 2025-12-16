// utils/pdf/testPdfBuffer.js
const PDFDocument = require('pdfkit');

function buildTestPdfBuffer() {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Lištobook – Test PDF (server endpoint)', { align: 'left' });
      doc.moveDown();
      doc.fontSize(12).text('Ak vidíš toto PDF ako prílohu v e-maile, pipeline funguje.');
      doc.moveDown();
      doc.text(`Čas: ${new Date().toLocaleString('sk-SK')}`);

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { buildTestPdfBuffer };
