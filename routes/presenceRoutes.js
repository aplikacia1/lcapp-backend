// routes/presenceRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ako dlho považujeme používateľa za online
const ONLINE_WINDOW_MS = 60 * 1000; // 1 min (môžeš dať 2 * 60 * 1000)

router.post('/ping', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Chýba email.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený' });

    user.lastSeen = new Date();
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('presence ping error', e);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, { email: 1, name: 1, lastSeen: 1 });
    const now = Date.now();
    const payload = users.map(u => ({
      email: u.email,
      name: u.name,
      online: u.lastSeen ? (now - new Date(u.lastSeen).getTime() <= ONLINE_WINDOW_MS) : false,
    }));
    // online hore
    payload.sort((a, b) => (b.online - a.online) || (a.name || a.email).localeCompare(b.name || b.email, 'sk'));

    res.json(payload);
  } catch (e) {
    console.error('presence list error', e);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

module.exports = router;
