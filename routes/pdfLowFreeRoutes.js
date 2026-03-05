const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const router = express.Router();

router.post("/low-free", async (req, res) => {
  try {
    const payload = req.body || {};
    const calc = payload.calc || {};

    const templatePath = path.join(
      process.cwd(),
      "public",
      "pdf",
      "low_free.html"
    );

    let html = fs.readFileSync(templatePath, "utf8");

    html = html
      .replaceAll("{{area}}", calc.area || "")
      .replaceAll("{{perimeter}}", calc.perimeter || "")
      .replaceAll("{{tile}}", calc.tileThicknessMm || "")
      .replaceAll("{{tiles}}", calc.tileSizeCm || "");

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

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