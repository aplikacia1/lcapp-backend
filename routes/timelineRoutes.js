// routes/timelineRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const TimelinePost = require('../models/timelinePost');
const User = require('../models/User');

// ===== Upload obrázkov =====
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`)
});

// 👉 pridané: limit a filter
const upload = multer({
  storage,
  limits: { fileSize: 7 * 1024 * 1024 }, // max 7 MB
  fileFilter: (_req, file, cb) => {
    const okTypes = [
      'image/jpeg', 'image/png', 'image/webp',
      'image/gif', 'image/heic', 'image/heif'
    ];
    if (okTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nepodporovaný typ súboru.'));
    }
  }
});

// ===== Vulgarizmy =====
const bannedWords = ['idiot', 'debil', 'sprostý', 'hlúpy', 'nadávka', 'kokot', 'kkt', 'piča', 'hajzel'];
const containsBannedWords = (t = '') =>
  bannedWords.some(w => String(t).toLowerCase().includes(w));

// ===== Pomocná funkcia na zmazanie súboru z /uploads =====
const unlinkIfExists = (relUrl) => {
  if (!relUrl) return;
  try {
    if (!relUrl.startsWith('/uploads/')) return; // ochrana
    const base = path.basename(relUrl);
    const filePath = path.join(UPLOAD_DIR, base);
    fs.unlink(filePath, () => {});
  } catch {}
};

// ➕ Pridanie príspevku
router.post('/add', upload.single('image'), async (req, res) => {
  try {
    const { email, text } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený' });
    if (!user.name?.trim()) return res.status(400).json({ message: 'Chýba prezývka.' });
    if (!text && !req.file) return res.status(400).json({ message: 'Prázdny príspevok.' });
    if (containsBannedWords(text)) return res.status(400).json({ message: 'Text obsahuje nevhodné slová.' });

    const post = new TimelinePost({
      author: user.name,
      text: text || '',
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date()
    });

    await post.save();
    res.status(201).json({ message: 'Príspevok uložený' });
  } catch (e) {
    console.error('add error', e);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

// 📄 Získanie všetkých príspevkov
router.get('/', async (_req, res) => {
  try {
    const posts = await TimelinePost.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (e) {
    console.error('list error', e);
    res.status(500).json({ message: 'Chyba pri načítaní' });
  }
});

// 💬 Pridanie komentára
router.post('/comment/:postId', async (req, res) => {
  try {
    const { email, text } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený' });
    if (!user.name?.trim()) return res.status(400).json({ message: 'Chýba prezývka.' });
    if (!text?.trim()) return res.status(400).json({ message: 'Prázdny komentár.' });
    if (containsBannedWords(text)) return res.status(400).json({ message: 'Komentár obsahuje nevhodné slová.' });

    const post = await TimelinePost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Príspevok nenájdený' });

    post.comments.push({
      author: user.name,
      text: text.trim(),
      createdAt: new Date()
    });

    await post.save();
    res.status(200).json({ message: 'Komentár pridaný' });
  } catch (e) {
    console.error('comment error', e);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

// 🔥 Reakcia
router.post('/react/:postId', async (req, res) => {
  try {
    const { type } = req.body;
    const post = await TimelinePost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Príspevok nenájdený' });
    if (!['fire', 'devil', 'heart'].includes(type)) {
      return res.status(400).json({ message: 'Neplatný typ reakcie' });
    }

    post.reactions = post.reactions || { fire: 0, devil: 0, heart: 0 };
    post.reactions[type] = (post.reactions[type] || 0) + 1;
    await post.save();
    res.status(200).json({ message: 'Reakcia pridaná' });
  } catch (e) {
    console.error('react error', e);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

// 🗑️ Zmazať príspevok (iba autor)
router.delete('/:postId', async (req, res) => {
  try {
    const email = req.body?.email || req.query?.email;
    if (!email) return res.status(400).json({ message: 'Chýba email.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený' });

    const post = await TimelinePost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Príspevok nenájdený' });
    if (String(post.author) !== String(user.name)) {
      return res.status(403).json({ message: 'Nemáte oprávnenie.' });
    }

    unlinkIfExists(post.imageUrl);
    await post.deleteOne();
    res.status(200).json({ message: 'Príspevok zmazaný' });
  } catch (e) {
    console.error('post delete error', e);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

// 🗑️ Zmazať komentár (iba autor)
router.delete('/comment/:postId/:commentId', async (req, res) => {
  try {
    const email = req.body?.email || req.query?.email;
    if (!email) return res.status(400).json({ message: 'Chýba email.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Používateľ nenájdený' });

    const { postId, commentId } = req.params;
    const post = await TimelinePost.findById(postId);
    if (!post) return res.status(404).json({ message: 'Príspevok nenájdený' });

    const idx = Array.isArray(post.comments)
      ? post.comments.findIndex(c => String(c._id) === String(commentId))
      : -1;
    if (idx === -1) return res.status(404).json({ message: 'Komentár nenájdený' });

    const comment = post.comments[idx];
    if (String(comment.author) !== String(user.name)) {
      return res.status(403).json({ message: 'Nemáte oprávnenie.' });
    }

    post.comments.splice(idx, 1);
    post.markModified('comments');
    await post.save();

    res.status(200).json({ message: 'Komentár zmazaný' });
  } catch (e) {
    console.error('comment delete error', e);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

module.exports = router;
