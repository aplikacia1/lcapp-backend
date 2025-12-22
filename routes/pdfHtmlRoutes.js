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

  for (const [k, v] of Object.entries(vars)) {
    const token = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
    out = out.replace(token, safeText(v));
  }

  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  } else {
    out = out.replace(
      /<base[^>]*href="[^"]*"[^>]*>/i,
      `<base href="${baseHref}">`
    );
  }

  return out;
}

function toAbsPublicUrl(baseOrigin, maybePath) {
  if (!maybePath) return "";
  let p = String(maybePath).trim();
  if (!p) return "";

  if (/^https?:\/\//i.test(p)) return p;

  if (p.startsWith("img/")) p = "/" + p;
  if (!p.startsWith("/")) p = "/" + p;

  return baseOrigin.replace(/\/$/, "") + p;
}

function resolvePlan(payload) {
  const heightId = safeText(payload?.calc?.heightId).toLowerCase();
  const drainId = safeText(payload?.calc?.drainId).toLowerCase();

  const isLow = heightId === "low";
  const isFree = drainId === "edge-free";
  const isGutter =
    drainId === "edge-gutter" || drainId.includes("gutter") || drainId.includes("ryn");

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

  return [
    "pdf_balkon_intro.html",
    "pdf_balkon_page2.html",
    "pdf_balkon_page3.html",
    "pdf_balkon_page4.html",
  ];
}

function buildVars(payload, pageNo, totalPages, baseOrigin) {
  const email = safeText(payload?.meta?.email || "");
  const calc = payload?.calc || {};
  const bom = payload?.bom || {};

  const pdfCode = safeText(payload?.meta?.pdfCode) || `LC-${Date.now()}`;

  const area = calc?.area;
  const perimeter = calc?.perimeter;

  const shapeLabel = safeText(calc?.shapeLabel || "–");
  const heightLabel = safeText(calc?.heightLabel || "–");
  const drainLabel = safeText(calc?.drainLabel || "–");

  const areaText = area != null ? `${formatNumSk(area, 1)} m²` : "–";
  const perimeterText = perimeter != null ? `${formatNumSk(perimeter, 1)} bm` : "–";

  const ditraAreaText =
    bom?.membraneArea != null
      ? `${formatNumSk(bom.membraneArea, 1)} m²`
      : area != null
      ? `${formatNumSk(area, 1)} m²`
      : "–";

  const adhesiveBagsText =
    bom?.adhesiveBags != null ? `${safeText(bom.adhesiveBags)} ks` : "–";

  const adhesiveConsumptionText =
    bom?.adhesiveBags != null && area != null && area > 0
      ? `≈ ${formatNumSk((bom.adhesiveBags * 25) / area, 1)} kg/m²`
      : "–";

  const edgeLengthText = perimeter != null ? `${formatNumSk(perimeter, 1)} m` : "–";
  const edgeProfilePiecesText =
    bom?.profilesCount != null ? `${safeText(bom.profilesCount)} ks` : "–";

  const systemShortNote = safeText(calc?.systemTitle || "");
  const shapeSketchSvg = safeText(calc?.shapeSketchSvg || "");
  const systemCutawayCaption = safeText(calc?.systemTitle || "");

  const heightId = safeText(calc?.heightId || "").toLowerCase();
  const drainId = safeText(calc?.drainId || "").toLowerCase();

  let cutawayImage = "";

  if (heightId === "low" && drainId === "edge-free") {
    cutawayImage = "/img/systems/balkon-low-edge-free.png";
  } else if (heightId === "low" && drainId === "edge-gutter") {
    cutawayImage = "/img/systems/balkon-low-edge-gutter.png";
  } else if (heightId === "low" && drainId === "internal-drain") {
    cutawayImage = "/img/systems/balkon-low-internal-drain.png";
  } else if (heightId === "medium" && drainId === "edge-free") {
    cutawayImage = "/img/systems/balkon-edge-free.png";
  } else if (heightId === "medium" && drainId === "edge-gutter") {
    cutawayImage = "/img/systems/balkon-edge-gutter.png";
  } else if (heightId === "medium" && drainId === "internal-drain") {
    cutawayImage = "/img/systems/balkon-internal-drain.png";
  } else if (heightId === "high" && drainId === "edge-gutter") {
    cutawayImage = "/img/systems/balkon-high-edge-gutter.png";
  } else if (heightId === "high" && drainId === "internal-drain") {
    cutawayImage = "/img/systems/balkon-high-internal-drain.png";
  }

  const fromCalcPreview = safeText(calc?.previewSrc);
  if (fromCalcPreview) {
    cutawayImage = fromCalcPreview.startsWith("/")
      ? fromCalcPreview
      : fromCalcPreview.startsWith("img/")
      ? "/" + fromCalcPreview
      : fromCalcPreview;
  }

  const systemCutawayImageAbs = cutawayImage
    ? toAbsPublicUrl(baseOrigin, cutawayImage)
    : "";

  return {
    baseUrl: baseOrigin.replace(/\/$/, ""),
    pdfCode,
    customerName: safeText(calc?.customerName || "Zákazník"),
    customerEmail: email,
    createdAt: isoDateTimeSk(),
    constructionType: safeText(calc?.typeLabel || ""),
    systemTitle: safeText(calc?.systemTitle || ""),

    totalPages,
    pageNumber: pageNo,

    shapeLabel,
    heightLabel,
    drainLabel,
    areaText,
    perimeterText,

    systemShortNote,
    shapeSketchSvg,
    systemCutawayCaption,

    systemCutawayImageAbs,

    ditraAreaText,
    adhesiveConsumptionText,
    adhesiveBagsText,

    edgeLengthText,
    edgeProfilePiecesText,
  };
}

async function htmlToPdfBuffer(browser, html) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.emulateMediaType("screen");

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

function cleanPath(p) {
  return (p || "").toString().trim();
}

/**
 * Render-friendly nájdenie Chromu + tvrdá diagnostika.
 */
function findChromeExecutable() {
  const envPath = cleanPath(process.env.PUPPETEER_EXECUTABLE_PATH);
  if (envPath) {
    const ok = fs.existsSync(envPath);
    console.log("[PDF] env PUPPETEER_EXECUTABLE_PATH:", JSON.stringify(envPath), "exists:", ok);
    if (ok) return envPath;
  }

  try {
    const p = cleanPath(puppeteer.executablePath());
    const ok = p ? fs.existsSync(p) : false;
    console.log("[PDF] puppeteer.executablePath():", JSON.stringify(p), "exists:", ok);
    if (p && ok) return p;
  } catch (e) {
    console.log("[PDF] puppeteer.executablePath() error:", e?.message || e);
  }

  return "";
}

// ✅ endpoint voláš z FE: /api/pdf/balkon-final-html
router.post("/balkon-final-html", async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload) return res.status(400).json({ message: "Chýba payload." });

    const plan = resolvePlan(payload);
    const totalPages = plan.length;
    const baseOrigin = `${req.protocol}://${req.get("host")}`;

    const htmlPages = plan.map((fileName, idx) => {
      const filePath = path.join(process.cwd(), "public", fileName);
      if (!fs.existsSync(filePath)) throw new Error(`Chýba HTML stránka: ${filePath}`);

      const raw = fs.readFileSync(filePath, "utf8");
      const vars = buildVars(payload, idx + 1, totalPages, baseOrigin);

      if (!payload.meta) payload.meta = {};
      payload.meta.pdfCode = vars.pdfCode;

      const baseHref = `${baseOrigin}/`;
      return applyTemplate(raw, vars, baseHref);
    });

    const chromePath = findChromeExecutable();
    console.log("[PDF] chromePath used:", chromePath ? JSON.stringify(chromePath) : "(empty)");

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        executablePath: chromePath || undefined,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } catch (launchErr) {
      console.error("[PDF] puppeteer launch error:", launchErr);
      return res.status(500).json({
        message:
          "Chyba pri generovaní PDF: nepodarilo sa spustiť Chromium/Chrome na Renderi. Pozri logy (executablePath exists?).",
      });
    }

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
