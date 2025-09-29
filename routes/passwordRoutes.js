// routes/passwordRoutes.js
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

const IS_PROD = process.env.NODE_ENV === 'production';
const APP_URL = (process.env.APP_URL && process.env.APP_URL.replace(/\/+$/, ''))
  || (IS_PROD ? 'https://listobook.sk' : 'http://localhost:3000');

// Mailer – použijeme tvoj mailer.js, ak existuje. Inak fallback do konzoly.
let mailer = { sendMail: async ({ to, subject }) => {
  console.log('[MAIL FALLBACK - no mailer.js] to:', to, '| subject:', subject);
  return { ok: true, fallback: true };
}};
try { mailer = require('../mailer'); } catch (e) {
  console.warn('⚠️ mailer.js nebol nájdený – používam fallback logger.');
}

/**
 * POST /api/password/forgot
 * body: { email }
 * - vždy vracia 200 (aby sme neprezrádzali, či e-mail existuje)
 */
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, message: 'Email je povinný.' });

    const user = await User.findOne({ email: new RegExp(`^${String(email).trim()}$`, 'i') });

    if (user) {
      // vygeneruj token a ulož jeho HASH (plain ide len do mailu)
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

      user.resetPasswordToken = tokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hodina
      await user.save();

      const resetUrl = `${APP_URL}/reset-password.html?token=${plainToken}`;
      const subject = 'Obnovenie hesla – Lištobook';
      const text = `Kliknite na tento odkaz pre nastavenie nového hesla: ${resetUrl}\nOdkaz je platný 1 hodinu. Ak ste o zmenu nepožiadali vy, ignorujte tento e-mail.`;
      const html = `
        <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">
          <p>Dobrý deň,</p>
          <p>prišla požiadavka na obnovenie hesla do Lištobooku.</p>
          <p>
            <a href="${resetUrl}" target="_blank"
              style="display:inline-block;padding:10px 16px;border-radius:8px;background:#0a2a52;color:#fff;text-decoration:none">
              Nastaviť nové heslo
            </a>
          </p>
          <p>Odkaz je platný 1 hodinu. Ak ste o zmenu nepožiadali vy, ignorujte tento e-mail.</p>
        </div>`;

      await mailer.sendMail({ to: user.email, subject, text, html });
      if (!IS_PROD) {
  console.log('DEV reset link:', resetUrl);
}

    }

    // Vždy OK – neprezrádzame, či e-mail existuje
    return res.json({ ok: true });
  } catch (err) {
    console.error('forgot error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/password/reset
 * body: { token, newPassword }
 */
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Chýba token alebo heslo.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ ok: false, message: 'Heslo musí mať aspoň 8 znakov.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ ok: false, message: 'Neplatný alebo exspirovaný odkaz.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(String(newPassword), salt);

    user.password = hashed;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.passwordChangedAt = new Date();
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error('reset error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
