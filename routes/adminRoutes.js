// backend/routes/adminRoutes.js
// BUILD: adminRoutes v-delmsgs-2
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Admin = require('../models/adminModel');
const User = require('../models/User');
const TimelinePost = require('../models/timelinePost');
const Message = require('../models/message'); // <-- presne podľa tvojho models/message.js

// TODO: nahraď reálnou kontrolou admina (session/JWT)
const requireAdmin = (_req, _res, next) => next();

/* -----------------------------
 * POST /api/admin/login
 * Body: { email, password }
 * ----------------------------- */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Chýba email alebo heslo' });

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: 'Admin neexistuje' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Nesprávne heslo' });

    return res.json({ message: 'Prihlásenie úspešné' });
  } catch (err) {
    console.error('Chyba pri prihlasovaní:', err);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

/* ---------------------------------------
 * PUT /api/admin/password
 * Body: { currentPassword, newPassword }
 * --------------------------------------- */
router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL || 'bratislava@listovecentrum.sk';
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Chýba aktuálne alebo nové heslo' });

  try {
    const admin = await Admin.findOne({ email: adminEmail });
    if (!admin) return res.status(404).json({ message: 'Admin neexistuje' });

    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Nesprávne aktuálne heslo' });

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();
    return res.json({ message: 'Heslo úspešne zmenené' });
  } catch (err) {
    console.error('Chyba pri zmene hesla:', err);
    return res.status(500).json({ message: 'Chyba servera pri zmene hesla' });
  }
});

/* ------------------------------------------------------
 * GET /api/admin/users
 * (bez hesla) – pošleme len potrebné polia
 * ------------------------------------------------------ */
router.get('/users', requireAdmin, async (_req, res) => {
  try {
    const users = await User.find(
      {},
      'email name note role lastSeen createdAt updatedAt newsletter' // ← pridaný newsletter
    ).lean();
    return res.json(users);
  } catch (err) {
    console.error('Chyba pri načítaní používateľov:', err);
    return res.status(500).json({ message: 'Chyba servera pri získavaní používateľov' });
  }
});

/* ------------------------------------------------------
 * GET /api/admin/online
 * (prispôsob si podľa svojho trackovania)
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
 * Uloženie admin poznámky do poľa `note` v User
 * Body: { note: string }
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

/* ------------------------------------------------------
 * Helpery pre bezpečné maznutie správ
 * ------------------------------------------------------ */
function escapeRegex(lit = '') {
  return String(lit).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ------------------------------------------------------
 * DELETE /api/admin/users/:id
 * Zmaže používateľa a jeho stopu v Lištobooku
 * – TimelinePost.author === user.email alebo user.name
 * – comments.author === user.email alebo user.name
 * – PRIVATE MESSAGES: všetky správy, kde je fromEmail==user.email alebo toEmail==user.email
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

      // 1) Zmaž jeho príspevky
      await TimelinePost.deleteMany({ author: { $in: authorKeys } }).session(session);

      // 2) Vyhoď jeho komentáre z ostatných príspevkov
      await TimelinePost.updateMany(
        {},
        { $pull: { comments: { author: { $in: authorKeys } } } }
      ).session(session);

      // 3) Zmaž jeho súkromné správy
      if (emailRaw) {
        const emailLower = emailRaw.toLowerCase();

        // 3a) Rýchly delete cez rovnosť (využije indexy)
        await Message.deleteMany({
          $or: [
            { fromEmail: emailRaw },
            { toEmail:   emailRaw },
            { fromEmail: emailLower },
            { toEmail:   emailLower }
          ]
        }).session(session);

        // 3b) Fallback: case-insensitive presná zhoda (pre istotu)
        const anchored = new RegExp(`^${escapeRegex(emailRaw)}$`, 'i');
        await Message.deleteMany({
          $or: [
            { fromEmail: anchored },
            { toEmail:   anchored }
          ]
        }).session(session);
      }

      // 4) Zmaž samotného používateľa
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
