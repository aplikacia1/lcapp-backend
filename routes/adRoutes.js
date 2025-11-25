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
 * GET /api/ads
 * Zoznam všetkých reklám (pre admina)
 */
router.get("/", async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 }).lean();
    return res.json(ads);
  } catch (err) {
    console.error("Get ads list error:", err);
    return res
      .status(500)
      .json({ message: "Nepodarilo sa načítať zoznam reklám." });
  }
});

/**
 * DELETE /api/ads/:id
 * Vymazanie reklamy + pokus o zmazanie obrázka z disku
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ message: "Reklama neexistuje." });
    }

    // pokúsime sa zmazať súbor obrázka (ak je v /uploads/)
    if (ad.imageUrl && ad.imageUrl.startsWith("/uploads/")) {
      const filename = path.basename(ad.imageUrl);
      const fullPath = path.join(uploadsDir, filename);
      fs.unlink(fullPath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.warn("Nepodarilo sa zmazať súbor reklamy:", fullPath, err);
        }
      });
    }

    await Ad.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete ad error:", err);
    return res
      .status(500)
      .json({ message: "Nepodarilo sa vymazať reklamu." });
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
