// backend/routes/productRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Product = require("../models/product");
const Category = require("../models/category");

// ---------- Multer: ukladanie do backend/uploads ----------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage });

// Pomocník: bezpečné zmazanie starého súboru
function deleteFileSafe(filename) {
  if (!filename) return;
  const full = path.join(__dirname, "..", "uploads", filename);
  fs.stat(full, (err, st) => {
    if (!err && st.isFile()) {
      fs.unlink(full, () => {});
    }
  });
}

// ---------- GET /api/products ----------
// podpora ?categoryId=... & q=... & page=1 & limit=50 & sort=createdAt:-1
router.get("/", async (req, res) => {
  try {
    const { categoryId, q, page = 1, limit = 100, sort } = req.query;

    const where = {};
    if (categoryId) where.categoryId = categoryId;

    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      where.$or = [{ name: rx }, { code: rx }];
    }

    // sorting
    let sortObj = { createdAt: -1 };
    if (sort) {
      // napr. "price:1" alebo "createdAt:-1"
      const [field, dir] = String(sort).split(":");
      if (field) sortObj = { [field]: Number(dir) === 1 ? 1 : -1 };
    }

    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.min(500, Math.max(1, Number(limit) || 100));

    const [items, total] = await Promise.all([
      Product.find(where).sort(sortObj).skip((pg - 1) * lim).limit(lim).lean(),
      Product.countDocuments(where),
    ]);

    res.json({ items, total, page: pg, limit: lim });
  } catch (e) {
    console.error("GET /products error:", e);
    res.status(500).json({ message: "Chyba pri načítaní produktov" });
  }
});

// ---------- GET /api/products/category/:categoryId ----------
router.get("/category/:categoryId", async (req, res) => {
  try {
    const items = await Product.find({ categoryId: req.params.categoryId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Chyba pri načítaní kategórie" });
  }
});

// ---------- GET /api/products/:id ----------
router.get("/:id", async (req, res) => {
  try {
    const item = await Product.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Produkt nenájdený" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: "Chyba servera" });
  }
});

// ---------- POST /api/products ----------
// multipart/form-data: name, code, price, unit, categoryId, description, image(file)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, code, price, unit, categoryId, description } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ message: "Chýba názov alebo kategória" });
    }

    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(400).json({ message: "Neplatná kategória" });

    const image = req.file ? req.file.filename : null;

    const doc = await Product.create({
      name,
      code: code || "",
      price: price ? Number(price) : 0,
      unit: unit || "",
      categoryId,
      description: description || "",
      image, // uložený názov súboru v /uploads
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error("POST /products error:", e);
    res.status(500).json({ message: "Chyba pri vytvorení produktu" });
  }
});

// ---------- PUT /api/products/:id ----------
// multipart/form-data (voliteľne nová image)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, code, price, unit, categoryId, description } = req.body;

    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Produkt nenájdený" });

    // ak prišla nová fotka, zmažeme starú
    if (req.file) {
      deleteFileSafe(item.image);
      item.image = req.file.filename;
    }

    if (typeof name !== "undefined") item.name = name;
    if (typeof code !== "undefined") item.code = code;
    if (typeof price !== "undefined") item.price = Number(price) || 0;
    if (typeof unit !== "undefined") item.unit = unit;
    if (typeof description !== "undefined") item.description = description;

    if (typeof categoryId !== "undefined") {
      const cat = await Category.findById(categoryId);
      if (!cat) return res.status(400).json({ message: "Neplatná kategória" });
      item.categoryId = categoryId;
    }

    await item.save();
    res.json(item);
  } catch (e) {
    console.error("PUT /products/:id error:", e);
    res.status(500).json({ message: "Chyba pri úprave produktu" });
  }
});

// ---------- DELETE /api/products/:id ----------
router.delete("/:id", async (req, res) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Produkt nenájdený" });

    deleteFileSafe(item.image);
    await item.deleteOne();

    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /products/:id error:", e);
    res.status(500).json({ message: "Chyba pri mazaní produktu" });
  }
});

// ---------- GET /api/products/stats/count-by-category ----------
router.get("/stats/count-by-category/all", async (_req, res) => {
  try {
    const rows = await Product.aggregate([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: "$cat.name",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(rows);
  } catch (e) {
    console.error("stats/count-by-category error:", e);
    res.status(500).json({ message: "Chyba pri štatistike" });
  }
});

module.exports = router;
