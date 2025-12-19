// routes/pdfHtmlRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");

const router = express.Router();

/* ================== HELPERS ================== */

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatNumSk(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return Number(n).toFixed(digits).replace(".", ",");
}

function isoDateTimeSk() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    pad(d.getDate()) +
    "." +
    pad(d.getMonth() + 1) +
    "." +
    d.getFullYear() +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

/* ================== TEMPLATE ================== */

function applyTemplate(html, vars, baseHref) {
  let out = html;

  for (const [k, v] of Object.entries(vars)) {
    const token = new RegExp("\\{\\{\\s*" + k + "\\s*\\}\\}", "g");
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

/* ================== PLAN ================== */

function resolvePlan(payload) {
  const heightId = safeText(payload?.calc?.heightId).toLowerCase();
  const drainId = safeText(payload?.calc?.drainId).toLowerCase();

  if (heightId === "low" && drainId === "edge-free") {
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

  if (heightId === "low" && drainId.includes("gutter")) {
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

/* ================== BUILD VARS ================== */

function buildVars(payload, pageNo, totalPages, baseOrigin) {
  const calc = payload?.calc || {};
  const bom = payload?.bom || {};

  const pdfCode = payload?.meta?.pdfCode || "LC-" + Date.now();

  const cutawayImage =
    calc?.previewSrc ||
    "/img/systems/balkon-" +
      safeText(calc?.heightId || "low") +
      "-" +
      safeText(calc?.drainId || "edge-free") +
      ".png";

  return {
    baseUrl: baseOrigin.replace(/\/$/, ""),
    pdfCode,
    customerName: safeText(calc?.customerName || "Zakaznik"),
    createdAt: isoDateTimeSk(),
    pageNumber: pageNo,
    totalPages,
    systemCutawayImageAbs: toAbsPublicUrl(baseOrigin, cutawayImage),
    areaText:
      calc?.area != null ? formatNumSk(calc.area, 1) + " m2" : "-",
    perimeterText:
      calc?.perimeter != null ? formatNumSk(calc.perimeter, 1) + " bm" : "-",
  };
}

/* ================== CHROME FINDER ================== */

function findRenderChromeExecutable() {
  if (
    process.env.PUPPETEER_EXECUTABLE_PATH &&
    fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)
  ) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  try {
    const p = puppeteer.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch (e) {}

  const base = "/opt/render/.cache/puppeteer/chrome";
  if (fs.existsSync(base)) {
    const dirs = fs.readdirSync(base);
    for (const d of dirs) {
      const candidate = path.join(
        base,
        d,
        "chrome-linux64",
        "chrome"
      );
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return "";
}

/* ================== PDF ================== */

async function htmlToPdfBuffer(browser, html) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.emulateMediaType("screen");
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
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
  return Buffer.from(await outDoc.save());
}

/* ================== ROUTE ================== */

router.post("/balkon-final-html", async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload) return res.status(400).json({ message: "Missing payload" });

    const plan = resolvePlan(payload);
    const baseOrigin = `${req.protocol}://${req.get("host")}`;

    const htmlPages = plan.map((file, idx) => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "public", file),
        "utf8"
      );
      const vars = buildVars(payload, idx + 1, plan.length, baseOrigin);
      return applyTemplate(raw, vars, baseOrigin + "/");
    });

    const chromePath = findRenderChromeExecutable();
    if (!chromePath) throw new Error("Chrome not found");

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const buffers = [];
      for (const html of htmlPages) {
        buffers.push(await htmlToPdfBuffer(browser, html));
      }

      const merged = await mergePdfBuffers(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="balkon-final.pdf"'
      );
      res.send(merged);
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error("PDF ERROR:", e);
    res.status(500).json({ message: e.message || "PDF error" });
  }
});

module.exports = router;
