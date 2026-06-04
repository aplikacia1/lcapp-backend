const express = require("express");

const router = express.Router();

const multer = require("multer");
const XLSX = require("xlsx");

const TransferOut = require("../models/TransferOut");
const TransferIn = require("../models/TransferIn");

const upload = multer({
  dest: "uploads/"
});

router.post(
  "/upload-transfer-out",
  upload.single("file"),
  async (req, res) => {

    try {

      const warehouse =
        req.body.warehouse || "BA";

      if (!req.file) {

        return res.status(400).json({
          success: false
        });
      }

      const workbook = XLSX.readFile(
        req.file.path
      );

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const data =
        XLSX.utils.sheet_to_json(sheet);

      await TransferOut.deleteMany({
        warehouse
      });

      let imported = 0;

      for (const row of data) {

        const documentNumber =
          row["Doklad"] ||
          row["Číslo dokladu"] ||
          "";

        const productCode =
          row["Číslo"] ||
          row["Číslo karty"] ||
          "";

        const productName =
          row["Názov"] || "";

        const qty = Number(
          row["Množstvo"] || 0
        );

        if (!documentNumber) continue;

        let transfer =
          await TransferOut.findOne({
            warehouse,
            documentNumber
          });

        if (!transfer) {

          transfer =
            await TransferOut.create({

              warehouse,

              documentNumber,

              items: []

            });
        }

        transfer.items.push({

          productCode,
          productName,
          qty

        });

        await transfer.save();

        imported++;
      }

      res.json({
        success: true,
        imported
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