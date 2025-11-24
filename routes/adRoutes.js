const express = require("express");
const router = express.Router();
const Ad = require("../models/Ad");

// Ak máš middleware na admin overenie (napr. requireAdminAuth),
// môžeš ho pridať sem:
// const { requireAdminAuth } = require("../middleware/adminAuth");

// 1️⃣ Vytvorenie / aktualizácia reklamy
router.post("/", async (req, res) => {
  try {
    const { imageUrl, targetUrl, isActive } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: "Chýba imageUrl." });
    }

    // Ak má byť táto reklama aktívna, ostatné vypneme
    if (isActive) {
      await Ad.updateMany({ isActive: true }, { $set: { isActive: false } });
    }

    const ad = new Ad({
      imageUrl,
      targetUrl: targetUrl || "",
      isActive: !!isActive,
    });

    const saved = await ad.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Chyba pri ukladaní reklamy:", error);
    res.status(500).json({ message: "Server error pri ukladaní reklamy." });
  }
});

// 2️⃣ Získanie aktuálnej aktívnej reklamy
router.get("/current", async (req, res) => {
  try {
    const ad = await Ad.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    if (!ad) {
      return res.status(200).json(null); // žiadna reklama
    }
    res.json(ad);
  } catch (error) {
    console.error("Chyba pri načítaní aktuálnej reklamy:", error);
    res.status(500).json({ message: "Server error pri načítaní reklamy." });
  }
});

module.exports = router;
