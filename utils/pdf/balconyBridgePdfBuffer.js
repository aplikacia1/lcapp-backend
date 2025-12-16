// utils/pdf/balconyBridgePdfBuffer.js
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function safeStringify(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

/**
 * Bridge PDF už NECHCEME "ASCII sanitize".
 * Namiesto toho použijeme TTF font s podporou diakritiky.
 *
 * Font súbor očakávame v: utils/pdf/fonts/DejaVuSans.ttf
 * (open-source, bezpečné riešenie pre Render aj lokál)
 */
function resolveFontPath() {
  // __dirname = utils/pdf
  return path.join(__dirname, 'fonts', 'DejaVuSans.ttf');
}

function setBridgeFont(doc) {
  const fontPath = resolveFontPath();
  if (fs.existsSync(fontPath)) {
    doc.font(fontPath);
    return { ok: true, fontPath };
  }
  // fallback: ak font chýba, aspoň sa PDF nezrúti
  doc.font('Helvetica');
  return { ok: false, fontPath };
}

function buildBalconyBridgePdfBuffer(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, left: 40, right: 40, bottom: 40 },
        info: {
          Title: 'Balkón kalkulačka – Bridge PDF',
          Author: 'Lištobook',
        },
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Font (diakritika)
      const fontState = setBridgeFont(doc);

      // Header
      doc.fontSize(18).fillColor('#000');
      doc.text('Balkón kalkulačka – BRIDGE PDF (technické)');
      doc.moveDown(0.3);

      doc.fontSize(10).fillColor('#555');
      doc.text('Účel: overenie prenosu dát kalkulačka → server → PDF');
      doc.fillColor('#000');

      if (!fontState.ok) {
        doc.moveDown(0.3);
        doc.fillColor('#b91c1c');
        doc.text(`⚠️ Chýba font pre diakritiku: ${fontState.fontPath}`);
        doc.fillColor('#000');
      }

      doc.moveDown(1);

      // Quick summary
      const meta = payload?.meta || {};
      const calc = payload?.calc || {};

      doc.fontSize(12).text('Základný sumár');
      doc.moveDown(0.4);
      doc.fontSize(10);

      doc.text(`Čas vytvorenia: ${new Date().toISOString()}`);

      if (meta.email) doc.text(`Email (z URL): ${meta.email}`);
      if (meta.app) doc.text(`Aplikácia: ${meta.app}`);
      if (meta.version) doc.text(`Verzia payloadu: ${meta.version}`);

      if (calc.typeLabel) doc.text(`Typ: ${calc.typeLabel}`);
      if (calc.shapeLabel) doc.text(`Tvar: ${calc.shapeLabel}`);
      if (typeof calc.area === 'number') doc.text(`Plocha: ${calc.area} m²`);
      if (typeof calc.perimeter === 'number') doc.text(`Obvod pre lišty: ${calc.perimeter} bm`);
      if (calc.heightLabel) doc.text(`Konštrukčná výška: ${calc.heightLabel}`);
      if (calc.drainLabel) doc.text(`Odtok vody: ${calc.drainLabel}`);
      if (calc.systemTitle) doc.text(`Systém: ${calc.systemTitle}`);

      if (calc.previewId) doc.text(`Preview ID: ${calc.previewId}`);
      if (calc.previewSrc) doc.text(`Preview SRC: ${calc.previewSrc}`);

      doc.moveDown(1);

      // Full payload (debug)
      doc.fontSize(12).text('Kompletný payload (debug)');
      doc.moveDown(0.4);
      doc.fontSize(8);

      const json = safeStringify(payload);
      const lines = String(json).split('\n');

      for (const line of lines) {
        doc.text(line, { lineBreak: true });
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
          // po addPage treba znova nastaviť font, aby sa nestratil
          setBridgeFont(doc);
          doc.fontSize(8);
        }
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { buildBalconyBridgePdfBuffer };
