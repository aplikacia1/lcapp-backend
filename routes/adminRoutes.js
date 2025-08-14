const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Admin = require('../models/adminModel'); // ✅ necháme tak
const User = require('../models/User'); // ✅ OPRAVENÉ – správny názov súboru

// Prihlásenie admina
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: 'Admin neexistuje' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Nesprávne heslo' });
    }

    res.json({ message: 'Prihlásenie úspešné' });
  } catch (error) {
    console.error('Chyba pri prihlasovaní:', error);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

// Zmena hesla admina
router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const admin = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'bratislava@listovecentrum.sk' });

    if (!admin) {
      return res.status(404).json({ message: 'Admin neexistuje' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Nesprávne aktuálne heslo' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.passwordHash = hashedPassword;
    await admin.save();

    res.json({ message: 'Heslo úspešne zmenené' });
  } catch (error) {
    console.error('Chyba pri zmene hesla:', error);
    res.status(500).json({ message: 'Chyba servera pri zmene hesla' });
  }
});

// 🆕 ZÍSKANIE VŠETKÝCH POUŽÍVATEĽOV
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Chyba pri načítaní používateľov:', error);
    res.status(500).json({ message: 'Chyba servera pri získavaní používateľov' });
  }
});

// 🆕 POČET PRIHLÁSENÝCH – podľa session (len orientačne)
router.get('/online', async (req, res) => {
  try {
    const sessionCount = Object.keys(req.app.get('sessions') || {}).length;
    res.json({ count: sessionCount });
  } catch (error) {
    console.error('Chyba pri zisťovaní online:', error);
    res.json({ count: 0 });
  }
});

module.exports = router;
