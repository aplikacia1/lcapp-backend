const express = require('express');
const router = express.Router();
const PushToken = require('../models/PushToken');

// uloženie android tokenu
router.post('/register', async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token required' });
    }

    // 🔥 ak chýba email → neuložíme
    if (!email) {
      console.warn("❌ Android token bez emailu – neukladám:", token);
      return res.status(400).json({ message: 'Email required' });
    }

    await PushToken.findOneAndUpdate(
      { token },
      { token, email },
      { upsert: true, new: true }
    );

    res.json({ ok: true });

  } catch (e) {
    console.error('android push register', e);
    res.status(500).json({ message: 'Register failed' });
  }
});

module.exports = router;