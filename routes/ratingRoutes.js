// backend/routes/ratingRoutes.js
const express = require('express');
const router = express.Router();

const Rating  = require('../models/rating');
const Product = require('../models/product');
const User    = require('../models/User'); // ⬅️ dôležité: veľké "U"

/* ───────── helpers ───────── */
async function getSummaryFor(productId) {
  const list = await Rating.find({ productId }).sort({ createdAt: -1 }).lean();
  const count = list.length;
  const average = count ? +(list.reduce((s, r) => s + (Number(r.stars) || 0), 0) / count).toFixed(1) : 0;
  return { count, average };
}

/* ───────── POST /api/ratings ─────────
   Vytvorí alebo prepíše hodnotenie (1 email = 1 hodnotenie na produkt).
   Vyžaduje, aby mal používateľ nastavenú prezývku (User.name). */
router.post('/', async (req, res) => {
  try {
    const { productId, email, stars, comment } = req.body || {};
    if (!productId || !email || stars == null) {
      return res.status(400).json({ message: 'Chýba productId, email alebo stars.' });
    }
    const nStars = Number(stars);
    if (!Number.isFinite(nStars) || nStars < 1 || nStars > 5) {
      return res.status(400).json({ message: 'Počet hviezdičiek musí byť 1–5.' });
    }

    const prod = await Product.findById(productId);
    if (!prod) return res.status(404).json({ message: 'Produkt nenájdený.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(403).json({ message: 'Hodnotiť môžu len registrovaní používatelia.' });
    const nick = (user.name || '').trim();
    if (!nick)  return res.status(403).json({ message: 'Najprv si v dashboarde nastav prezývku.' });

    await Rating.findOneAndUpdate(
      { productId, email },
      { $setOnInsert: { productId, email }, $set: { stars: nStars, comment: comment || '', authorName: nick } },
      { upsert: true, new: true, runValidators: true }
    );

    // prepočet a zápis do produktu (aby sa ukazoval priemer/počet aj v zoznamoch)
    const summary = await getSummaryFor(productId);
    await Product.findByIdAndUpdate(
      productId,
      { $set: { averageRating: summary.average, ratingCount: summary.count } },
      { new: true }
    );

    return res.status(200).json({ message: 'OK', summary });
  } catch (e) {
    if (String(e?.code) === '11000') {
      return res.status(409).json({ message: 'Už ste tento produkt hodnotili.' });
    }
    console.error('ratings POST error', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/* ───────── GET /api/ratings/list/:productId ─────────
   Verejný zoznam recenzií (najnovšie prvé). Doplňuje chýbajúci authorName. */
router.get('/list/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const rows = await Rating.find(
      { productId },
      { stars: 1, comment: 1, authorName: 1, email: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).lean();

    if (!rows.length) return res.json([]);

    const missingEmails = [...new Set(rows.filter(r => !r.authorName).map(r => r.email))];
    let nameByEmail = {};
    if (missingEmails.length) {
      const users = await User.find(
        { email: { $in: missingEmails } },
        { email: 1, name: 1 }
      ).lean();
      nameByEmail = Object.fromEntries(users.map(u => [u.email, (u.name || '').trim()]));
    }

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

/* ───────── GET /api/ratings/summary/:productId ─────────
   Počet a priemer hodnotení (1 desatinné miesto). */
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

/* ───────── Aliasy kvôli starším cestám ───────── */
router.get('/:id/summary', async (req, res) => {
  try {
    const summary = await getSummaryFor(req.params.id);
    res.json(summary);
  } catch (e) {
    console.error('ratings alias summary error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

router.get('/:id/list', async (req, res) => {
  try {
    const rows = await Rating.find(
      { productId: req.params.id },
      { stars: 1, comment: 1, authorName: 1, email: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).lean();

    if (!rows.length) return res.json([]);

    const missingEmails = [...new Set(rows.filter(r => !r.authorName).map(r => r.email))];
    let nameByEmail = {};
    if (missingEmails.length) {
      const users = await User.find({ email: { $in: missingEmails } }, { email: 1, name: 1 }).lean();
      nameByEmail = Object.fromEntries(users.map(u => [u.email, (u.name || '').trim()]));
    }

    const out = rows.map(r => ({
      id: r._id,
      stars: r.stars,
      comment: r.comment || '',
      authorName: r.authorName || nameByEmail[r.email] || 'Anonym',
      createdAt: r.createdAt
    }));
    res.json(out);
  } catch (e) {
    console.error('ratings alias list error', e);
    res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
