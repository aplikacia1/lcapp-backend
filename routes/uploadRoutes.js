// routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();

const safeName = (original = '') =>
  `${Date.now()}_${String(original).replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase()}`;

/* vždy ber cestu z index.js -> app.set('UPLOADS_DIR', ...) */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = req.app.get('UPLOADS_DIR');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, safeName(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(/^image\//i.test(file.mimetype) ? null : new Error('Súbor musí byť obrázok'), /^image\//i.test(file.mimetype))
});

router.get('/ping', (req, res) => {
  res.json({ ok: true, dir: req.app.get('UPLOADS_DIR') || null });
});

router.get('/check', async (req, res) => {
  const dir = req.app.get('UPLOADS_DIR');
  try {
    await fs.promises.access(dir, fs.constants.W_OK);
    res.json({ ok: true, writable: true, dir });
  } catch (e) {
    res.status(500).json({ ok: false, writable: false, error: e.message, dir });
  }
});

// POST /api/uploads (single "image")
router.post('/', upload.single('image'), (req, res) => {
  const f = req.file;
  res.json({
    ok: true,
    file: {
      name: f.originalname,
      size: f.size,
      mime: f.mimetype,
      url: `/uploads/${f.filename}`
    }
  });
});

module.exports = router;
