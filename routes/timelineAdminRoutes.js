// routes/timelineAdminRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const TimelinePost = require('../models/timelinePost');
const User = require('../models/User');

// TODO: sem si pridaj reálnu autorizáciu na admina (token/sess/role).
const requireAdmin = (req, res, next) => {
  // napr. if (!req.user || req.user.role !== 'admin') return res.status(403).json({message:'Len pre admina'});
  next();
};

/**
 * DELETE /api/admin/timeline/posts/:postId
 * Vymaže konkrétny príspevok (bez ohľadu na autora).
 */
router.delete('/posts/:postId', requireAdmin, async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Neplatné ID príspevku.' });
    }
    const del = await TimelinePost.findByIdAndDelete(postId);
    if (!del) return res.status(404).json({ message: 'Príspevok sa nenašiel.' });
    return res.json({ message: 'Príspevok vymazaný.', id: postId });
  } catch (e) {
    console.error('DELETE /admin/timeline/posts/:postId', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/**
 * DELETE /api/admin/timeline/posts/:postId/comments/:commentId
 * Vymaže konkrétny komentár z príspevku.
 */
router.delete('/posts/:postId/comments/:commentId', requireAdmin, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Neplatné ID.' });
    }
    const upd = await TimelinePost.updateOne(
      { _id: postId },
      { $pull: { comments: { _id: new mongoose.Types.ObjectId(commentId) } } }
    );
    if (!upd.matchedCount) return res.status(404).json({ message: 'Príspevok sa nenašiel.' });
    return res.json({ message: 'Komentár vymazaný.', postId, commentId });
  } catch (e) {
    console.error('DELETE /admin/timeline/posts/:postId/comments/:commentId', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

/**
 * POST /api/admin/timeline/cleanup-orphans
 * Jednorazový „hard cleanup“ sirotích príspevkov (autor už v Users neexistuje).
 * Body: { confirm: boolean, dryRun?: boolean }
 *
 * Pozn.: Bezpečný režim – najprv odošli {dryRun:true} (alebo nič) a pozri si počty.
 * Až potom odošli {confirm:true, dryRun:false} na reálne vymazanie.
 */
router.post('/cleanup-orphans', requireAdmin, async (req, res) => {
  try {
    const { confirm = false, dryRun = true } = req.body || {};

    // Získaj existujúce identifikátory používateľov
    const [existingEmails, existingIds, existingNames] = await Promise.all([
      User.distinct('email'),
      User.distinct('_id'),
      User.distinct('name')
    ]);
    const idsSet = new Set(existingIds.map(String));
    const emailsSet = new Set(existingEmails.map(String));
    const namesSet = new Set(existingNames.map(n => (n || '').trim().toLowerCase()));

    // Nájdeme kandidátov: posty, kde autor neexistuje podľa emailu/ID/mena
    const candidates = await TimelinePost.find({}, {
      email: 1, userEmail: 1, authorEmail: 1,
      userId: 1, authorId: 1, createdBy: 1,
      author: 1, authorName: 1, user: 1
    }).lean();

    const badIds = [];
    for (const p of candidates) {
      const email =
        p.email || p.userEmail || p.authorEmail ||
        (p.author && p.author.email) || (p.user && p.user.email) || null;

      const uid =
        p.userId || p.authorId || p.createdBy ||
        (p.author && p.author._id) || (p.user && p.user._id) || null;

      const name =
        p.authorName || p.author || (p.user && p.user.name) ||
        (p.author && p.author.name) || p.userName || p.nickname || p.name || null;

      const emailOk = email ? emailsSet.has(String(email)) : false;
      const idOk = uid ? idsSet.has(String(uid)) : false;
      const nameOk = name ? namesSet.has(String(name).trim().toLowerCase()) : false;

      // sirota = neexistuje ani ID, ani email, ani (voliteľne) meno
      if (!emailOk && !idOk && name && !nameOk) badIds.push(p._id);
      else if (!emailOk && !idOk && !name) badIds.push(p._id);
    }

    if (dryRun || !confirm) {
      return res.json({
        message: 'Dry-run: žiadne mazanie neprebehlo.',
        candidates: badIds.length,
        idsPreview: badIds.slice(0, 50) // ukážka
      });
    }

    const del = await TimelinePost.deleteMany({ _id: { $in: badIds } });
    return res.json({
      message: 'Siroty vymazané.',
      deletedCount: del.deletedCount || 0
    });
  } catch (e) {
    console.error('POST /admin/timeline/cleanup-orphans', e);
    return res.status(500).json({ message: 'Chyba servera.' });
  }
});

module.exports = router;
