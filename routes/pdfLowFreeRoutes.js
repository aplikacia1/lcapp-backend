const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const router = express.Router();

router.post("/low-free", async (req, res) => {
  console.log("LOW FREE ROUTE STARTED");
  try {
    const payload = req.body || {};
    const calc = payload.calc || payload.bom || {};
    const customer = payload.customer || payload.pdfMeta || {};
    const systemImage = calc.previewSrc
  ? "https://listobook.sk/" + calc.previewSrc
  : "";

    const templatePath = path.join(
      process.cwd(),
      "public",
      "pdf",
      "low_free.html"
    );

    let html = fs.readFileSync(templatePath, "utf8");

    html = html
      .replaceAll("{{ROOT}}", process.cwd())

      .replaceAll("{{area}}", calc.area || "")
      .replaceAll("{{perimeter}}", calc.perimeter || "")

      .replaceAll("{{shapeLabel}}", calc.shapeLabel || "")
      .replaceAll("{{systemTitle}}", calc.systemTitle || "")
      .replaceAll("{{heightLabel}}", calc.heightLabel || "")
      .replaceAll("{{drainLabel}}", calc.drainLabel || "")

      .replaceAll("{{tile}}", calc.tileThicknessMm || "")
      .replaceAll("{{tiles}}", calc.tileSizeCm || "")

      .replaceAll("{{customerName}}", payload.meta?.email || "")
      .replaceAll("{{customerCompany}}", customer.company || "")
      .replaceAll("{{customerEmailLine}}", customer.email ? customer.email : "")

      .replaceAll("{{projectLabel}}", "Balkón – vysunutý")
      .replaceAll("{{pdfCode}}", payload.meta?.pdfCode || "")

      .replaceAll("{{date}}", new Date().toLocaleDateString("sk-SK"))
      .replaceAll("{{systemImage}}", systemImage);

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--allow-file-access-from-files"
      ]
    });

    const page = await browser.newPage();
   
    await page.setContent(html, {
      waitUntil: "domcontentloaded"
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);

  } catch (err) {
    console.error("LOW FREE PDF ERROR:", err);
    res.status(500).send("PDF generation error");
  }
});

module.exports = router;