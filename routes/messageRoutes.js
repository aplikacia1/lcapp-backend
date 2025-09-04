// routes/messageRoutes.js
const express   = require('express');
const mongoose  = require('mongoose');
const router    = express.Router();

const Message   = require('../models/message');
const User      = require('../models/User');

// === ADMIN CONFIG (ENV + fallback) =========================
const ADMIN_NAME  = process.env.ADMIN_NAME || 'Lištové centrum';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'bratislava@listovecentrum.sk').trim();
// ==========================================================

// ---------- helpers ----------
const norm      = (s = '') => String(s).trim();
const toLowerSk = (s = '') => norm(s).toLocaleLowerCase('sk');

// Pracovná doba Po–Pi 08:00–16:00
function isWorkHours(d = new Date()) {
  const day = d.getDay();  // 0=Ne .. 6=So
  const hr  = d.getHours();
  const weekday = day >= 1 && day <= 5;
  return weekday && hr >= 8 && hr < 16;
}

function buildAutoReplyText() {
  if (isWorkHours()) {
    return "Ďakujeme za správu! 😊\n\nSme online v pracovnej dobe (Po–Pi 8:00–16:00) a ozveme sa čo najskôr. Prajeme pekný deň!";
  }
  return "Ďakujeme za správu! 💙\n\nMomentálne sme mimo pracovnej doby. Vašej správe sa budeme venovať počas pracovných hodín: Po–Pi 8:00–16:00. Prajeme pekný deň!";
}

async function maybeSendAdminAutoReply(toEmail, toNiceName) {
  if (!ADMIN_EMAIL) return;

  // posledná auto odpoveď admina tomuto človeku
  const last = await Message.findOne({
    fromEmail: ADMIN_EMAIL,
    toEmail,
    isAuto: true
  }).sort({ createdAt: -1 });

  // max 1× za 12 hodín
  if (last) {
    const diffMs = Date.now() - new Date(last.createdAt).getTime();
    if (diffMs < 12 * 60 * 60 * 1000) return;
  }

  await new Message({
    fromEmail: ADMIN_EMAIL,
    fromName : ADMIN_NAME,
    toEmail,
    toName   : toNiceName || toEmail,
    text     : buildAutoReplyText(),
    isAuto   : true,
    isRead   : false,
  }).save();
}

