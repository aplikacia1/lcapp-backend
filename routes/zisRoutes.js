const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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
 * GET /api/zis/barcode/:code
 * vyhľadanie podľa čiarového alebo produktového kódu
 */
router.get("/barcode/:code", async (req, res) => {

  try {

    const code =
      String(req.params.code || "").trim();

    const card =
      await ZisCard.findOne({

        active: true,

        $or: [

          { barcodes: code },

          { productCodes: code }

        ]

      }).populate("productId");

    if (!card) {

      return res.status(404).json({
        message: "Karta sa nenašla."
      });

    }

    res.json(card);

  } catch (err) {

    console.error(
      "GET /api/zis/barcode/:code:",
      err
    );

    res.status(500).json({
      message: "Chyba pri vyhľadávaní."
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
        const existingCard = await ZisCard.findOne({
      productId: req.body.productId
    });

    if (existingCard) {
      return res.status(409).json({
        exists: true,
        id: existingCard._id,
        message: "Produkt už má ZIS kartu."
      });
    }
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

/*
 * GET /api/zis/categories/:keyword
 *
 * Vráti kategórie,
 * v ktorých sa nachádzajú ZIS karty
 * obsahujúce zadané kľúčové slovo.
 */
function normalizeZis(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/*
 * GET /api/zis/categories/:keyword
 * vráti kategórie podľa kľúčového slova
 */
router.get("/categories/:keyword", async (req, res) => {
  try {
    const keyword = normalizeZis(req.params.keyword);

    const cards = await ZisCard.find({ active: true }).lean();

    const categories = {};

    cards.forEach(card => {
      const keywords = (card.keywords || []).map(k => normalizeZis(k));

      const match = keywords.some(k =>
        k.includes(keyword) || keyword.includes(k)
      );

      if (!match) return;

      (card.categories || []).forEach(category => {
        if (!categories[category]) {
          categories[category] = {
            name: category,
            count: 0,
            image: ""
          };
        }

        categories[category].count++;
      });
    });

    const docs = await mongoose.connection.db
      .collection("categories")
      .find({})
      .toArray();

      console.log("POČET KATEGÓRIÍ:", docs.length);
console.log(docs.slice(0,5));

    const imageByName = {};

    docs.forEach(doc => {
      imageByName[normalizeZis(doc.name)] = doc.image || "";
    });

    const out = Object.values(categories).map(cat => ({
      ...cat,
      image: imageByName[normalizeZis(cat.name)] || ""
    }));
console.log(JSON.stringify(out, null, 2));
    res.json(out);

  } catch (err) {
    console.error("GET /api/zis/categories/:keyword:", err);
    res.status(500).json({
      message: "Chyba pri vyhľadávaní kategórií."
    });
  }
});

/*
 * GET /api/zis/cards/:keyword/:category
 * vráti ZIS karty podľa kľúčového slova a kategórie
 */
router.get("/cards/:keyword/:category", async (req, res) => {
  try {
    const keyword = normalizeZis(req.params.keyword);
    const category = String(req.params.category || "").trim();

    const cards = await ZisCard.find({ active: true })
      .populate("productId")
      .sort({ createdAt: -1 })
      .lean();

    const result = cards.filter(card => {
      const keywords = (card.keywords || [])
        .map(k => normalizeZis(k));

      const keywordMatch = keywords.some(k =>
        k.includes(keyword) || keyword.includes(k)
      );

      const categoryMatch = (card.categories || [])
        .includes(category);

      return keywordMatch && categoryMatch;
    });

    res.json(result);
  } catch (err) {
    console.error("GET /api/zis/cards/:keyword/:category:", err);
    res.status(500).json({
      message: "Chyba pri vyhľadávaní ZIS kariet."
    });
  }
});

module.exports = router;