// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
const multer = require('multer');

const Category = require('../models/category');
const Product  = require('../models/product');

// ---------- Multer: ukladanie obrázkov do backend/uploads ----------
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'img').replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage });

// Pomocník: bezpečné zmazanie súboru
function deleteFileSafe(filename) {
  if (!filename) return;
  const full = path.join(uploadDir, filename);
  fs.stat(full, (err, st) => {
    if (!err && st.isFile()) fs.unlink(full, () => {});
  });
}

/* =========================================================================
 * GET /api/categories  – zoznam kategórií
 * ========================================================================= */
router.get('/', async (_req, res) => {
  try {
    const list = await Category.find().sort({ name: 1 }).lean();
    res.json(list);
  } catch (e) {
    console.error('GET /api/categories error:', e);
    res.status(500).json({ message: 'Chyba pri načítaní kategórií.' });
  }
});

/* =========================================================================
 * POST /api/categories  – vytvorenie kategórie (multipart/form-data)
 *  polia: name (povinné), image (file, voliteľne)
 * ========================================================================= */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      // ak prišla fotka a meno chýba, zmažeme ju, nech sa nehromadia siroty
      if (req.file) deleteFileSafe(req.file.filename);
      return res.status(400).json({ message: 'Chýba názov kategórie.' });
    }

    const doc = await Category.create({
      name: name.trim(),
      image: req.file ? req.file.filename : undefined,
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error('POST /api/categories error:', e);
    res.status(500).json({ message: 'Chyba pri vytváraní kategórie.' });
  }
});

/* =========================================================================
 * DELETE /api/categories/:id  – zmazanie kategórie
 *  - ak kategóriu používajú produkty, vráti 409 (Conflict)
 * ========================================================================= */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const inUse = await Product.countDocuments({ categoryId: id });
    if (inUse > 0) {
      return res
        .status(409)
        .json({ message: `Kategóriu nie je možné vymazať – obsahuje ${inUse} produkt(ov).` });
    }

    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ message: 'Kategória nenájdená.' });

    // zmaž súbor s obrázkom, ak existuje
    deleteFileSafe(cat.image);

    await cat.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/categories/:id error:', e);
    res.status(500).json({ message: 'Chyba pri mazaní kategórie.' });
  }
});

/* =========================================================================
 * (Kompatibilita) GET /api/categories/items/:categoryId
 *  - vráti produkty danej kategórie (niektoré staršie skripty to volajú)
 * ========================================================================= */
router.get('/items/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const items = await Product.find({ categoryId }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    console.error('GET /api/categories/items/:categoryId error:', e);
    res.status(500).json({ message: 'Chyba pri načítaní produktov kategórie.' });
  }
});

module.exports = router;
