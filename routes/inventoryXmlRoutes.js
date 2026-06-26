const express = require("express");
const router = express.Router();

const InventoryRecord =
  require("../models/InventoryRecord");

router.post(
  "/with-zero/:sessionId/:warehouse",
  async (req, res) => {

    const warehouse =
  req.params.warehouse;

const sessionId =
  req.params.sessionId;

const stockRecords =
  await InventoryRecord.find({

    warehouse,
    sessionId: null

  });

const countedRecords =
  await InventoryRecord.find({

    warehouse,
    sessionId

  });

const countedMap =
  new Map();

countedRecords.forEach(item => {

  countedMap.set(
    item.productCode,
    item
  );

});

const xmlRows =
  stockRecords.map(r => {

  return `
<Card>
  <Code>${r.productCode || ""}</Code>
  <Name>${r.productName || ""}</Name>
  <FinalStock>0</FinalStock>
</Card>`;

}).join("");

res.json({
  success: true,
  message: `XML pripravené pre ${stockRecords.length} kariet`,
  preview: xmlRows.substring(0, 500)
});

  }
);

router.post(
  "/with-empty/:sessionId/:warehouse",
  async (req, res) => {

    res.json({
      success: true,
      message: "XML + prázdne stavy endpoint funguje"
    });

  }
);

module.exports = router;