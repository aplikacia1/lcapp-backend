// utils/pdf/balconyFinalPdfBuffer.js
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

function mm(v) {
  // 1mm = 2.834645669 pt
  return v * 2.834645669;
}

function getFontPath() {
  return path.join(__dirname, "fonts", "DejaVuSans.ttf");
}

function getLogoPath() {
  // očakávame, že backend má vedľa seba /public ako v LCAPP
  // ak máš inú štruktúru, uprav sem.
  return path.join(process.cwd(), "public", "logo_lc.jpg");
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function skDateTime(d = new Date()) {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    // Slovenský formát napr. 16.12.2025 21:05
    const dd = String(dt.getDate()).padStart(2, "0");
    const mmx = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, "0");
    const mi = String(dt.getMinutes()).padStart(2, "0");
    return `${dd}.${mmx}.${yyyy} ${hh}:${mi}`;
  } catch {
    return "";
  }
}

function footer(doc, pageLabel) {
  const y = doc.page.height - mm(12);
  doc.fontSize(9).fillColor("#9ca3af");
  doc.text(`Strana ${pageLabel}`, doc.page.margins.left, y, {
    width:
      doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: "right",
  });
  doc.fillColor("#000");
}

function addLabeledPage(doc, label, renderFn) {
  if (doc._pageBuffer && doc._pageBuffer.length > 0) {
    doc.addPage();
  }
  renderFn();
  footer(doc, label);
}

/**
 * PLÁN STRÁN (aktuálne podľa tvojho zadania pre "low"):
 * - low + edge-free:  1,2,3,4,5,6,7,8
 * - low + edge-gutter (rýna): 1,2,3,4,5,6,10,9,11
 */
function resolvePagePlan(payload) {
  const heightId = safeText(payload?.calc?.heightId || "").toLowerCase();
  const drainId = safeText(
    payload?.calc?.drainId || payload?.calc?.drain || ""
  ).toLowerCase();

  const key = `${heightId}_${drainId}`.replace(/\s+/g, "");

  if (key === "low_edge-free") return [1, 2, 3, 4, 5, 6, 7, 8];
  if (key === "low_edge-gutter") return [1, 2, 3, 4, 5, 6, 10, 9, 11];

  // fallback, aby nič nespadlo
  const isGutter = drainId.includes("gutter") || drainId.includes("ryn");
  if (isGutter) return [1, 2, 3, 4, 5, 6, 10, 9, 11];
  return [1, 2, 3, 4, 5, 6, 7, 8];
}

/* ===========================
   PDF “UI” helpery (tmavý štýl)
   =========================== */

const COLORS = {
  pageBg: "#020617",
  text: "#f9fafb",
  muted: "#9ca3af",
  border: "#94a3b8", // použijeme s opacity cez strokeOpacity
  panelBg: "#0f172a",
  panelBg2: "#030712",
  accent: "#facc15",
};

function drawPageBackground(doc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.pageBg);
  doc.restore();
}

function drawWatermark(doc, logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) return;

  doc.save();
  doc.opacity(0.06);

  // veľký watermark do stredu
  const maxW = doc.page.width - mm(30);
  const maxH = doc.page.height - mm(50);

  // pdfkit potrebuje šírku alebo výšku; dáme width a nech si zachová pomer
  const x = mm(15);
  const y = mm(30);
  doc.image(logoPath, x, y, { width: maxW, align: "center" });

  doc.opacity(1);
  doc.restore();
}

function roundedPanel(doc, x, y, w, h, opts = {}) {
  const r = opts.r ?? 10;
  const fill = opts.fill ?? COLORS.panelBg;
  const stroke = opts.stroke ?? COLORS.border;
  const strokeOpacity = opts.strokeOpacity ?? 0.7;

  doc.save();
  doc.lineWidth(1);
  doc.strokeColor(stroke);
  doc.opacity(1);
  doc.fillColor(fill);

  // pdfkit: roundedRect
  doc.roundedRect(x, y, w, h, r).fill();

  doc.opacity(strokeOpacity);
  doc.strokeColor(stroke);
  doc.roundedRect(x, y, w, h, r).stroke();

  doc.opacity(1);
  doc.restore();
}

function textBlock(doc, x, y, w, text, opts = {}) {
  doc.save();
  if (opts.fontSize) doc.fontSize(opts.fontSize);
  if (opts.color) doc.fillColor(opts.color);
  if (opts.bold) doc.font("DejaVu").font("DejaVu"); // DejaVu nemá bold variant tu; necháme normal a zvýšime size/kapitálky
  doc.text(text, x, y, { width: w, align: opts.align || "left" });
  doc.restore();
}

function makePdfCode(payload) {
  // ak budete mať vlastné číslo, pošlite ho v payload.meta.pdfCode a použijeme ho
  const given = safeText(payload?.meta?.pdfCode);
  if (given) return given;

  // fallback: krátky kód z času (posledných 6 číslic)
  const n = Date.now().toString();
  return n.slice(-6);
}

/* ===========================
   RENDER STRÁN
   =========================== */

