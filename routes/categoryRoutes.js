// routes/categoryRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const Category = require('../models/category');

/* ===== helpers ===== */
function safeName(original = '') {
  const base = String(original).replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}`;
}
function deleteFileSafe(app, relUrl) {
  if (!relUrl) return;
  // v DB uchovávame buď "xyz.jpg" alebo "/uploads/xyz.jpg" – pokryjeme obe
  const base = relUrl.replace(/^\/?uploads[\\/]/i, '').trim();
  if (!base) return;
  const full = path.join(app.get('UPLOADS_DIR'), base);
  fs.unlink(full, () => {});
}

/* ===== Multer – ukladáme do UPLOADS_DIR ===== */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = req.app.get('UPLOADS_DIR');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
});
const upload = multer({ storage });

/* --- GET /api/categories --- */
router.get('/', async (_req, res) => {
  try {
    const items = await Category.find({}).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    console.error('GET /categories error:', e);
    res.status(500).json({ message: 'Chyba pri načítaní kategórií' });
  }
});

/* --- POST /api/categories --- */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Chýba názov kategórie' });

    const image = req.file ? req.file.filename : '';
    const doc = await Category.create({ name: String(name).trim(), image });
    res.status(201).json(doc);
  } catch (e) {
    console.error('POST /categories error:', e);
    res.status(500).json({ message: 'Chyba pri vytvorení kategórie' });
  }
});

/* --- PUT /api/categories/:id --- */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const item = await Category.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Kategória nenájdená' });

    if (typeof req.body.name !== 'undefined') {
      item.name = String(req.body.name).trim();
    }

    if (req.file) {
      // zmaž starý obrázok (ak bol)
      if (item.image) deleteFileSafe(req.app, item.image);
      item.image = req.file.filename; // v DB držíme len názov súboru
    }

    await item.save();
    res.json(item);
  } catch (e) {
    console.error('PUT /categories/:id error:', e);
    res.status(500).json({ message: 'Chyba pri úprave kategórie' });
  }
});

/* --- DELETE /api/categories/:id --- */
router.delete('/:id', async (req, res) => {
  try {
    const item = await Category.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Kategória nenájdená' });

    if (item.image) deleteFileSafe(req.app, item.image);
    await item.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /categories/:id error:', e);
    res.status(500).json({ message: 'Chyba pri mazaní kategórie' });
  }
});

module.exports = router;
