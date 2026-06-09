const express = require("express");
const router = express.Router();

const XLSX = require("xlsx");

const InventoryRecord =
  require("../models/InventoryRecord");

router.get("/test", async (req, res) => {

  try {

    const data = [
      {
        kod: "TEST001",
        nazov: "Skúšobný produkt",
        stav: 10
      },
      {
        kod: "TEST002",
        nazov: "Druhý produkt",
        stav: 25
      }
    ];

    const workbook =
      XLSX.utils.book_new();

    const worksheet =
      XLSX.utils.json_to_sheet(data);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Inventura"
    );

    const buffer =
      XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx"
      });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="test.xlsx"'
    );

    res.send(buffer);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

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
    warehouse
  });

      const countedRecords =
        await InventoryRecord.find({
          warehouse,
          sessionId
        });

      const countedMap =
        new Map();

      countedRecords.forEach((item) => {
        countedMap.set(
          item.productCode,
          item
        );
      });

      const rows = [
  [
    "Číslo karty",
    "Názov",
    "Doplňujúci text",
    "Množstvo v evidencii",
    "Množstvo fyzické",
    "Variant",
    "Rozdiel",
    "Manko",
    "Prebytok",
    "MJ",
    "Obstar. cena bez DPH",
    "Predajná cena bez DPH 1",
    "Predajná cena s DPH 1",
    "Čiarový kód",
    "Skladová skupina",
    "Tovarová skupina",
    "Umiestnenie",
    "Inventarizoval",
    "Dátum inventúry",
    "Sklad"
  ]
];

      stockRecords.forEach((item) => {

        const counted =
          countedMap.get(item.productCode);

        const wasCounted =
          counted &&
          counted.countedQty !== undefined &&
          counted.countedQty !== null;

        const systemStock =
          Number(item.systemStock || 0);

        const countedQty =
          wasCounted
            ? Number(counted.countedQty)
            : "";

        const difference =
          wasCounted
            ? countedQty - systemStock
            : "";

        const manko =
          wasCounted && difference < 0
            ? Math.abs(difference)
            : wasCounted
              ? 0
              : "";

        const prebytok =
          wasCounted && difference > 0
            ? difference
            : wasCounted
              ? 0
              : "";

        rows.push([
  item.productCode || "",
  item.productName || "",
  "",
  systemStock,
  countedQty,
  "",
  difference,
  manko,
  prebytok,
  "",
  "",
  "",
  item.priceWithVat || "",
  item.barcode || "",
  "",
  "",
  "",
  wasCounted
    ? counted.countedBy || ""
    : "",
  wasCounted && counted.countedAt
    ? new Date(counted.countedAt)
        .toLocaleString("sk-SK")
    : "",
  warehouse
]);

      });

      const workbook =
        XLSX.utils.book_new();

      const worksheet =
        XLSX.utils.aoa_to_sheet(rows);

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Inventura"
      );

      const buffer =
        XLSX.write(workbook, {
          type: "buffer",
          bookType: "xlsx"
        });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="oberon-inventura-${warehouse}.xlsx"`
      );

      res.send(buffer);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false
      });

    }

  }
);

module.exports = router;