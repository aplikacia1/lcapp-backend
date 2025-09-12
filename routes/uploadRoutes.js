// backend/routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/var/data/listobook/uploads';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- jednoduché overenia cez prehliadač ---
router.get('/ping', (_req, res) => {
  res.json({ ok: true, dir: UPLOADS_DIR });
});

router.get('/check', async (_req, res) => {
  try {
    await fs.promises.access(UPLOADS_DIR, fs.constants.W_OK);
    res.json({ ok: true, writable: true, dir: UPLOADS_DIR });
  } catch (e) {
    res.status(500).json({ ok: false, writable: false, error: e.message, dir: UPLOADS_DIR });
  }
});

// bezpečné meno súboru
function safeName(original) {
  const ts = Date.now();
  const base = original.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
  return `${ts}_${base}`;
}

// konfigurácia úložiska
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, safeName(file.originalname))
});

// obmedzenia (max 10 MB, len obrázky)
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//i.test(file.mimetype);
    cb(ok ? null : new Error('Súbor musí byť obrázok'), ok);
  }
});

// POST /api/uploads  (pole s názvom "image")
router.post('/', upload.single('image'), (req, res) => {
  const file = req.file;
  const urlPath = `/uploads/${file.filename}`;
  res.json({
    ok: true,
    file: {
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
      url: urlPath
    }
  });
});

module.exports = router;