/* ---------------- Autocomplete podľa prezývky ---------------- */
router.get('/search-users', async (req, res) => {
  try {
    const q = toLowerSk(req.query.q || '');
    if (!q) return res.json(ADMIN_EMAIL ? [{ name: ADMIN_NAME, email: ADMIN_EMAIL }] : []);

    const rows = await User.find(
      { nameLower: { $regex: '^' + q } },
      { _id: 0, name: 1, email: 1 }
    ).limit(10);

    const out = ADMIN_EMAIL ? [{ name: ADMIN_NAME, email: ADMIN_EMAIL }, ...rows] : rows;
    res.json(out);
  } catch (e) {
    console.error('search-users error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------------- Odoslanie správy (podľa prezývky) ---------------- */
router.post('/send', async (req, res) => {
  try {
    const { fromEmail, toName, text } = req.body || {};
    if (!fromEmail || !toName || !text) {
      return res.status(400).json({ message: 'Chýbajú údaje (fromEmail, toName, text).' });
    }

    const fromUser = await User.findOne({ email: norm(fromEmail) });
    const fromNice = fromUser?.name || norm(fromEmail);

    let toEmail = null;
    let toNice  = norm(toName);

    if (toLowerSk(toName) === toLowerSk(ADMIN_NAME)) {
      if (!ADMIN_EMAIL) return res.status(400).json({ message: 'Admin e-mail nie je nastavený.' });
      toEmail = ADMIN_EMAIL;
      toNice  = ADMIN_NAME;
    } else {
      const rec = await User.findOne({ nameLower: toLowerSk(toName) });
      if (!rec) return res.status(404).json({ message: 'Používateľ s touto prezývkou neexistuje.' });
      toEmail = rec.email;
      toNice  = rec.name || rec.email;
    }

    await new Message({
      fromEmail: norm(fromEmail),
      fromName : fromNice,
      toEmail  : norm(toEmail),
      toName   : toNice,
      text     : String(text).slice(0, 2000),
      isRead   : false
    }).save();

    // Auto-reply ak ide na admina
    if (ADMIN_EMAIL && toLowerSk(toEmail) === toLowerSk(ADMIN_EMAIL)) {
      await maybeSendAdminAutoReply(norm(fromEmail), fromNice);
    }

    res.status(201).json({ message: 'Správa odoslaná.' });
  } catch (e) {
    console.error('send message error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------------- Inbox / Outbox (legacy kompatibilita) ---------------- */
router.get('/inbox/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email || '');
    const rows = await Message.find({ toEmail: email }).sort({ createdAt: -1 }).limit(200);
    res.json(rows);
  } catch (e) {
    console.error('inbox error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

router.get('/outbox/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email || '');
    const rows = await Message.find({ fromEmail: email }).sort({ createdAt: -1 }).limit(200);
    res.json(rows);
  } catch (e) {
    console.error('outbox error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------------- Prehľad konverzácií (ľavý panel) ---------------- */
router.get('/conversations/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email || '');

    const pipeline = [
      { $match: { $or: [ { fromEmail: email }, { toEmail: email } ] } },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          otherEmail: { $cond: [ { $eq: ['$fromEmail', email] }, '$toEmail', '$fromEmail' ] },
          otherName : { $cond: [ { $eq: ['$fromEmail', email] }, '$toName',  '$fromName'  ] },
          unreadForMe: {
            $cond: [
              { $and: [ { $eq: ['$toEmail', email] }, { $eq: ['$isRead', false] } ] },
              1, 0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$otherEmail',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: { $sum: '$unreadForMe' }
        }
      },
      {
        $project: {
          _id: 0,
          otherEmail: '$lastMessage.otherEmail',
          otherName : '$lastMessage.otherName',
          lastText  : '$lastMessage.text',
          lastAt    : '$lastMessage.createdAt',
          unread    : '$unreadCount'
        }
      },
      { $sort: { lastAt: -1 } },
      { $limit: 200 }
    ];

    const rows = await Message.aggregate(pipeline).exec();

    // pridaj admina, ak nie je
    if (ADMIN_EMAIL && !rows.some(r => (r.otherEmail || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
      rows.unshift({ otherEmail: ADMIN_EMAIL, otherName: ADMIN_NAME, lastText: '', lastAt: null, unread: 0 });
    }

    res.json(rows);
  } catch (e) {
    console.error('conversations error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------------- Vlákno + mark-as-read ---------------- */
router.get('/thread', async (req, res) => {
  try {
    const me   = norm(req.query.email  || '');
    const them = norm(req.query.with   || '');
    if (!me || !them) return res.status(400).json({ message: 'Chýbajú parametre.' });

    const messages = await Message.find({
      $or: [
        { fromEmail: me,   toEmail: them },
        { fromEmail: them, toEmail: me   }
      ]
    }).sort({ createdAt: 1 }).limit(500);

    // označ ako prečítané správy THEM -> ME
    await Message.updateMany(
      { fromEmail: them, toEmail: me, isRead: false },
      { $set: { isRead: true } }
    );

    res.json(messages);
  } catch (e) {
    console.error('thread error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------------- Počet neprečítaných ---------------- */
router.get('/unread-count/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email || '');
    const n = await Message.countDocuments({ toEmail: email, isRead: false });
    res.json({ count: n });
  } catch (e) {
    console.error('unread-count error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------------- Admin helpery ---------------- */
router.get('/admin-address', (req, res) => {
  res.json({ email: ADMIN_EMAIL || '', name: ADMIN_NAME });
});

router.post('/send-by-email', async (req, res) => {
  try {
    const { fromEmail, toEmail, text } = req.body || {};
    if (!fromEmail || !toEmail || !text) {
      return res.status(400).json({ message: 'Chýba fromEmail, toEmail alebo text.' });
    }
    if (!ADMIN_EMAIL) return res.status(400).json({ message: 'Admin e-mail nie je nastavený.' });
    if (toLowerSk(fromEmail) !== toLowerSk(ADMIN_EMAIL)) {
      return res.status(403).json({ message: 'Len admin môže posielať touto cestou.' });
    }

    const fromUser = await User.findOne({ email: norm(fromEmail) });
    const toUser   = await User.findOne({ email: norm(toEmail) });

    await new Message({
      fromEmail: norm(fromEmail),
      fromName : fromUser?.name || ADMIN_NAME,
      toEmail  : norm(toEmail),
      toName   : toUser?.name || norm(toEmail),
      text     : String(text).slice(0, 2000),
      isRead   : false
    }).save();

    res.status(201).json({ message: 'Správa odoslaná.' });
  } catch (e) {
    console.error('admin send-by-email error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ---------------- Broadcast všetkým (okrem admina) ---------------- */
router.post('/broadcast', async (req, res) => {
  try {
    const { fromEmail, text } = req.body || {};
    if (!fromEmail || !text) {
      return res.status(400).json({ message: 'Chýba fromEmail alebo text.' });
    }
    if (!ADMIN_EMAIL) {
      return res.status(400).json({ message: 'Admin e-mail nie je nastavený.' });
    }
    if (toLowerSk(fromEmail) !== toLowerSk(ADMIN_EMAIL)) {
      return res.status(403).json({ message: 'Broadcast môže posielať iba admin.' });
    }

    // všetci okrem admina (iba email + name)
    const users = await User.find(
      { email: { $ne: ADMIN_EMAIL } },
      { _id: 0, email: 1, name: 1 }
    ).lean();

    if (!users.length) return res.json({ message: 'Nie je komu odoslať.', sent: 0 });

    const docs = users
      .filter(u => !!u.email)
      .map(u => ({
        fromEmail: ADMIN_EMAIL,
        fromName : ADMIN_NAME,
        toEmail  : String(u.email).trim(),
        toName   : (u.name && String(u.name).trim()) || String(u.email).trim(),
        text     : String(text).slice(0, 2000),
        isRead   : false
      }));

    const result = await Message.insertMany(docs, { ordered: false });
    return res.json({ message: 'Broadcast odoslaný.', sent: result.length });
  } catch (e) {
    console.error('broadcast error', e);
    return res.status(500).json({ message: 'Broadcast zlyhal.' });
  }
});

/* ---------------- Mazanie (s kontrolou) + fallback ---------------- */
router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const requesterEmail = norm(req.body?.requesterEmail || '');
    if (!requesterEmail) return res.status(400).json({ message: 'Chýba requesterEmail.' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Neplatné ID správy.' });

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: 'Správa nenájdená.' });

    const isAdmin     = ADMIN_EMAIL && toLowerSk(requesterEmail) === toLowerSk(ADMIN_EMAIL);
    const isSender    = toLowerSk(requesterEmail) === toLowerSk(msg.fromEmail || '');
    const isRecipient = toLowerSk(requesterEmail) === toLowerSk(msg.toEmail   || '');

    if (!isAdmin && !isSender && !isRecipient) {
      return res.status(403).json({ message: 'Nemáte oprávnenie zmazať túto správu.' });
    }

    await Message.findByIdAndDelete(id);
    res.json({ message: 'Správa zmazaná.' });
  } catch (e) {
    console.error('delete message error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// Fallback: keď klient neposiela body v DELETE, použi query
router.delete('/delete/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const requesterEmail = norm(req.query?.requesterEmail || '');
    if (!requesterEmail) return res.status(400).json({ message: 'Chýba requesterEmail.' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Neplatné ID správy.' });

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: 'Správa nenájdená.' });

    const isAdmin     = ADMIN_EMAIL && toLowerSk(requesterEmail) === toLowerSk(ADMIN_EMAIL);
    const isSender    = toLowerSk(requesterEmail) === toLowerSk(msg.fromEmail || '');
    const isRecipient = toLowerSk(requesterEmail) === toLowerSk(msg.toEmail   || '');

    if (!isAdmin && !isSender && !isRecipient) {
      return res.status(403).json({ message: 'Nemáte oprávnenie zmazať túto správu.' });
    }

    await Message.findByIdAndDelete(id);
    res.json({ message: 'Správa zmazaná.' });
  } catch (e) {
    console.error('delete message (fallback) error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
