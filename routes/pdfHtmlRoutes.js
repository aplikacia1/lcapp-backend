// routes/pdfHtmlRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");

const router = express.Router();

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatNumSk(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "–";
  return Number(n).toFixed(digits).replace(".", ",");
}

function isoDateTimeSk() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function applyTemplate(html, vars, baseHref) {
  let out = html;

  // {{key}} nahrádzanie
  for (const [k, v] of Object.entries(vars)) {
    const token = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
    out = out.replace(token, safeText(v));
  }

  // doplň <base> (aby fungovali src/href na localhost aj na produkcii)
  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  } else {
    out = out.replace(/<base[^>]*href="[^"]*"[^>]*>/i, `<base href="${baseHref}">`);
  }

  return out;
}

/**
 * PLÁN STRÁN podľa výška + odtok
 * - nízka + voľná hrana: intro + 2..8
 * - nízka + rýna:        intro + 2..6 + 10 + 9 + 11  (ako si písal)
 */
function resolvePlan(payload) {
  const heightId = safeText(payload?.calc?.heightId).toLowerCase();
  const drainId = safeText(payload?.calc?.drainId).toLowerCase();

  const isLow = heightId === "low";
  const isFree = drainId === "edge-free";
  const isGutter = drainId === "edge-gutter" || drainId.includes("gutter") || drainId.includes("ryn");

  if (isLow && isFree) {
    return [
      "pdf_balkon_intro.html",
      "pdf_balkon_page2.html",
      "pdf_balkon_page3.html",
      "pdf_balkon_page4.html",
      "pdf_balkon_page5.html",
      "pdf_balkon_page6.html",
      "pdf_balkon_page7.html",
      "pdf_balkon_page8.html",
    ];
  }

  if (isLow && isGutter) {
    return [
      "pdf_balkon_intro.html",
      "pdf_balkon_page2.html",
      "pdf_balkon_page3.html",
      "pdf_balkon_page4.html",
      "pdf_balkon_page5.html",
      "pdf_balkon_page6.html",
      "pdf_balkon_page10.html",
      "pdf_balkon_page9.html",
      "pdf_balkon_page11.html",
    ];
  }

  // fallback – nech to nikdy “nezomrie”
  return ["pdf_balkon_intro.html", "pdf_balkon_page2.html", "pdf_balkon_page3.html", "pdf_balkon_page4.html"];
}

