// backend/routes/adminDashboardStatsRoutes.js
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * Jemná ochrana:
 * - Ak máš už v projekte admin auth middleware, skúsime ho použiť.
 * - Ak nie je, aspoň vyžadujeme, aby existovali cookies (credentials include),
 *   aby to nebolo úplne verejné.
 *
 * (Keď mi pošleš adminRoutes.js, vieme to napojiť na tvoju presnú kontrolu admina.)
 */
let adminAuth = null;
try {
  // skús typické cesty – ak u teba existuje middleware, toto ho zachytí
  adminAuth = require('../middleware/adminAuth');
} catch (_) {
  try { adminAuth = require('../middlewares/adminAuth'); } catch (_) {}
}

const requireSomeCookie = (req, res, next) => {
  const hasCookie = req.headers.cookie && req.headers.cookie.length > 0;
  if (!hasCookie) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const guard = adminAuth ? adminAuth : requireSomeCookie;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function collectionExists(name) {
  const cols = await mongoose.connection.db.listCollections({ name }).toArray();
  return cols.length > 0;
}

async function safeCount(collectionName, filter) {
  if (!(await collectionExists(collectionName))) return 0;
  return mongoose.connection.db.collection(collectionName).countDocuments(filter || {});
}

/**
 * Timeline: chceme "príspevky + komentáre"
 * - príspevky: počet dokumentov v kolekcii
 * - komentáre: súčet dĺžok pola "comments" (ak existuje)
 */
async function timelinePostsPlusComments(collectionName, fromDateOrNull) {
  if (!(await collectionExists(collectionName))) return { posts: 0, comments: 0, total: 0 };

  const match = fromDateOrNull
    ? { createdAt: { $gte: fromDateOrNull } }
    : {};

  // súčet komentárov: $size na comments, ak comments nie je pole -> 0
  const pipeline = [
    { $match: match },
    {
      $project: {
        commentsCount: {
          $cond: [
            { $isArray: '$comments' },
            { $size: '$comments' },
            0
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        posts: { $sum: 1 },
        comments: { $sum: '$commentsCount' }
      }
    }
  ];

  const res = await mongoose.connection.db.collection(collectionName).aggregate(pipeline).toArray();
  const row = res[0] || { posts: 0, comments: 0 };
  return { posts: row.posts || 0, comments: row.comments || 0, total: (row.posts || 0) + (row.comments || 0) };
}

/**
 * GET /api/admin/dashboard-stats
 * Vracia:
 * {
 *   ratings: { today, total },
 *   timeline: { today, total },
 *   orders: { today, total },
 *   clicks: { today, total } // zatiaľ 0, doplníme neskôr click-logom
 * }
 */
router.get('/dashboard-stats', guard, async (req, res) => {
  try {
    const from = startOfToday();

    // ===== Ratings =====
    // typické názvy kolekcií: "ratings"
    const ratingsToday = await safeCount('ratings', { createdAt: { $gte: from } });
    const ratingsTotal = await safeCount('ratings', {});

    // ===== Orders / admin messages =====
    // podľa tvojho mountu existuje orderRoutes => kolekcia typicky "orders"
    const ordersToday = await safeCount('orders', { createdAt: { $gte: from } });
    const ordersTotal = await safeCount('orders', {});

    // ===== Timeline activity (posts + comments) =====
    // typický názov: "timelineposts"
    const tlToday = await timelinePostsPlusComments('timelineposts', from);
    const tlTotal = await timelinePostsPlusComments('timelineposts', null);

    // ===== Clicks =====
    // zatiaľ nemáme click-log kolekciu, takže 0
    const clicksToday = 0;
    const clicksTotal = 0;

    return res.json({
      ratings: { today: ratingsToday, total: ratingsTotal },
      timeline: { today: tlToday.total, total: tlTotal.total },
      orders: { today: ordersToday, total: ordersTotal },
      clicks: { today: clicksToday, total: clicksTotal }
    });
  } catch (err) {
    console.error('dashboard-stats error:', err?.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
