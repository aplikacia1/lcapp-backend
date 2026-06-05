const express = require("express");
const router = express.Router();

const InventoryRecord = require("../models/InventoryRecord");

const InventorySession =
  require("../models/InventorySession");

  router.post("/session/create", async (req, res) => {

  try{

    const {
  createdBy,
  warehouse
} = req.body;

    const expiresAt =
      new Date(
        Date.now() +
        15 * 24 * 60 * 60 * 1000
      );

    const session =
      await InventorySession.create({

  name:
    "Inventúra " +
    new Date().toLocaleDateString("sk-SK"),

  warehouse:
  warehouse || "BA",

  createdByEmail:
    createdBy,

  allowedUsers: [
    createdBy
  ],

  startedAt:
    new Date(),

  expiresAt,

  status: "active"

});

    res.json({

      success: true,

      session: {

        id: session._id

      }

    });

  }catch(err){

    console.error(err);

    res.status(500).json({

      success: false

    });

  }

});

router.post("/save", async (req, res) => {  

  try {

    const {
      sessionId,
      warehouse,
      productCode,
      productName,
      systemStock,
      countedQty,
      countedBy
    } = req.body;

    const existing = await InventoryRecord.findOne({

      sessionId,

      warehouse,

      productCode

    });

    if (existing) {

      existing.productName = productName;
      existing.systemStock = systemStock;
      existing.countedQty = countedQty;
      existing.countedBy = countedBy;
      existing.countedAt = new Date();

      await existing.save();

      return res.json({
        success: true,
        updated: true
      });
    }

    await InventoryRecord.create({
      sessionId,
      warehouse,
      productCode,
      productName,
      systemStock,
      countedQty,
      countedBy
    });

    res.json({
      success: true,
      created: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

router.get("/all", async (req, res) => {

  try {

    const records = await InventoryRecord.find()
      .sort({ countedAt: -1 });

    res.json(records);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

router.get("/product/:code", async (req, res) => {

  try {

    const code = req.params.code.trim();

    const product = await InventoryRecord.findOne({

  warehouse: req.query.warehouse || "BA",

  $or: [

    {
      productCode: {
        $regex: new RegExp("^" + code + "$", "i")
      }
    },

    {
      barcode: {
        $regex: new RegExp("^" + code + "$", "i")
      }
    }

  ]

});

    if (!product) {

      return res.json({
        success: false
      });

    }

    res.json({

      success: true,

      product: {

        code: product.productCode,

        name: product.productName,

        stock: product.systemStock,

        warehouse: product.warehouse

      }

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

router.get("/check-product/:code", async (req, res) => {

  try {

    const code =
      req.params.code.trim();

    const records =
  await InventoryRecord.find({

    $or: [

      {
        productCode: {
          $regex: new RegExp(
            "^" + code + "$",
            "i"
          )
        }
      },

      {
        barcode: {
          $regex: new RegExp(
            "^" + code + "$",
            "i"
          )
        }
      }

    ]

  });

    if (!records.length) {

      return res.json({
        success: false
      });

    }

    const productBA =
      records.find(r => r.warehouse === "BA");

    const productZA =
      records.find(r => r.warehouse === "ZA");

    const first =
      productBA || productZA;

    res.json({

      success: true,

      product: {

        code: first.productCode,

        name: first.productName,

        stockBA:
          productBA
            ? productBA.systemStock
            : 0,

        stockZA:
          productZA
            ? productZA.systemStock
            : 0,

        price:
  first.priceWithVat || 0,

description:
  first.description || "Bez popisu."

      }

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

router.delete("/session/delete/:id", async (req, res) => {

  try {

    const sessionId =
      req.params.id;

    await InventoryRecord.deleteMany({

      sessionId

    });

    await InventorySession.findByIdAndDelete(
      sessionId
    );

    res.json({

      success: true

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false

    });

  }

});

router.get("/sessions", async (req, res) => {

  try {

    const sessions =
      await InventorySession.find({

        status: "active"

      })

      .sort({
        startedAt: -1
      });

    res.json({

      success: true,

      sessions

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false

    });

  }

});

module.exports = router;