function buildVars(payload, pageNo, totalPages) {
  const email = safeText(payload?.meta?.email || "");
  const calc = payload?.calc || {};
  const bom = payload?.bom || {};

  // stabilnejší kód (rovnaký počas jedného requestu)
  const pdfCode = safeText(payload?.meta?.pdfCode) || `LC-${Date.now()}`;

  const area = calc?.area;
  const perimeter = calc?.perimeter;

  // TEXTY, ktoré sa objavujú v HTML stránkach
  const shapeLabel = safeText(calc?.shapeLabel || "–");
  const heightLabel = safeText(calc?.heightLabel || "–");
  const drainLabel = safeText(calc?.drainLabel || "–");

  const areaText = area != null ? `${formatNumSk(area, 1)} m²` : "–";
  const perimeterText = perimeter != null ? `${formatNumSk(perimeter, 1)} bm` : "–";

  // orientačne z BOM
  const ditraAreaText =
    bom?.membraneArea != null ? `${formatNumSk(bom.membraneArea, 1)} m²` : (area != null ? `${formatNumSk(area, 1)} m²` : "–");

  const adhesiveBagsText =
    bom?.adhesiveBags != null ? `${safeText(bom.adhesiveBags)} ks` : "–";

  // ak zatiaľ nemáš presnú spotrebu v payload, aspoň niečo rozumne
  const adhesiveConsumptionText =
    (bom?.adhesiveBags != null && area != null && area > 0)
      ? `≈ ${formatNumSk((bom.adhesiveBags * 25) / area, 1)} kg/m²`
      : "–";

  // hrana (ak nie je vypočítané, dáme aspoň perimeter)
  const edgeLengthText =
    perimeter != null ? `${formatNumSk(perimeter, 1)} m` : "–";

  const edgeProfilePiecesText =
    bom?.profilesCount != null ? `${safeText(bom.profilesCount)} ks` : "–";

  // tieto zatiaľ nemáš v payload – nech neostávajú {{...}}
  const systemShortNote = safeText(calc?.systemTitle || "");
  const shapeSketchSvg = ""; // neskôr môžeme generovať SVG podľa tvaru
  const systemCutawayCaption = safeText(calc?.systemTitle || "");
  const collConsumptionText = "–";
  const collPacksText = "–";
  const kebaMetersText = "–";

  // strana 7 – varianty (zatiaľ “–” aby nezostali tokeny)
  const rtProfilePiecesText = edgeProfilePiecesText;
  const rtCornersText = "–";
  const rtConnectorsText = "–";
  const rtColorCode = "–";

  const rwLengthText = edgeLengthText;
  const rwProfilePiecesText = edgeProfilePiecesText;
  const rwCornerCodeAndQty = "–";
  const rwConnectorCodeAndQty = "–";
  const rwColorCode = "–";

  return {
    // header + intro
    pdfCode,
    customerName: safeText(calc?.customerName || "Zákazník"),
    customerEmail: email,
    createdAt: isoDateTimeSk(),
    constructionType: safeText(calc?.typeLabel || ""),
    systemTitle: safeText(calc?.systemTitle || ""),

    // stránkovanie
    totalPages,
    pageNumber: pageNo,

    // najčastejšie tokeny v page2..page8
    shapeLabel,
    heightLabel,
    drainLabel,
    areaText,
    perimeterText,

    // page2
    systemShortNote,
    shapeSketchSvg,
    systemCutawayCaption,

    // page3
    ditraAreaText,
    adhesiveConsumptionText,
    adhesiveBagsText,

    // page5
    kebaMetersText,
    collConsumptionText,
    collPacksText,

    // page6
    edgeLengthText,
    edgeProfilePiecesText,

    // page7
    rtProfilePiecesText,
    rtCornersText,
    rtConnectorsText,
    rtColorCode,
    rwLengthText,
    rwProfilePiecesText,
    rwCornerCodeAndQty,
    rwConnectorCodeAndQty,
    rwColorCode,
  };
}

async function htmlToPdfBuffer(browser, html) {
  const page = await browser.newPage();

  // Dôležité: necháme dobehnúť assety (logo, obrázky…)
  await page.setContent(html, { waitUntil: "networkidle0" });

  // Puppeteer generuje PDF v “print” logike.
  // (Ak chceš tmavý export, dá sa tu prepnúť na screen a zrušiť @media print biele prepísania.)
  await page.emulateMediaType("print");

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });

  await page.close();
  return pdf;
}

async function mergePdfBuffers(buffers) {
  const outDoc = await PDFDocument.create();

  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const pages = await outDoc.copyPages(src, src.getPageIndices());
    pages.forEach((p) => outDoc.addPage(p));
  }

  const merged = await outDoc.save();
  return Buffer.from(merged);
}

// ✅ endpoint voláš z FE: /api/pdf/balkon-final-html
router.post("/balkon-final-html", async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload) return res.status(400).json({ message: "Chýba payload." });

    const plan = resolvePlan(payload);
    const totalPages = plan.length;

    const baseHref = `${req.protocol}://${req.get("host")}/`;

    const htmlPages = plan.map((fileName, idx) => {
      const filePath = path.join(process.cwd(), "public", fileName);
      if (!fs.existsSync(filePath)) throw new Error(`Chýba HTML stránka: ${filePath}`);

      const raw = fs.readFileSync(filePath, "utf8");
      const vars = buildVars(payload, idx + 1, totalPages);
      // pdfCode drž konzistentne počas requestu
      if (!payload.meta) payload.meta = {};
      payload.meta.pdfCode = vars.pdfCode;

      return applyTemplate(raw, vars, baseHref);
    });

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const pdfBuffers = [];
      for (const html of htmlPages) {
        const buf = await htmlToPdfBuffer(browser, html);
        pdfBuffers.push(buf);
      }

      const merged = await mergePdfBuffers(pdfBuffers);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="balkon-final.pdf"');
      return res.status(200).send(merged);
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error("balkon-final-html error:", e);
    return res.status(500).json({ message: e.message || "PDF chyba" });
  }
});

module.exports = router;
