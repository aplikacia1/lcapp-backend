// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Admin = require("../models/adminModel");

// POST /api/admin/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin) {
    return res.status(401).json("Neplatné prihlasovacie údaje.");
  }

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) {
    return res.status(401).json("Neplatné prihlasovacie údaje.");
  }

  const token = jwt.sign({ role: "admin", email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.json({ token });
});

// PUT /api/admin/password
router.put("/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const admin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (!admin) {
    return res.status(404).json("Admin neexistuje.");
  }

  const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!isMatch) {
    return res.status(401).json("Zlé aktuálne heslo.");
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  admin.passwordHash = newHash;
  await admin.save();

  res.json("Heslo bolo úspešne zmenené.");
});

module.exports = router;
