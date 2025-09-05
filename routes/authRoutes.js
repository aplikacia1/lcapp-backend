// backend/routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const COOKIE_NAME = 'li_auth';

function signToken(user) {
  return jwt.sign(
    { uid: String(user._id), email: user.email, nickname: user.name || null },
    JWT_SECRET,
    { expiresIn: '30d' } // max TTL tokenu; cookie TTL riadime zvlášť
  );
}

function cookieOpts(remember) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    // ak remember=true → cookie prežije reštart prehliadača (napr. 30 dní)
    // ak remember=false → session cookie (bez maxAge)
    ...(remember ? { maxAge: 1000 * 60 * 60 * 24 * 30 } : {})
  };
}

// POST /api/auth/login  { email, password, remember?: boolean }
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember = false } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Chýba email alebo heslo' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Neplatné prihlasovacie údaje' });

    // Podpora oboch variant (plain vs. hash) podľa tvojej existujúcej DB
    let ok = false;
    if (user.passwordHash) {
      ok = await bcrypt.compare(password, user.passwordHash);
    } else {
      ok = user.password === password; // legacy
    }
    if (!ok) return res.status(401).json({ message: 'Neplatné prihlasovacie údaje' });

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOpts(!!remember));
    return res.json({ ok: true, email: user.email, nickname: user.name || null });
  } catch (e) {
    console.error('auth/login error:', e);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true });
});

// GET /api/auth/me  → vráti aktuálne prihláseného používateľa z cookie (ak existuje)
router.get('/me', async (req, res) => {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw) return res.status(401).json({ ok: false });

    let payload;
    try {
      payload = jwt.verify(raw, JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false });
    }

    const user = await User.findById(payload.uid, 'email name').lean();
    if (!user) return res.status(401).json({ ok: false });

    return res.json({
      ok: true,
      email: user.email,
      nickname: user.name || null
    });
  } catch (e) {
    console.error('auth/me error:', e);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

module.exports = router;
