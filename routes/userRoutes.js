// routes/userRoutes.js
// Správa používateľov. COMPAT registrácia na /api/users/register
// (Nový oficiálny endpoint je /api/auth/register)

const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const router = express.Router();

const User = require('../models/User');
const Rating = require('../models/rating');
const TimelinePost = require('../models/timelinePost');
const { sendSignupEmail } = require('../utils/mailer'); // info mail po registrácii

/* ========= COMPAT: REGISTRÁCIA (POST /api/users/register) ========= */
router.post('/register', async (req, res) => {
  try {
    let { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Chýba email alebo heslo' });

    email = String(email).trim();
    name = String(name || '').trim();

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Používateľ už existuje' });
    if (password.length < 6) return res.status(400).json({ message: 'Heslo musí mať aspoň 6 znakov' });

    const passwordHash = await bcrypt.hash(password, 10);

    const doc = {
      email,
      password: passwordHash,
      name: name || '',
      note: '',
      role: 'user',
      newsletter: false
    };
    if (doc.name) doc.nameLower = doc.name.toLowerCase();

    const newUser = await User.create(doc);

    try { await sendSignupEmail(newUser.email); } catch (e) { console.error('Signup email (compat) failed:', e?.message || e); }
    return res.status(201).json({ message: 'Registrácia úspešná', userId: newUser._id });
  } catch (err) {
    console.error('Compat register error:', err);
    return res.status(500).json({ message: 'Chyba servera' });
  }
});

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

/* ========= PUBLIC: profil podľa prezývky (len safe polia) ========= */
// GET /api/users/public/by-name/:name
router.get('/public/by-name/:name', async (req, res) => {
  try {
    const raw = String(req.params.name || '').trim();
    if (!raw) return res.status(400).json({ message: 'Chýba meno.' });

    const nameLower = raw.toLocaleLowerCase('sk');
    const user = await User.findOne(
      { nameLower },
      {
        _id: 0,
        name: 1,
        note: 1,      // mesto
        bio: 1,       // voliteľné
        company: 1,   // voliteľné
        avatarUrl: 1
      }
    ).lean();

    if (!user) return res.status(404).json({ message: 'Profil neexistuje.' });

    return res.json({
      name: user.name || raw,
      city: user.note || '',
      bio: user.bio || '',
      company: user.company || '',
      avatarUrl: user.avatarUrl || ''
    });
  } catch (e) {
    console.error('GET /api/users/public/by-name error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= ADMIN: DELETE používateľa + jeho stopa ========= */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Neplatné ID.' });

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
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Neplatné ID.' });
    const u = await User.findByIdAndUpdate(id, { note: String(note) }, { new: true, projection: { password: 0 } });
    if (!u) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    return res.json({ message: 'Poznámka uložená.', user: u });
  } catch (e) {
    console.error('PUT /api/users/:id/note error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= STARÉ DELETE aliasy ========= */
router.delete('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Neplatné ID.' });
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
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Chýbajú údaje.' });

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

/* ========= UPDATE PROFILU (BEZPEČNÝ PATCH) ========= */
router.put('/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const b = req.body || {};

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený.' });

    const TRIM = (s, n=200) => typeof s === 'string' ? s.trim().slice(0,n) : s;

    const allow = [
      'name','note','fullName','bio',
      'companyName','companyICO','companyDIC','companyICDPH',
      'web','instagram','avatarUrl'
    ];

    const update = {};
    allow.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(b, k)) {
        const lim = (k==='bio') ? 1000
                  : (k==='companyName') ? 160
                  : (k==='companyICDPH') ? 24
                  : (k==='web'||k==='instagram'||k==='avatarUrl') ? 600
                  : (k==='name') ? 60
                  : (k==='note') ? 120 : 200;
        update[k] = TRIM(b[k], lim);
      }
    });

    if (Object.prototype.hasOwnProperty.call(b,'newsletter')) {
      const v = b.newsletter;
      update.newsletter =
        (typeof v === 'boolean') ? v :
        (typeof v === 'number') ? v !== 0 :
        (typeof v === 'string') ? ['true','1','on','yes','y'].includes(v.toLowerCase()) :
        false;
    }

    if (Object.prototype.hasOwnProperty.call(update,'name')) {
      const rawName = update.name || '';
      if (rawName) {
        const nameLower = rawName.toLocaleLowerCase('sk');
        const clash = await User.findOne({ nameLower, email: { $ne: email } });
        if (clash) return res.status(409).json({ message: 'Táto prezývka je už obsadená.' });
        update.nameLower = nameLower;
      } else {
        update.$unset = { ...(update.$unset||{}), nameLower: 1 };
      }
    }

    const saved = await User.findOneAndUpdate(
      { email },
      update,
      { new: true, projection: { password: 0 } }
    );

    return res.json({ message: 'Údaje uložené', user: saved });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Táto prezývka je už obsadená.' });
    console.error('PUT user error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ========= READ ========= */
router.get('/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await User.findOne(
      { email },
      { password: 0 }
    );
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený.' });
    return res.json(user);
  } catch (e) {
    console.error('GET user error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