function renderCorePage1(doc, payload, totalPagesGuess = null) {
  const logoPath = getLogoPath();

  // pozadie + watermark
  drawPageBackground(doc);
  drawWatermark(doc, logoPath);

  const pageX = mm(18);
  const pageY = mm(18);
  const contentW = doc.page.width - mm(36);

  // HEADER (logo + code box)
  const headerH = mm(32);
  const codeBoxW = mm(55);

  // logo
  if (fs.existsSync(logoPath)) {
    // približne 32mm výška
    doc.image(logoPath, pageX, pageY, { height: mm(32) });
  }

  // code box vpravo
  const codeX = pageX + contentW - codeBoxW;
  const codeY = pageY + mm(2);

  doc.save();
  doc.fillColor(COLORS.muted).fontSize(8);
  doc.text("Číslo PDF podkladu", codeX, codeY, {
    width: codeBoxW,
    align: "right",
  });
  doc.fillColor(COLORS.accent).fontSize(11);
  doc.text(makePdfCode(payload), codeX, codeY + mm(5), {
    width: codeBoxW,
    align: "right",
  });
  doc.restore();

  // TITLE BLOCK
  const titleY = pageY + headerH + mm(12);
  const titleH = mm(45);

  roundedPanel(doc, pageX, titleY, contentW, titleH, {
    r: 10,
    fill: COLORS.panelBg2,
    strokeOpacity: 0.7,
  });

  const titlePad = mm(10);
  const titleInnerX = pageX + titlePad;
  const titleInnerW = contentW - titlePad * 2;
  let ty = titleY + mm(9);

  doc.save();
  doc.fillColor(COLORS.text);

  doc.fontSize(14);
  doc.text(
    "TECHNICKÝ PODKLAD – BALKÓNOVÁ SKLADBA SCHLÜTER SYSTEMS®",
    titleInnerX,
    ty,
    { width: titleInnerW, align: "center" }
  );

  ty += mm(12);
  doc.fontSize(10.5).fillColor("#e5e7eb");
  doc.text(
    "PDF výpočet a orientačný návrh skladby pre vysunutý balkón",
    titleInnerX,
    ty,
    { width: titleInnerW, align: "center" }
  );

  ty += mm(7);
  doc.fontSize(9).fillColor(COLORS.muted);
  doc.text(
    "Dokument bol vytvorený automaticky na základe údajov z kalkulačky Lištobooku.",
    titleInnerX,
    ty,
    { width: titleInnerW, align: "center" }
  );

  doc.restore();

  // COLUMNS (2 boxy)
  const colsY = titleY + titleH + mm(12);
  const gap = mm(12);
  const colW = (contentW - gap) / 2;
  const boxH = mm(72);

  // ľavý box: Vypracoval
  roundedPanel(doc, pageX, colsY, colW, boxH, {
    r: 8,
    fill: COLORS.panelBg,
    strokeOpacity: 0.7,
  });

  // pravý box: zákazník
  roundedPanel(doc, pageX + colW + gap, colsY, colW, boxH, {
    r: 8,
    fill: COLORS.panelBg,
    strokeOpacity: 0.7,
  });

  const boxPadX = mm(7);
  const boxPadY = mm(6);

  // ľavý box obsah
  let lx = pageX + boxPadX;
  let ly = colsY + boxPadY;
  const lw = colW - boxPadX * 2;

  doc.save();
  doc.fillColor(COLORS.muted).fontSize(8.5);
  doc.text("VYPRACOVAL", lx, ly, { width: lw, align: "left" });

  ly += mm(6);
  doc.fillColor(COLORS.text).fontSize(10.5);
  doc.text("LIŠTOVÉ CENTRUM EU, s.r.o.", lx, ly, { width: lw });

  ly += mm(7);
  doc.fillColor(COLORS.text).fontSize(9.5);
  const leftLines = [
    "Sasinkova 13, 010 01 Žilina",
    "IČO: 45 533 628",
    "DIČ: 2023034046",
    "IČ DPH: SK2023034046",
    "E-mail: bratislava@listovecentrum.sk",
    "Tel.: +421 947 922 181",
    "Vytvorené cez: listobook.sk",
  ];
  leftLines.forEach((t) => {
    doc.text(t, lx, ly, { width: lw });
    ly += mm(5);
  });
  doc.restore();

  // pravý box obsah
  let rx = pageX + colW + gap + boxPadX;
  let ry = colsY + boxPadY;
  const rw = colW - boxPadX * 2;

  const customerName =
    safeText(payload?.calc?.customerName) ||
    safeText(payload?.meta?.customerName) ||
    "—";
  const customerEmail =
    safeText(payload?.meta?.email) ||
    safeText(payload?.calc?.customerEmail) ||
    "—";
  const createdAt =
    safeText(payload?.meta?.createdAt) || skDateTime(new Date());
  const constructionType = safeText(payload?.calc?.typeLabel) || "—";
  const systemTitle = safeText(payload?.calc?.systemTitle) || "—";

  doc.save();
  doc.fillColor(COLORS.muted).fontSize(8.5);
  doc.text("VYPRACOVANÉ PRE ZÁKAZNÍKA", rx, ry, { width: rw });

  ry += mm(6);
  doc.fillColor(COLORS.text).fontSize(10.5);
  doc.text(customerName, rx, ry, { width: rw });

  ry += mm(7);
  doc.fillColor(COLORS.text).fontSize(9.5);
  const rightLines = [
    `E-mail: ${customerEmail}`,
    `Dátum vytvorenia: ${createdAt}`,
    `Typ konštrukcie: ${constructionType}`,
    `Skladba: ${systemTitle}`,
  ];
  rightLines.forEach((t) => {
    doc.text(t, rx, ry, { width: rw });
    ry += mm(5);
  });
  doc.restore();

  // NOTE BLOCK
  const noteY = colsY + boxH + mm(10);
  const noteH = mm(40);

  // dashed border simulujeme ručne: PDFKit podporuje dash
  doc.save();
  doc.fillColor(COLORS.panelBg);
  doc.roundedRect(pageX, noteY, contentW, noteH, 8).fill();
  doc.lineWidth(1);
  doc.strokeColor(COLORS.border);
  doc.opacity(0.7);
  doc.dash(3, { space: 3 });
  doc.roundedRect(pageX, noteY, contentW, noteH, 8).stroke();
  doc.undash();
  doc.opacity(1);
  doc.restore();

  const noteX = pageX + mm(7);
  const noteW = contentW - mm(14);
  let ny = noteY + mm(7);

  doc.save();
  doc.fillColor(COLORS.text).fontSize(9.5);
  doc.text(
    "Tento technický podklad bol vygenerovaný na základe údajov zadaných používateľom v kalkulačke Lištobooku.",
    noteX,
    ny,
    { width: noteW, align: "left" }
  );

  ny += mm(7);
  doc.fillColor(COLORS.text).fontSize(9.5);
  doc.text("Výsledky majú ", noteX, ny, { continued: true, width: noteW });
  doc.fillColor(COLORS.accent).text("orientačný", { continued: true });
  doc.fillColor(COLORS.text).text(
    " charakter a slúžia ako odporúčaná skladba systému Schlüter Systems®."
  );
  doc.restore();

  // (HTML má print footer “Strana 1 / totalPages” – v PDF to riešiš footer() a total pages riešime neskôr ak bude treba)
}

