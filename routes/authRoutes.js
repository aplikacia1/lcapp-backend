// backend/routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');
const { sendWelcomeEmail } = require('../utils/mailer'); // 👈 pridané

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const COOKIE_NAME = 'li_auth';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// ───────── helpers ─────────
function signToken(user) {
  return jwt.sign(
    { uid: String(user._id), email: user.email, nickname: user.name || null },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function cookieOpts(remember) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    ...(remember ? { maxAge: 1000 * 60 * 60 * 24 * 30 } : {}) // 30 dní
  };
}

// ───────── REGISTER ─────────
// POST /api/auth/register  { email, password, name?, note?, remember? }
router.post('/register', async (req, res) => {
  try {
    const { email, password, name = '', note = '', remember = true } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Chýba email alebo heslo' });
    }

    // existuje už?
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Tento e-mail je už zaregistrovaný' });
    }

    // vytvor používateľa
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      email,
      passwordHash,
      name: (name || '').trim(),
      note: (note || '').trim()
    });

    // prihlásime hneď po registrácii (ako doteraz cookie štýl)
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOpts(!!remember));

    // vítací e-mail (fire-and-forget, nech nebrzdí odpoveď)
    const shouldSend = (process.env.SEND_WELCOME_EMAIL || 'true').toLowerCase() === 'true';
    if (shouldSend) {
      sendWelcomeEmail(user.email, user.name).catch(err => {
        console.error('welcome email error:', err?.message || err);
      });
    }

    return res.status(201).json({
      ok: true,
      email: user.email,
      nickname: user.name || null
    });
  } catch (e) {
    console.error('auth/register error:', e);
    return res.status(500).json({ message: 'Chyba servera pri registrácii' });
  }
});

// ───────── LOGIN ─────────
// POST /api/auth/login  { email, password, remember?: boolean }
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember = false } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Chýba email alebo heslo' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Neplatné prihlasovacie údaje' });

    // Podpora oboch variant (plain vs. hash) podľa staršej DB
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

// ───────── LOGOUT ─────────
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true });
});

// ───────── ME ─────────
// GET /api/auth/me
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
