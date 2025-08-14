// routes/productRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");

const Product = require("../models/product");
const Category = require("../models/category");
const Rating = require("../models/rating");

const router = express.Router();

/* ---------------------------- Upload obrázkov ---------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // => /server/uploads
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

/* ------------------------------ PRIDAŤ PRODUKT ------------------------------ */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    let { categoryId, name, code, price, unit, description } = req.body;
    if (Array.isArray(categoryId)) categoryId = categoryId[0];

    const image = req.file ? req.file.filename : "";

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return res.status(400).json({ message: "Cena musí byť číslo." });
    }

    const newProduct = new Product({
      categoryId,
      name,
      code,
      price: parsedPrice,
      unit,
      description,
      image,
    });

    await newProduct.save();
    res.status(201).json({ message: "✅ Produkt pridaný." });
  } catch (error) {
    console.error("❌ Chyba pri ukladaní produktu:", error);
    res.status(500).json({ message: "Nepodarilo sa pridať produkt." });
  }
});

/* ------- PRODUKTY PODĽA KATEGÓRIE (vrátane počtu a priemeru hodnotení) ------ */
router.get("/byCategory/:id", async (req, res) => {
  try {
    const products = await Product.find({ categoryId: req.params.id });
    const category = await Category.findById(req.params.id);
    const categoryName = category ? category.name : "";

    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // efektívnejšie: z ratingov berieme iba "stars"
        const ratings = await Rating.find(
          { productId: product._id },
          { stars: 1 }
        );

        const ratingCount = ratings.length;
        const averageRating = ratingCount
          ? Number(
              (
                ratings.reduce((sum, r) => sum + r.stars, 0) / ratingCount
              ).toFixed(1)
            )
          : 0; // ak ešte nikto nehodnotil, pošleme 0

        return {
          ...product.toObject(),
          categoryName,
          ratingCount,
          averageRating,
        };
      })
    );

    res.json(enrichedProducts);
  } catch (error) {
    console.error("❌ Chyba pri načítaní produktov:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať produkty." });
  }
});

/* ----------------------------- DETAIL PRODUKTU ---------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Produkt sa nenašiel." });
    res.json(product);
  } catch (error) {
    console.error("❌ Chyba pri načítaní produktu:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať produkt." });
  }
});

/* ------------------------------ UPRAVIŤ PRODUKT ------------------------------ */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    let { categoryId, name, code, price, unit, description } = req.body;
    if (Array.isArray(categoryId)) categoryId = categoryId[0];

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return res.status(400).json({ message: "Cena musí byť číslo." });
    }

    const updateData = {
      categoryId,
      name,
      code,
      price: parsedPrice,
      unit,
      description,
    };

    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({ message: "✅ Produkt upravený.", updated });
  } catch (error) {
    console.error("❌ Chyba pri úprave produktu:", error);
    res.status(500).json({ message: "Nepodarilo sa upraviť produkt." });
  }
});

/* ------------------------------ VYMAZAŤ PRODUKT ----------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Produkt vymazaný." });
  } catch (error) {
    console.error("❌ Chyba pri mazaní produktu:", error);
    res.status(500).json({ message: "Nepodarilo sa vymazať produkt." });
  }
});

module.exports = router;
