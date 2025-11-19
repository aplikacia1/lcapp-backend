// routes/adminRoutes.js
// BUILD: adminRoutes reset-pass-2025-11-19
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const crypto = require('crypto');

const Admin = require('../models/adminModel');
const User = require('../models/User');
const TimelinePost = require('../models/timelinePost');
const Message = require('../models/message'); // presne podľa models/message.js

// Mailer – najprv utils/mailer, potom root mailer, inak fallback logger
let mailer;
try {
  mailer = require('../utils/mailer');
} catch (e1) {
  try {
    mailer = require('../mailer');
  } catch (e2) {
    console.warn('⚠️ mailer modul pre admin nebol nájdený – používam fallback logger.');
    mailer = {
      sendMail: async ({ to, subject }) => {
        console.log('[MAIL FALLBACK][ADMIN] to:', to, '| subject:', subject);
        return { ok: true, fallback: true };
      }
    };
  }
}

const IS_PROD = process.env.NODE_ENV === 'production';
const APP_URL = (process.env.APP_URL && process.env.APP_URL.replace(/\/+$/, ''))
  || (IS_PROD ? 'https://listobook.sk' : 'http://localhost:3000');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'bratislava@listovecentrum.sk').trim();

// TODO: neskôr sem dáme reálnu kontrolu admina (session/JWT)
const requireAdmin = (_req, _res, next) => next();

/* -----------------------------
 * POST /api/admin/login
 * Body: { email, password }
 * ----------------------------- */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Chýba email alebo heslo' });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: 'Admin neexistuje' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Nesprávne heslo' });

    // (Zatiaľ bez JWT – iba info, že je OK)
    return res.json({ message: 'Prihlásenie úspešné' });
  } catch (err) {
    console.error('Chyba pri prihlasovaní admina:', err);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

/* ---------------------------------------
 * PUT /api/admin/password
 * Body: { currentPassword, newPassword }
 * – manuálna zmena po prihlásení (ponechávame)
 * --------------------------------------- */
router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Chýba aktuálne alebo nové heslo' });
  }

  try {
    const admin = await Admin.findOne({ email: ADMIN_EMAIL });
    if (!admin) return res.status(404).json({ message: 'Admin neexistuje' });

    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Nesprávne aktuálne heslo' });

    admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await admin.save();
    return res.json({ message: 'Heslo úspešne zmenené' });
  } catch (err) {
    console.error('Chyba pri zmene admin hesla:', err);
    return res.status(500).json({ message: 'Chyba servera pri zmene hesla' });
  }
});

/* ------------------------------------------------
 * POST /api/admin/password/forgot
 * Body: { email? } – používame ADMIN_EMAIL z .env
 * ------------------------------------------------ */
