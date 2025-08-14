const express = require('express');
const router = express.Router();
const Category = require('../models/category');

// GET /api/categories – zoznam kategórií
router.get('/', async (req, res) => {
  try {
    const list = await Category.find().sort({ order: 1, name: 1 });
    res.json(list);
  } catch (e) {
    console.error('GET /api/categories error:', e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
