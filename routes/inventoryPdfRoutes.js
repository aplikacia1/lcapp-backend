const express = require("express");
const router = express.Router();

const puppeteer = require("puppeteer");

const InventoryRecord =
  require("../models/InventoryRecord");

const renderInventoryStartHtml =
  require("../utils/renderInventoryStartHtml");

  const {
  sendPdfEmail
} = require("../utils/mailer");

router.get(
  "/start-state/:sessionId/:warehouse",
  async (req, res) => {

    try {

      const warehouse =
        req.params.warehouse || "BA";

        const sessionId =
  req.params.sessionId;

      const records =
  await InventoryRecord.find({

    warehouse

})

        .sort({
          productCode: 1
        });

      const generatedAt =
        new Date().toLocaleString("sk-SK");

      const inventoryDate =
        new Date().toLocaleDateString("sk-SK");

      const html =
        renderInventoryStartHtml({

          warehouse,
          records,
          generatedAt,
          inventoryDate

        });

      const browser =
  await puppeteer.launch({

    headless: true,

    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]

  });

      const page =
        await browser.newPage();

      await page.setContent(

        html,

        {
          waitUntil: "networkidle0"
        }

      );

      const pdfBuffer =
        await page.pdf({

          format: "A4",

          printBackground: true,

          margin: {
            top: "20px",
            right: "20px",
            bottom: "20px",
            left: "20px"
          }

        });

      await browser.close();

      const fileName =

        `inventura-${warehouse}.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`
      );

      res.send(pdfBuffer);

    } catch (err) {

      console.error(err);

      res.status(500).json({

        success: false

      });

    }

  }
);

router.post(
  "/send-start-state-email/:sessionId/:warehouse",
  async (req, res) => {

    try {

      const warehouse =
        req.params.warehouse || "BA";

        const sessionId =
  req.params.sessionId;

      const records =
  await InventoryRecord.find({

    warehouse

})

        .sort({
          productCode: 1
        });

      const generatedAt =
        new Date().toLocaleString("sk-SK");

      const inventoryDate =
        new Date().toLocaleDateString("sk-SK");

      const html =
        renderInventoryStartHtml({

          warehouse,
          records,
          generatedAt,
          inventoryDate

        });

      const browser =
        await puppeteer.launch({

          headless: true

        });

      const page =
        await browser.newPage();

      await page.setContent(

        html,

        {
          waitUntil: "networkidle0"
        }

      );

      const pdfBuffer =
        await page.pdf({

          format: "A4",

          printBackground: true,

          margin: {
            top: "20px",
            right: "20px",
            bottom: "20px",
            left: "20px"
          }

        });

      await browser.close();

      const targetEmail =

        warehouse === "ZA"
          ? "info@listovecentrum.sk"
          : "bratislava@listovecentrum.sk";

      await sendPdfEmail({

        to: targetEmail,

        subject:
          `Inventúrny výstup skladu ${warehouse}`,

        html: `

          <div style="font-family:Arial,sans-serif;">

            <h2>
              Inventúrny výstup
            </h2>

            <p>
              Posielame Vám inventúrny výstup
              z Lištobooku.
            </p>

          </div>

        `,

        pdfBuffer,

        filename:
          `inventura-${warehouse}.pdf`

      });

      res.json({

        success: true

      });

    } catch (err) {

      console.error(err);

      res.status(500).json({

        success: false

      });

    }

  }
);

module.exports = router;