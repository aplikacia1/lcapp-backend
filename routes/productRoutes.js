// backend/routes/productRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Product = require("../models/product");
const Category = require("../models/category");

/* ===== helper ===== */
function safeName(original = "") {
  const base = String(original).replace(/[^a-z0-9.\-_]/gi, "_").toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}`;
}
function deleteFileSafe(app, relUrl) {
  if (!relUrl || !/^\/uploads\//.test(relUrl)) return;
  const base = path.basename(relUrl);
  const full = path.join(app.get("UPLOADS_DIR"), base);
  fs.unlink(full, () => {});
}

/* ===== Multer storage – PERSISTENT DISK cez app.get('UPLOADS_DIR') ===== */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = req.app.get("UPLOADS_DIR");
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
});
const upload = multer({ storage });

/* ---------- GET /api/products ---------- */
router.get("/", async (req, res) => {
  try {
    const { categoryId, q, page = 1, limit = 100, sort } = req.query;

    const where = {};
    if (categoryId) where.categoryId = categoryId;

    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      where.$or = [{ name: rx }, { code: rx }];
    }

    // defaultné triedenie: order ASC, potom createdAt DESC
    let sortObj = { order: 1, createdAt: -1 };
    if (sort) {
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

/* ---------- GET /api/products/category/:categoryId ---------- */
router.get("/category/:categoryId", async (req, res) => {
  try {
    const items = await Product
      .find({ categoryId: req.params.categoryId })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Chyba pri načítaní kategórie" });
  }
});

/* ---------- GET /api/products/:id ---------- */
router.get("/:id", async (req, res) => {
  try {
    const item = await Product.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Produkt nenájdený" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: "Chyba servera" });
  }
});

/* ---------- POST /api/products ---------- */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, code, price, unit, categoryId, description } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ message: "Chýba názov alebo kategória" });
    }

    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(400).json({ message: "Neplatná kategória" });

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const order =
      req.body.order !== undefined && req.body.order !== null && req.body.order !== ""
        ? Number(req.body.order)
        : 9999;

    const doc = await Product.create({
      name,
      code: code || "",
      price: price ? Number(price) : 0,
      unit: unit || "",
      categoryId,
      description: description || "",
      image,
      order
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error("POST /products error:", e);
    res.status(500).json({ message: "Chyba pri vytvorení produktu" });
  }
});

/* ---------- PUT /api/products/:id ---------- */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, code, price, unit, categoryId, description } = req.body;

    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Produkt nenájdený" });

    if (req.file) {
      deleteFileSafe(req.app, item.image);
      item.image = `/uploads/${req.file.filename}`;
    }

    if (typeof name !== "undefined") item.name = name;
    if (typeof code !== "undefined") item.code = code;
    if (typeof price !== "undefined") item.price = Number(price) || 0;
    if (typeof unit !== "undefined") item.unit = unit;
    if (typeof description !== "undefined") item.description = description;

    if (typeof req.body.order !== "undefined") {
      const n = Number(req.body.order);
      if (Number.isFinite(n)) item.order = n;
    }

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

/* ---------- RÝCHLA ZMENA IBA PORADIA ---------- */
router.put("/:id/order", async (req, res) => {
  try {
    const n = Number(req.body?.order);
    if (!Number.isFinite(n)) return res.status(400).json({ message: "Neplatné poradie" });
    const item = await Product.findByIdAndUpdate(req.params.id, { order: n }, { new: true });
    if (!item) return res.status(404).json({ message: "Produkt nenájdený" });
    res.json(item);
  } catch (e) {
    console.error("PUT /products/:id/order error:", e);
    res.status(500).json({ message: "Chyba pri zmene poradia" });
  }
});

/* ---------- DELETE /api/products/:id ---------- */
router.delete("/:id", async (req, res) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Produkt nenájdený" });

    deleteFileSafe(req.app, item.image);
    await item.deleteOne();

    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /products/:id error:", e);
    res.status(500).json({ message: "Chyba pri mazaní produktu" });
  }
});

/* ---------- GET /api/products/stats/count-by-category/all ---------- */
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
      { $project: { _id: 0, categoryId: "$_id", categoryName: "$cat.name", count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (e) {
    console.error("stats/count-by-category error:", e);
    res.status(500).json({ message: "Chyba pri štatistike" });
  }
});

module.exports = router;
