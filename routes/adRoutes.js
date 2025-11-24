// routes/adRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Ad = require("../models/Ad");

const router = express.Router();

// rovnaká logika cesty ako v index.js
const IS_PROD = process.env.NODE_ENV === "production";
const uploadsDir =
  process.env.UPLOADS_DIR ||
  (IS_PROD
    ? "/var/data/listobook/uploads"
    : path.join(__dirname, "..", "uploads"));

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = (file.originalname || "ad")
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "_");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + safeName);
  },
});

const upload = multer({ storage });

/**
 * POST /api/ads
 * Multipart formulár:
 *  - image     (súbor)
 *  - targetUrl (string)
 *  - isActive  ("true"/"false" / "on"/"off")
 */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'Chýba súbor obrázka (pole "image").' });
    }

    const relPath = "/uploads/" + path.basename(req.file.path);
    const targetUrl = (req.body.targetUrl || "").trim();
    const isActiveRaw = String(req.body.isActive || "").toLowerCase();
    const isActive =
      isActiveRaw === "true" ||
      isActiveRaw === "1" ||
      isActiveRaw === "on" ||
      isActiveRaw === "checked";

    if (isActive) {
      // chceme mať vždy len JEDNU aktívnu reklamu
      await Ad.updateMany({ isActive: true }, { isActive: false });
    }

    const ad = await Ad.create({
      imageUrl: relPath,
      targetUrl,
      isActive,
    });

    return res.json({ ok: true, ad });
  } catch (err) {
    console.error("Ad upload error:", err);
    return res
      .status(500)
      .json({ message: "Nepodarilo sa uložiť reklamu." });
  }
});

/**
 * GET /api/ads/current
 * Vráti poslednú aktívnu reklamu alebo null.
 */
router.get("/current", async (req, res) => {
  try {
    const ad = await Ad.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(ad || null);
  } catch (err) {
    console.error("Get current ad error:", err);
    return res
      .status(500)
      .json({ message: "Nepodarilo sa načítať reklamu." });
  }
});

module.exports = router;
