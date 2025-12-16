// utils/pdf/balconyFinalPdfBuffer.js
const path = require('path');
const PDFDocument = require('pdfkit');

function getFontPath() {
  // DejaVuSans.ttf je binárny súbor – v VSCode sa normálne NEZOBRAZÍ ako text, to je v poriadku.
  // Cesta: backend/utils/pdf/fonts/DejaVuSans.ttf
  return path.join(__dirname, 'fonts', 'DejaVuSans.ttf');
}

function safeText(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function footer(doc, pageLabel) {
  const y = doc.page.height - 30;
  doc.fontSize(9).fillColor('#666');
  doc.text(`Strana ${pageLabel}`, doc.page.margins.left, y, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: 'right',
  });
  doc.fillColor('#000');
}

function addLabeledPage(doc, label, renderFn) {
  if (doc._pageBuffer && doc._pageBuffer.length > 0) {
    doc.addPage();
  }
  renderFn();
  footer(doc, label);
}

/**
 * Zloženie strán podľa typu odtoku:
 * - free (voľná hrana): 1-5 + 6 + 9 + 11
 * - ryn (rýn):          1-5 + 10 + 9 + 11
 */
function resolvePagePlan(payload) {
  const drainId = safeText(payload?.calc?.drainId || payload?.calc?.drain || '').toLowerCase();

  // default: free-edge (voľná hrana)
  const isRyn = drainId.includes('ryn') || drainId.includes('gutter');

  if (isRyn) return [1, 2, 3, 4, 5, 10, 9, 11];
  return [1, 2, 3, 4, 5, 6, 9, 11];
}

/* ===========================
   RENDER FUNKCIE STRÁN
   (zatiaľ technické “skelet”)
   =========================== */

function renderCorePage1(doc, payload) {
  doc.fontSize(20).text('Balkón kalkulačka – PDF', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#444').text('Jadro: strana 1 (intro)', { align: 'left' });
  doc.fillColor('#000');
  doc.moveDown(1);

  doc.fontSize(12).text('Rýchly sumár');
  doc.moveDown(0.3);
  doc.fontSize(10);

  doc.text(`Email: ${safeText(payload?.meta?.email)}`);
  doc.text(`Typ: ${safeText(payload?.calc?.typeLabel)}`);
  doc.text(`Tvar: ${safeText(payload?.calc?.shapeLabel)}`);
  doc.text(`Plocha: ${safeText(payload?.calc?.area)} m²`);
  doc.text(`Obvod: ${safeText(payload?.calc?.perimeter)} bm`);
  doc.text(`Konštrukčná výška: ${safeText(payload?.calc?.heightLabel)}`);
  doc.text(`Odtok: ${safeText(payload?.calc?.drainLabel)}`);
  doc.text(`Systém: ${safeText(payload?.calc?.systemTitle)}`);
}

function renderCorePage2(doc) {
  doc.fontSize(14).text('Jadro: strana 2');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: obsah podľa pdf_balkon_page2.html');
  doc.fillColor('#000');
}

function renderCorePage3(doc) {
  doc.fontSize(14).text('Jadro: strana 3');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: obsah podľa pdf_balkon_page3.html');
  doc.fillColor('#000');
}

function renderCorePage4(doc) {
  doc.fontSize(14).text('Jadro: strana 4');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: obsah podľa pdf_balkon_page4.html');
  doc.fillColor('#000');
}

function renderCorePage5(doc) {
  doc.fontSize(14).text('Jadro: strana 5');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: obsah podľa pdf_balkon_page5.html');
  doc.fillColor('#000');
}

// Strana 6 = BARA (len pre voľný okraj)
function renderPage6_BARA_FreeEdge(doc) {
  doc.fontSize(14).text('Strana 6 – BARA (len voľný okraj)');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: obsah BARA pre voľnú hranu');
  doc.fillColor('#000');
}

// Strana 10 = rýn
function renderPage10_Ryn(doc) {
  doc.fontSize(14).text('Strana 10 – RÝN (odvodnenie do rýny)');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: obsah pre variant rýn (namiesto 6)');
  doc.fillColor('#000');
}

// Strana 9 = pôvodná 7
function renderPage9(doc) {
  doc.fontSize(14).text('Strana 9 (pôvodná strana 7)');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: sem pôjde obsah “pôvodnej 7”');
  doc.fillColor('#000');
}

// Strana 11 = pôvodná 8
function renderPage11(doc) {
  doc.fontSize(14).text('Strana 11 (pôvodná strana 8)');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#444').text('TODO: sem pôjde obsah “pôvodnej 8”');
  doc.fillColor('#000');
}

/* ===========================
   HLAVNÝ BUILDER
   =========================== */

function buildBalconyFinalPdfBuffer(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, left: 40, right: 40, bottom: 40 },
        info: { Title: 'Balkon PDF', Author: 'Listobook' },
      });

      // Font s diakritikou
      const fontPath = getFontPath();
      doc.registerFont('DejaVu', fontPath);
      doc.font('DejaVu');

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const plan = resolvePagePlan(payload);

      for (const label of plan) {
        if (label === 1) addLabeledPage(doc, 1, () => renderCorePage1(doc, payload));
        else if (label === 2) addLabeledPage(doc, 2, () => renderCorePage2(doc, payload));
        else if (label === 3) addLabeledPage(doc, 3, () => renderCorePage3(doc, payload));
        else if (label === 4) addLabeledPage(doc, 4, () => renderCorePage4(doc, payload));
        else if (label === 5) addLabeledPage(doc, 5, () => renderCorePage5(doc, payload));
        else if (label === 6) addLabeledPage(doc, 6, () => renderPage6_BARA_FreeEdge(doc, payload));
        else if (label === 9) addLabeledPage(doc, 9, () => renderPage9(doc, payload));
        else if (label === 10) addLabeledPage(doc, 10, () => renderPage10_Ryn(doc, payload));
        else if (label === 11) addLabeledPage(doc, 11, () => renderPage11(doc, payload));
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { buildBalconyFinalPdfBuffer };
