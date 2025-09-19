// routes/userRoutes.js
// Správa používateľov BEZ posielania e-mailov.
// (Registrácia a login sú v routes/authRoutes.js)

const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const router = express.Router();

const User = require('../models/User');
const Rating = require('../models/rating');
const TimelinePost = require('../models/timelinePost');

/* ========= CHECK NAME (dostupnosť prezývky) ========= */

router.get('/check-name', async (req, res) => {
  try {
    const raw = (req.query.name || '').trim();
    if (!raw) return res.json({ available: true });
    const nameLower = raw.toLocaleLowerCase('sk');
    const clash = await User.findOne({ nameLower });
    return res.json({ available: !clash });
  } catch (e) {
    console.error('GET /check-name error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= ADMIN: DELETE používateľa + jeho stopa ========= */

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

    // 1) hodnotenia
    const ratingsResult = await Rating.deleteMany({ email });

    // 2) príspevky
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

    // 3) komentáre
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

    // 4) samotný používateľ
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
    return res.status(500).json({ message: 'Chyba servera pri mazaní používateľa.' });
  }
});

/* ========= ADMIN: poznámka k používateľovi ========= */

router.put('/:id/note', async (req, res) => {
  try {
    const { id } = req.params;
    const { note = '' } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Neplatné ID.' });
    }
    const u = await User.findByIdAndUpdate(
      id,
      { note: String(note) },
      { new: true, projection: { password: 0 } }
    );
    if (!u) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    return res.json({ message: 'Poznámka uložená.', user: u });
  } catch (e) {
    console.error('PUT /api/users/:id/note error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= STARÉ DELETE aliasy (zachované kvôli kompatibilite) ========= */

router.delete('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Neplatné ID.' });
    }
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    return res.json({ message: 'Používateľ vymazaný.', id });
  } catch (e) {
    console.error('DELETE by-id error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

router.delete('/by-email/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const deleted = await User.findOneAndDelete({ email });
    if (!deleted) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    return res.json({ message: 'Používateľ vymazaný.', email });
  } catch (e) {
    console.error('DELETE by-email error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= UPDATE HESLA ========= */

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

    return res.json({ message: 'Heslo zmenené.' });
  } catch (e) {
    console.error('PUT password error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= UPDATE PROFILU (prezývka + poznámka) ========= */

router.put('/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const rawName = (req.body?.name ?? '').trim();
    const note = (req.body?.note ?? '').trim();

    const orig = await User.findOne({ email });
    if (!orig) return res.status(404).json({ message: 'Používateľ nenájdený.' });

    // jedinečnosť prezývky
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

    // ŽIADNE e-maily sa tu neposielajú
    return res.json({ message: 'Údaje uložené', user });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Táto prezývka je už obsadená.' });
    }
    console.error('PUT user error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= READ ========= */

router.get('/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await User.findOne({ email }, { password: 0 });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    return res.json(user);
  } catch (e) {
    console.error('GET user error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
