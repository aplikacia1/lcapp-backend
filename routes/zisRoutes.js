const express = require("express");
const router = express.Router();

const ZisCard = require("../models/ZisCard");

/*
 * GET /api/zis
 * všetky ZIS karty
 */
router.get("/", async (req, res) => {
  try {
    const cards = await ZisCard.find()
      .populate("productId")
      .sort({ createdAt: -1 });

    res.json(cards);
  } catch (err) {
    console.error("GET /api/zis:", err);
    res.status(500).json({
      message: "Chyba pri načítaní ZIS kariet"
    });
  }
});

/*
 * GET /api/zis/:id
 * jedna ZIS karta
 */
router.get("/:id", async (req, res) => {
  try {
    const card = await ZisCard.findById(req.params.id)
      .populate("productId");

    if (!card) {
      return res.status(404).json({
        message: "ZIS karta neexistuje"
      });
    }

    res.json(card);
  } catch (err) {
    console.error("GET /api/zis/:id:", err);
    res.status(500).json({
      message: "Chyba pri načítaní ZIS karty"
    });
  }
});

/*
 * POST /api/zis
 * vytvorenie karty
 */
router.post("/", async (req, res) => {
  try {
    const card = await ZisCard.create({
  productId: req.body.productId,

  manufacturer: req.body.manufacturer || "",

  youtubeUrl: req.body.youtubeUrl || "",

  barcodes: req.body.barcodes || [],
  productCodes: req.body.productCodes || [],

  categories: req.body.categories || [],
  keywords: req.body.keywords || [],

  active:
    req.body.active === undefined
      ? true
      : req.body.active,

  adminNote: req.body.adminNote || "",

  content: req.body.content || ""
});

    res.status(201).json(card);
  } catch (err) {
    console.error("POST /api/zis:", err);
    res.status(500).json({
      message: "Chyba pri vytváraní ZIS karty"
    });
  }
});

/*

PUT /api/zis/

úprava karty
*/
router.put("/:id", async (req, res) => {
try {

const card = await ZisCard.findById(req.params.id);

if (!card) {
return res.status(404).json({
message: "ZIS karta neexistuje"
});
}

card.productId = req.body.productId;
card.manufacturer = req.body.manufacturer || "";
card.youtubeUrl = req.body.youtubeUrl || "";

card.barcodes = req.body.barcodes || [];
card.productCodes = req.body.productCodes || [];

card.categories = req.body.categories || [];
card.keywords = req.body.keywords || [];

card.adminNote = req.body.adminNote || "";

card.content = req.body.content || "";

card.active =
req.body.active === undefined
? true
: req.body.active;

await card.save();

res.json(card);

} catch (err) {

console.error("PUT /api/zis/:id:", err);

res.status(500).json({
  message: "Chyba pri úprave ZIS karty"
});

}
});

/*
 * DELETE /api/zis/:id
 * zmazanie karty
 */
router.delete("/:id", async (req, res) => {
  try {
    const card = await ZisCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        message: "ZIS karta neexistuje"
      });
    }

    await card.deleteOne();

    res.json({
      ok: true
    });
  } catch (err) {
    console.error("DELETE /api/zis/:id:", err);
    res.status(500).json({
      message: "Chyba pri mazaní ZIS karty"
    });
  }
});

module.exports = router;