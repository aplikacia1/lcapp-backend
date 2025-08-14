// routes/ratingRoutes.js
const express = require('express');
const router = express.Router();

const Rating  = require('../models/rating');
const Product = require('../models/product');
const User    = require('../models/user');

// -------- helpers
async function getSummaryFor(productId) {
  const list = await Rating.find({ productId }).sort({ createdAt: -1 });
  const count = list.length;
  const average = count ? +(list.reduce((s, r) => s + r.stars, 0) / count).toFixed(1) : 0;
  return { count, average };
}

// -------- create / upsert rating (len s prezývkou)
router.post('/', async (req, res) => {
  try {
    const { productId, email, stars, comment } = req.body || {};
    if (!productId || !email || !stars) {
      return res.status(400).json({ message: 'Chýba productId, email alebo stars.' });
    }
    const nStars = Number(stars);
    if (nStars < 1 || nStars > 5) {
      return res.status(400).json({ message: 'Počet hviezdičiek musí byť 1–5.' });
    }

    const prod = await Product.findById(productId);
    if (!prod) return res.status(404).json({ message: 'Produkt nenájdený.' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(403).json({ message: 'Hodnotiť môžu len registrovaní používatelia.' });
    }
    const nick = (user.name || '').trim();
    if (!nick) {
      return res.status(403).json({ message: 'Najprv si v dashboarde nastav prezývku.' });
    }

    await Rating.findOneAndUpdate(
      { productId, email },
      {
        $setOnInsert: { productId, email },
        $set: { stars: nStars, comment: comment || '', authorName: nick }
      },
      { upsert: true, new: true, runValidators: true }
    );

    const summary = await getSummaryFor(productId);
    return res.status(200).json({ message: 'OK', summary });
  } catch (e) {
    if (String(e?.code) === '11000') {
      return res.status(409).json({ message: 'Už ste tento produkt hodnotili.' });
    }
    console.error('ratings POST error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

// -------- list (verejný zoznam recenzií) – doplníme nick pre staré záznamy
router.get('/list/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // 1) načítaj hodnotenia
    const rows = await Rating.find(
      { productId },
      { stars: 1, comment: 1, authorName: 1, email: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).lean();

    if (!rows.length) return res.json([]);

    // 2) zisti, pre ktoré záznamy chýba authorName
    const missingEmails = [...new Set(rows.filter(r => !r.authorName).map(r => r.email))];

    // 3) doťahni prezývky týchto používateľov naraz
    let nameByEmail = {};
    if (missingEmails.length) {
      const users = await User.find(
        { email: { $in: missingEmails } },
        { email: 1, name: 1 }
      ).lean();
      nameByEmail = Object.fromEntries(
        users.map(u => [u.email, (u.name || '').trim()])
      );
    }

    // 4) vráť zoznam s doplnenými menami
    const out = rows.map(r => ({
      id: r._id,
      stars: r.stars,
      comment: r.comment || '',
      authorName: r.authorName || nameByEmail[r.email] || 'Anonym',
      createdAt: r.createdAt
    }));

    res.json(out);
  } catch (e) {
    console.error('ratings list error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// -------- summary (počet + priemer)
router.get('/summary/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const summary = await getSummaryFor(productId);
    res.json(summary); // { count, average }
  } catch (e) {
    console.error('ratings summary error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

// -------- aliasy kvôli starším cestám
router.get('/:id/summary', (req, res, next) => {
  req.params.productId = req.params.id;
  return router.handle({ ...req, url: `/summary/${req.params.id}` }, res, next);
});
router.get('/:id/list', (req, res, next) => {
  req.params.productId = req.params.id;
  return router.handle({ ...req, url: `/list/${req.params.id}` }, res, next);
});

module.exports = router;
