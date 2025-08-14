const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Banner = require('../models/banner');

// ——— Ukladanie obrázkov
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// POST /api/banners  (vytvorenie)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title = '', description = '', isActive = 'true' } = req.body || {};
    if (!req.file) return res.status(400).json({ message: 'Chýba obrázok.' });

    const doc = new Banner({
      title,
      description,
      image: req.file.filename,
      isActive: isActive === 'true' || isActive === true
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (e) {
    console.error('banner create error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// GET /api/banners  (?active=1 -> len aktívne)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (String(req.query.active) === '1') filter.isActive = true;
    const list = await Banner.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error('banner list error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// GET /api/banners/:id  (detail)
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

// PUT /api/banners/:id  (úprava + voliteľná výmena obrázka)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, description, isActive } = req.body || {};
    const set = {};
    if (typeof title !== 'undefined') set.title = title;
    if (typeof description !== 'undefined') set.description = description;
    if (typeof isActive !== 'undefined') set.isActive = (isActive === 'true' || isActive === true);
    if (req.file) set.image = req.file.filename;

    const doc = await Banner.findByIdAndUpdate(req.params.id, set, { new: true });
    if (!doc) return res.status(404).json({ message: 'Banner nenájdený.' });
    res.json(doc);
  } catch (e) {
    console.error('banner update error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// DELETE /api/banners/:id
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Banner.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Banner nenájdený.' });
    res.json({ message: 'Zmazané.' });
  } catch (e) {
    console.error('banner delete error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
