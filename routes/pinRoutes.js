const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();


// 🔎 CHECK IF USER HAS PIN
router.get("/has-pin", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.json({ hasPin: false });
    }

    const user = await User.findOne({ email });

    if (!user || !user.pinEnabled || !user.pinHash) {
      return res.json({ hasPin: false });
    }

    res.json({ hasPin: true });

  } catch (err) {
    console.error("HAS PIN ERROR:", err);
    res.status(500).json({ hasPin: false });
  }
});


// 🔐 VERIFY PIN
router.post("/verify-pin", async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ ok: false });
    }

    const user = await User.findOne({ email });

    if (!user || !user.pinEnabled || !user.pinHash) {
      return res.status(403).json({ ok: false });
    }

    const match = await bcrypt.compare(pin, user.pinHash);

    if (!match) {
      return res.status(401).json({ ok: false });
    }

    // ⭐ PIN SESSION
    req.session.pinVerified = true;
    req.session.pinVerifiedAt = Date.now();
    req.session.pinEmail = email;

    res.json({ ok: true });

  } catch (err) {
    console.error("VERIFY PIN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});


// 🔐 SET PIN
router.post("/set-pin", async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ message: "Email a PIN sú povinné." });
    }

    if (pin.length !== 4) {
      return res.status(400).json({ message: "PIN musí mať 4 čísla." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Používateľ neexistuje." });
    }

    const hash = await bcrypt.hash(pin, 10);

    user.pinHash = hash;
    user.pinEnabled = true;
    user.pinChangedAt = new Date();

    await user.save();

    res.json({ success: true });

  } catch (err) {
    console.error("SET PIN ERROR:", err);
    res.status(500).json({ message: "Chyba servera." });
  }
});


// ❌ DISABLE PIN
router.post("/disable-pin", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.json({ ok: false });

    user.pinEnabled = false;
    user.pinHash = null;

    await user.save();

    res.json({ ok: true });

  } catch (err) {
    console.error("DISABLE PIN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

