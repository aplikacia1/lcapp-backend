const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DocumentCategory = require('../models/DocumentCategory');
const DocumentItem = require('../models/DocumentItem');

// Nastavenie multer pre upload obrázkov
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});
const upload = multer({ storage });

// ======================
// KATEGÓRIE
// ======================

// GET /api/categories/  -> Vráti všetky kategórie
router.get('/', async (req, res) => {
  try {
    const categories = await DocumentCategory.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Chyba pri načítaní kategórií.' });
  }
});

// POST /api/categories/ -> Vytvorí novú kategóriu
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    const image = req.file ? req.file.filename : null;

    const newCategory = new DocumentCategory({ name, image });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Chyba pri vytváraní kategórie.' });
  }
});

// DELETE /api/categories/:id -> Vymaže kategóriu a súvisiace položky
router.delete('/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    await DocumentCategory.findByIdAndDelete(categoryId);
    await DocumentItem.deleteMany({ categoryId });
    res.json({ message: 'Kategória a súvisiace položky vymazané.' });
  } catch (err) {
    res.status(500).json({ message: 'Chyba pri mazaní kategórie.' });
  }
});

// ======================
// DOKUMENTY
// ======================

// POST /api/categories/items -> Pridanie nového dokumentu
router.post('/items', upload.single('image'), async (req, res) => {
  try {
    const { name, code, price, unit, description, categoryId } = req.body;
    const image = req.file ? req.file.filename : null;

    const newItem = new DocumentItem({
      name,
      code,
      price,
      unit,
      description,
      categoryId,
      image
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ message: 'Chyba pri ukladaní dokumentu.' });
  }
});

// GET /api/categories/items/:categoryId -> Získaj dokumenty podľa kategórie
router.get('/items/:categoryId', async (req, res) => {
  try {
    const items = await DocumentItem.find({ categoryId: req.params.categoryId });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Chyba pri načítaní dokumentov.' });
  }
});

// DELETE /api/categories/items/:id -> Vymaž dokument
router.delete('/items/:id', async (req, res) => {
  try {
    await DocumentItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Položka vymazaná.' });
  } catch (err) {
    res.status(500).json({ message: 'Chyba pri mazaní položky.' });
  }
});

module.exports = router;
