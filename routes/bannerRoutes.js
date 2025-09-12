// backend/routes/bannerRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Banner = require('../models/banner');

/* ===== helpery ===== */
function safeName(original = '') {
  const base = String(original).replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}`;
}

function deleteFileSafe(app, relUrl) {
  // očakávame URL v tvare /uploads/<subor>
  if (!relUrl || !/^\/uploads\//.test(relUrl)) return;
  const base = path.basename(relUrl);
  const full = path.join(app.get('UPLOADS_DIR'), base);
  fs.unlink(full, () => {});
}

/* ===== Multer storage – PERSISTENT DISK cez app.get('UPLOADS_DIR') ===== */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = req.app.get('UPLOADS_DIR');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, safeName(file.originalname))
});
const upload = multer({ storage });

/* ---------- POST /api/banners (vytvorenie) ---------- */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title = '', description = '', isActive = 'true' } = req.body || {};
    if (!req.file) return res.status(400).json({ message: 'Chýba obrázok.' });

    const doc = await Banner.create({
      title,
      description,
      image: `/uploads/${req.file.filename}`, // URL, nie iba názov
      isActive: isActive === 'true' || isActive === true
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error('banner create error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------- GET /api/banners (?active=1 -> len aktívne) ---------- */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (String(req.query.active) === '1') filter.isActive = true;

    const list = await Banner.find(filter).sort({ createdAt: -1 });

    // aby sa zoznam nikdy nevrátil z cache (hneď uvidíš nové kusy)
    res.set('Cache-Control', 'no-store');

    res.json(list);
  } catch (e) {
    console.error('banner list error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------- GET /api/banners/:id (detail) ---------- */
router.get('/:id', async (req, res) => {
  try {
    const doc = await Banner.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Banner nenájdený.' });
    res.json(doc);
  } catch (e) {
    console.error('banner get error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------- PUT /api/banners/:id (úprava + voliteľná výmena obrázka) ---------- */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, description, isActive } = req.body || {};
    const doc = await Banner.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Banner nenájdený.' });

    if (typeof title !== 'undefined') doc.title = title;
    if (typeof description !== 'undefined') doc.description = description;
    if (typeof isActive !== 'undefined') {
      doc.isActive = (isActive === 'true' || isActive === true);
    }

    if (req.file) {
      // zmaž starý súbor (ak bol) a nastav novú URL
      deleteFileSafe(req.app, doc.image);
      doc.image = `/uploads/${req.file.filename}`;
    }

    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error('banner update error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------- DELETE /api/banners/:id ---------- */
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Banner.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Banner nenájdený.' });

    // zmaž súbor z disku
    deleteFileSafe(req.app, doc.image);
    await doc.deleteOne();

    res.json({ message: 'Zmazané.' });
  } catch (e) {
    console.error('banner delete error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
