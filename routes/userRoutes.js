// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const Rating = require('../models/rating');
const TimelinePost = require('../models/timelinePost');

// ⭐ pridané – použijeme na uvítací e-mail po prvom nastavení prezývky
const { sendWelcomeEmail } = require('../utils/mailer');

/* ========= AUTH ========= */

// REGISTER – bez uvítacieho mailu (pošleme až po prvom nastavení prezývky)
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Chýba e-mail alebo heslo.' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Účet už existuje.' });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hash,
      name: '',
      nameLower: null,
      note: ''
      // profileWelcomeSentAt: null  // default z modelu
    });
    await user.save();

    // ⭐ (ZMENENÉ) už NEposielame welcome tu – pošleme až po prvom nastavení prezývky
    res.status(201).json({ message: 'Registrácia úspešná', email: user.email });
  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Chýba e-mail alebo heslo.' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Nesprávny e-mail alebo heslo.' });

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ message: 'Nesprávny e-mail alebo heslo.' });

    res.json({
      message: 'Prihlásenie OK',
      email: user.email,
      name: user.name || '',
      note: user.note || ''
    });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// LIVE kontrola prezývky
router.get('/check-name', async (req, res) => {
  try {
    const raw = (req.query.name || '').trim();
    if (!raw) return res.json({ available: true });
    const nameLower = raw.toLocaleLowerCase('sk');
    const clash = await User.findOne({ nameLower });
    res.json({ available: !clash });
  } catch (e) {
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= ADMIN DELETE & NOTE ========= */

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Neplatné ID.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený.' });

    const email  = user.email;
    const userId = user._id;
    const nick   = (user.name || '').trim();
    const nickRX = nick ? new RegExp(`^${nick}$`, 'i') : null;

    const ratingsResult = await Rating.deleteMany({ email });

    const postOwnerFilter = {
      $or: [
        { email }, { userEmail: email }, { authorEmail: email },
        { 'author.email': email }, { 'user.email': email },
        { userId }, { authorId: userId }, { createdBy: userId },
        { 'author._id': userId }, { 'user._id': userId },
        ...(nick ? [
          { authorName: nickRX }, { author: nickRX }, { nickname: nickRX }, { userName: nickRX }, { name: nickRX },
          { 'author.name': nickRX }, { 'user.name': nickRX }
        ] : [])
      ]
    };
    const postsResult = await TimelinePost.deleteMany(postOwnerFilter);

    const pullOr = [
      { email }, { userEmail: email }, { authorEmail: email },
      { 'author.email': email },
      { userId }, { authorId: userId }, { 'author._id': userId }
    ];
    if (nickRX) {
      pullOr.push(
        { authorName: nickRX }, { author: nickRX }, { nickname: nickRX }, { userName: nickRX }, { name: nickRX },
        { 'author.name': nickRX }
      );
    }
    const commentsPull = await TimelinePost.updateMany({}, { $pull: { comments: { $or: pullOr } } });

    await User.findByIdAndDelete(id);

    return res.json({
      message: 'Používateľ a jeho obsah bol vymazaný.',
      deleted: {
        ratings: ratingsResult.deletedCount || 0,
        posts: postsResult.deletedCount || 0,
        commentsModifiedPosts: commentsPull.modifiedCount || 0
      }
    });
  } catch (e) {
    console.error('DELETE /api/users/:id error', e);
    res.status(500).json({ message: 'Chyba servera pri mazaní používateľa.' });
  }
});

router.put('/:id/note', async (req, res) => {
  try {
    const { id } = req.params;
    const { note = '' } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Neplatné ID.' });
    }
    const u = await User.findByIdAndUpdate(id, { note: String(note) }, { new: true, projection: { password: 0 } });
    if (!u) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    res.json({ message: 'Poznámka uložená.', user: u });
  } catch (e) {
    console.error('PUT /api/users/:id/note error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= pôvodné DELETE aliasy ========= */

router.delete('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Neplatné ID.' });
    }
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    res.json({ message: 'Používateľ vymazaný.', id });
  } catch (e) {
    console.error('delete by-id error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

router.delete('/by-email/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const deleted = await User.findOneAndDelete({ email });
    if (!deleted) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    res.json({ message: 'Používateľ vymazaný.', email });
  } catch (e) {
    console.error('delete by-email error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= UPDATE ========= */

router.put('/:email/password', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Chýbajú údaje.' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený.' });

    const ok = await bcrypt.compare(oldPassword, user.password || '');
    if (!ok) return res.status(401).json({ message: 'Nesprávne staré heslo.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Heslo zmenené.' });
  } catch (e) {
    console.error('password change error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

router.put('/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const rawName = (req.body?.name ?? '').trim();
    const note = (req.body?.note ?? '').trim();

    // ⭐ načítame pôvodného používateľa, aby sme vedeli zistiť hadName
    const orig = await User.findOne({ email });
    if (!orig) return res.status(404).json({ message: 'Používateľ nenájdený.' });

    const hadName = !!(orig.name && orig.name.trim());

    // validácia jedinečnosti prezývky
    const nameLower = rawName ? rawName.toLocaleLowerCase('sk') : null;
    if (nameLower) {
      const clash = await User.findOne({ nameLower, email: { $ne: email } });
      if (clash) return res.status(409).json({ message: 'Táto prezývka je už obsadená.' });
    }

    const update = { name: rawName, note };
    if (nameLower) update.nameLower = nameLower;
    else update.$unset = { nameLower: 1 };

    const user = await User.findOneAndUpdate(
      { email },
      update,
      { new: true, projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený.' });

    // ⭐ po prvom nastavení prezývky pošli uvítací e-mail (ak ešte nebol)
    const hasNameNow = !!(user.name && user.name.trim());
    if (!hadName && hasNameNow && !orig.profileWelcomeSentAt) {
      try {
        await sendWelcomeEmail(user.email, user.name.trim());
        await User.updateOne(
          { _id: orig._id },
          { $set: { profileWelcomeSentAt: new Date() } }
        );
      } catch (err) {
        console.warn('Welcome po nastavení prezývky zlyhal:', err?.message || err);
        // neblokujeme odpoveď – len log
      }
    }

    res.json({ message: 'Údaje uložené', user });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Táto prezývka je už obsadená.' });
    }
    console.error('update user error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= READ ========= */

router.get('/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await User.findOne({ email }, { password: 0 });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    res.json(user);
  } catch (e) {
    console.error('get user error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