router.post('/password/forgot', async (req, res) => {
  try {
    const bodyEmail = (req.body && req.body.email) ? String(req.body.email).trim() : '';
    const targetEmail = ADMIN_EMAIL || bodyEmail;

    if (!targetEmail) {
      return res.status(400).json({ ok: false, message: 'Admin email nie je nastavený.' });
    }

    const admin = await Admin.findOne({ email: targetEmail });
    // ak admin neexistuje, stále vrátime OK – neprezrádzame stav
    if (admin) {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

      admin.resetPasswordToken = tokenHash;
      admin.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hodina
      await admin.save();

      const resetUrl = `${APP_URL}/admin_reset_password.html?token=${plainToken}`;
      const subject = 'Obnovenie admin hesla – Lištobook';
      const text = `Kliknite na tento odkaz pre nastavenie nového admin hesla: ${resetUrl}\nOdkaz je platný 1 hodinu. Ak ste o zmenu nepožiadali vy, ignorujte tento e-mail.`;
      const html = `
        <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">
          <p>Dobrý deň,</p>
          <p>prišla požiadavka na obnovenie <strong>admin hesla</strong> do Lištobooku.</p>
          <p>
            <a href="${resetUrl}" target="_blank"
              style="display:inline-block;padding:10px 16px;border-radius:8px;background:#0a2a52;color:#fff;text-decoration:none">
              Nastaviť nové admin heslo
            </a>
          </p>
          <p>Odkaz je platný 1 hodinu. Ak ste o zmenu nepožiadali vy, ignorujte tento e-mail.</p>
        </div>`;

      await mailer.sendMail({ to: targetEmail, subject, text, html });
      if (!IS_PROD) {
        console.log('DEV admin reset link:', resetUrl);
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin forgot error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/* ----------------------------------------------
 * POST /api/admin/password/reset
 * Body: { token, newPassword }
 * ---------------------------------------------- */
router.post('/password/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Chýba token alebo heslo.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ ok: false, message: 'Heslo musí mať aspoň 8 znakov.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await Admin.findOne({
      email: ADMIN_EMAIL,
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!admin) {
      return res.status(400).json({ ok: false, message: 'Neplatný alebo exspirovaný odkaz.' });
    }

    admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
    admin.resetPasswordToken = null;
    admin.resetPasswordExpires = null;
    await admin.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin reset error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/* ------------------------------------------------------
 * GET /api/admin/users  (bez hesla)
 * ------------------------------------------------------ */
router.get('/users', requireAdmin, async (_req, res) => {
  try {
    const users = await User.find(
      {},
      'email name note role lastSeen createdAt updatedAt newsletter'
    ).lean();
    return res.json(users);
  } catch (err) {
    console.error('Chyba pri načítaní používateľov:', err);
    return res.status(500).json({ message: 'Chyba servera pri získavaní používateľov' });
  }
});

/* ------------------------------------------------------
 * GET /api/admin/online
 * ------------------------------------------------------ */
router.get('/online', requireAdmin, (req, res) => {
  try {
    const sessions = req.app.get('sessions') || {};
    return res.json({ count: Object.keys(sessions).length || 0 });
  } catch {
    return res.json({ count: 0 });
  }
});

/* ------------------------------------------------------
 * PUT /api/admin/users/:id/note
 * ------------------------------------------------------ */
router.put('/users/:id/note', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note = '' } = req.body || {};
    const upd = await User.findByIdAndUpdate(id, { note }, { new: true });
    if (!upd) return res.status(404).json({ message: 'Používateľ sa nenašiel' });
    return res.json({ message: 'Poznámka uložená' });
  } catch (err) {
    console.error('Chyba pri ukladaní poznámky:', err);
    return res.status(500).json({ message: 'Chyba servera pri ukladaní poznámky' });
  }
});

/* ------------------------------------------------------ */
function escapeRegex(lit = '') {
  return String(lit).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ------------------------------------------------------
 * DELETE /api/admin/users/:id
 * ------------------------------------------------------ */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(id).session(session);
      if (!user) {
        res.status(404).send('Používateľ nenájdený');
        await session.abortTransaction();
        return;
      }

      const emailRaw = (user.email || '').trim();
      const nameRaw  = (user.name  || '').trim();
      const authorKeys = [emailRaw, nameRaw].filter(Boolean);

      await TimelinePost.deleteMany({ author: { $in: authorKeys } }).session(session);

      await TimelinePost.updateMany(
        {},
        { $pull: { comments: { author: { $in: authorKeys } } } }
      ).session(session);

      if (emailRaw) {
        const emailLower = emailRaw.toLowerCase();

        await Message.deleteMany({
          $or: [
            { fromEmail: emailRaw },
            { toEmail:   emailRaw },
            { fromEmail: emailLower },
            { toEmail:   emailLower }
          ]
        }).session(session);

        const anchored = new RegExp(`^${escapeRegex(emailRaw)}$`, 'i');
        await Message.deleteMany({
          $or: [
            { fromEmail: anchored },
            { toEmail:   anchored }
          ]
        }).session(session);
      }

      await User.deleteOne({ _id: user._id }).session(session);
    });

    return res.status(204).send();
  } catch (err) {
    console.error('Mazanie používateľa zlyhalo:', err);
    return res.status(500).send('Mazanie zlyhalo');
  } finally {
    session.endSession();
  }
});

module.exports = router;
