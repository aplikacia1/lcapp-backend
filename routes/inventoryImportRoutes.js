const express = require("express");
const router = express.Router();

const multer = require("multer");
const XLSX = require("xlsx");

const InventoryRecord = require("../models/InventoryRecord");

const upload = multer({
  dest: "uploads/"
});

router.post("/upload-xlsx", upload.single("file"), async (req, res) => {

  try {

    const warehouse = req.body.warehouse || "BA";

    if (!req.file) {

      return res.status(400).json({
        success: false,
        message: "Súbor nebol nahratý"
      });

    }

    await InventoryRecord.deleteMany({
      warehouse
    });

    const workbook = XLSX.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;

    for (const row of data) {

      const productCode = row["Číslo karty"] || "";
      const productName = row["Názov"] || "";
      const systemStock = Number(row["Množstvo"] || 0);
      const barcode = row["Čiarový kód"] || "";
      const priceWithVat =
  Number(
    row["Predajná cena s DPH 1"] ||
    row["Predajná cena s DPH"] ||
    0
  );

      if (!productCode) continue;

      await InventoryRecord.create({

        warehouse,

        productCode,

        productName,

        systemStock,

        barcode,

        priceWithVat

      });

      imported++;

    }

    res.json({

      success: true,

      warehouse,

      imported

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

module.exports = router;