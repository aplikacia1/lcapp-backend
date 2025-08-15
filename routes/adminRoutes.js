// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // ✅ používame bcryptjs (bez kompilácie)
const Admin = require('../models/adminModel'); // nechaj takto
const User = require('../models/User');        // nechaj takto

// -----------------------------
// POST /api/admin/login
// Prihlásenie admina
// Body: { email, password }
// -----------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Chýba email alebo heslo' });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin neexistuje' });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Nesprávne heslo' });
    }

    // Ak nepotrebujete token, stačí jednoduchá odpoveď:
    return res.json({ message: 'Prihlásenie úspešné' });
  } catch (err) {
    console.error('Chyba pri prihlasovaní:', err);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

// ---------------------------------------
// PUT /api/admin/password
// Zmena hesla admina (podľa ADMIN_EMAIL)
// Body: { currentPassword, newPassword }
// ---------------------------------------
router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL || 'bratislava@listovecentrum.sk';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Chýba aktuálne alebo nové heslo' });
  }

  try {
    const admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ message: 'Admin neexistuje' });
    }

    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Nesprávne aktuálne heslo' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return res.json({ message: 'Heslo úspešne zmenené' });
  } catch (err) {
    console.error('Chyba pri zmene hesla:', err);
    return res.status(500).json({ message: 'Chyba servera pri zmene hesla' });
  }
});

// ------------------------------------------------------
// GET /api/admin/users
// Zoznam používateľov (bez passwordHash)
// ------------------------------------------------------
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    return res.json(users);
  } catch (err) {
    console.error('Chyba pri načítaní používateľov:', err);
    return res.status(500).json({ message: 'Chyba servera pri získavaní používateľov' });
  }
});

// ------------------------------------------------------
// GET /api/admin/online
// Počet online (ak máš sessions uložené v app locals)
// ------------------------------------------------------
router.get('/online', (req, res) => {
  try {
    const sessions = req.app.get('sessions') || {};
    return res.json({ count: Object.keys(sessions).length || 0 });
  } catch {
    return res.json({ count: 0 });
  }
});

module.exports = router;