function renderCorePage2(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Jadro: strana 2");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah podľa pdf_balkon_page2.html");
  doc.fillColor("#000");
}

function renderCorePage3(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Jadro: strana 3");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah podľa pdf_balkon_page3.html");
  doc.fillColor("#000");
}

function renderCorePage4(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Jadro: strana 4");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah podľa pdf_balkon_page4.html");
  doc.fillColor("#000");
}

function renderCorePage5(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Jadro: strana 5");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah podľa pdf_balkon_page5.html");
  doc.fillColor("#000");
}

function renderPage6_BARA(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Strana 6 – BARA");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah strany 6 (BARA)");
  doc.fillColor("#000");
}

function renderPage7(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Strana 7");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah strany 7");
  doc.fillColor("#000");
}

function renderPage8(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Strana 8");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah strany 8");
  doc.fillColor("#000");
}

function renderPage10_Ryn(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Strana 10 – RÝNA");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: obsah pre variant rýna");
  doc.fillColor("#000");
}

function renderPage9(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Strana 9 (pôvodná strana 7)");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: sem pôjde obsah “pôvodnej 7”");
  doc.fillColor("#000");
}

function renderPage11(doc) {
  drawPageBackground(doc);
  doc.fontSize(14).fillColor("#f9fafb").text("Strana 11 (pôvodná strana 8)");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#9ca3af").text("TODO: sem pôjde obsah “pôvodnej 8”");
  doc.fillColor("#000");
}

/* ===========================
   HLAVNÝ BUILDER
   =========================== */

function buildBalconyFinalPdfBuffer(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: mm(18), left: mm(18), right: mm(18), bottom: mm(18) },
        info: { Title: "Balkon PDF", Author: "Listobook" },
      });

      const fontPath = getFontPath();
      doc.registerFont("DejaVu", fontPath);
      doc.font("DejaVu");

      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const plan = resolvePagePlan(payload);

      for (const label of plan) {
        if (label === 1) addLabeledPage(doc, 1, () => renderCorePage1(doc, payload));
        else if (label === 2) addLabeledPage(doc, 2, () => renderCorePage2(doc, payload));
        else if (label === 3) addLabeledPage(doc, 3, () => renderCorePage3(doc, payload));
        else if (label === 4) addLabeledPage(doc, 4, () => renderCorePage4(doc, payload));
        else if (label === 5) addLabeledPage(doc, 5, () => renderCorePage5(doc, payload));
        else if (label === 6) addLabeledPage(doc, 6, () => renderPage6_BARA(doc, payload));
        else if (label === 7) addLabeledPage(doc, 7, () => renderPage7(doc, payload));
        else if (label === 8) addLabeledPage(doc, 8, () => renderPage8(doc, payload));
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
