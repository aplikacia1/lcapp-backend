const express = require("express");
const router = express.Router();






const {
  generateInventoryPdfBuffer
} = require("../utils/pdf/pdfInventory");

const {
  generateInventoryPdfBuffer: generateInventoryFinalPdfBuffer
} = require("../utils/pdf/pdfInventoryFinal");

const InventoryRecord =
  require("../models/InventoryRecord");



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

      const pdfBuffer =
  await generateInventoryPdfBuffer({

    warehouse,
    records,
    generatedAt,
    inventoryDate

  });

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

router.get(
  "/final-state/:sessionId/:warehouse",
  async (req, res) => {

    try {

      const warehouse =
        req.params.warehouse || "BA";

      const sessionId =
        req.params.sessionId;

      const stockRecords =
  await InventoryRecord.find({

    warehouse,
    sessionId: null

  }).sort({

    productCode: 1

  });

const countedRecords =
  await InventoryRecord.find({

    sessionId,
    warehouse

  });

const countedMap =
  new Map();

countedRecords.forEach((item) => {

  countedMap.set(
    item.productCode,
    item
  );

});

const records =
  stockRecords.map((item) => {

    const counted =
      countedMap.get(item.productCode);

    const countedQty =
      counted
        ? counted.countedQty
        : null;

    return {

      productCode: item.productCode,
      productName: item.productName,
      systemStock: item.systemStock,
      countedQty,
      difference:
        countedQty === null
          ? null
          : countedQty - item.systemStock,

      countedBy:
        counted?.countedBy || "",

      countedAt:
        counted?.countedAt || null

    };

  });

      const pdfBuffer =
  await generateInventoryFinalPdfBuffer({

    warehouse,
    records,
    generatedAt:
      new Date().toLocaleString("sk-SK"),

    inventoryDate:
      new Date().toLocaleDateString("sk-SK")

  });

res.setHeader(
  "Content-Type",
  "application/pdf"
);

res.setHeader(
  "Content-Disposition",
  `inline; filename="final-state-${warehouse}.pdf"`
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

      const pdfBuffer =
  await generateInventoryPdfBuffer({

    warehouse,
    records,
    generatedAt,
    inventoryDate

  });

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

router.post(
  "/send-final-state-email/:sessionId/:warehouse",
  async (req, res) => {

    try {

      const warehouse =
        req.params.warehouse || "BA";

      const sessionId =
        req.params.sessionId;

      const stockRecords =
        await InventoryRecord.find({

          warehouse,
          sessionId: null

        }).sort({

          productCode: 1

        });

      const countedRecords =
        await InventoryRecord.find({

          sessionId,
          warehouse

        });

      const countedMap =
        new Map();

      countedRecords.forEach((item) => {

        countedMap.set(
          item.productCode,
          item
        );

      });

      const records =
        stockRecords.map((item) => {

          const counted =
            countedMap.get(
              item.productCode
            );

          const countedQty =
            counted
              ? counted.countedQty
              : null;

          return {

            productCode:
              item.productCode,

            productName:
              item.productName,

            systemStock:
              item.systemStock,

            countedQty,

            difference:
              countedQty === null
                ? null
                : countedQty -
                  item.systemStock

          };

        });

      const pdfBuffer =
        await generateInventoryFinalPdfBuffer({

          warehouse,

          records,

          generatedAt:
            new Date()
              .toLocaleString("sk-SK"),

          inventoryDate:
            new Date()
              .toLocaleDateString("sk-SK")

        });

      const targetEmail =

        warehouse === "ZA"
          ? "info@listovecentrum.sk"
          : "bratislava@listovecentrum.sk";

      await sendPdfEmail({

        to: targetEmail,

        subject:
          `Konečný inventúrny stav skladu ${warehouse}`,

        html: `

          <div style="font-family:Arial,sans-serif;">

            <h2>
              Konečný inventúrny stav
            </h2>

            <p>
              V prílohe sa nachádza
              finálny inventúrny výstup
              skladu ${warehouse}.
            </p>

          </div>

        `,

        pdfBuffer,

        filename:
          `final-state-${warehouse}.pdf`

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