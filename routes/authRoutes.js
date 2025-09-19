// backend/routes/authRoutes.js
// Čistý auth: registrácia -> pošle info mail (bez oslovenia), login/logout cez JWT cookie, /me

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { sendSignupEmail } = require('../utils/mailer');

const router = express.Router();

const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = (process.env.JWT_SECRET || 'change-me').trim();

// Helper: nastavenie cookie pre JWT
function jwtCookieOptions(days = 7) {
  const maxAgeMs = days * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,     // v produkcii len cez HTTPS
    path: '/',
    maxAge: maxAgeMs,
  };
}

// Helper: vytvorenie JWT
function signJwt(payload, days = 7) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${days}d` });
}

// -------------------------
// POST /api/auth/register
// Body: { email, password, name? }
// - vytvorí používateľa (nick môže byť prázdny; zvolí si ho neskôr)
// - odošle informačný e-mail s inštrukciou na prezývku
// -------------------------
router.post('/register', async (req, res) => {
  try {
    let { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Chýba email alebo heslo' });
    }

    email = String(email).trim();
    name = String(name || '').trim();

    // existuje?
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Používateľ už existuje' });

    if (password.length < 6) {
      return res.status(400).json({ message: 'Heslo musí mať aspoň 6 znakov' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Pozn.: prezývku (name) môže použiť hneď, alebo neskôr — unikátnosť rieši index (nameLower)
    const doc = {
      email,
      password: passwordHash,
      name: name || '',                // môže ostať prázdne – vyžiada si ho appka
      note: '',                        // voliteľné pole v tvojom modeli
      role: 'user',
    };
    if (doc.name) doc.nameLower = doc.name.toLowerCase(); // ak tvoj model toto pole má

    const newUser = await User.create(doc);

    // Po registrácii pošleme informačný e-mail (bez oslovenia)
    try {
      await sendSignupEmail(newUser.email);
      console.log('Signup email sent to', newUser.email);
    } catch (e) {
      console.error('Signup email failed:', e && e.message ? e.message : e);
      // e-mail neblokuje registráciu
    }

    // Voliteľne môžeme rovno prihlásiť (ak to chceš). Nechávam default: neprihlasujeme.
    // Ak chceš prihlásiť automaticky, odkomentuj:
    // const token = signJwt({ sub: newUser._id.toString(), email: newUser.email });
    // res.cookie('token', token, jwtCookieOptions());
    // return res.status(201).json({ message: 'Registrácia úspešná', userId: newUser._id });

    return res.status(201).json({ message: 'Registrácia úspešná', userId: newUser._id });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

// -------------------------
// POST /api/auth/login
// Body: { email, password }
// - overí heslo
// - nastaví httpOnly JWT cookie (na 7 dní)
// -------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Chýba email alebo heslo' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ neexistuje' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Nesprávne heslo' });

    const token = signJwt({ sub: user._id.toString(), email: user.email });
    res.cookie('token', token, jwtCookieOptions());
    return res.json({
      message: 'Prihlásenie úspešné',
      email: user.email,
      name: user.name || '',
      role: user.role || 'user',
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

// -------------------------
// POST /api/auth/logout
// - vymaže JWT cookie
// -------------------------
router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ message: 'Odhlásenie úspešné' });
});

// -------------------------
// GET /api/auth/me
// - vráti základné info o používateľovi z JWT cookie, ak je platná
// -------------------------
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Neprihlásený' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Neplatný token' });
    }

    const user = await User.findById(payload.sub).select('email name note role');
    if (!user) return res.status(404).json({ message: 'Používateľ neexistuje' });

    return res.json({
      email: user.email,
      name: user.name || '',
      note: user.note || '',
      role: user.role || 'user',
    });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

module.exports = router;
