// backend/routes/pushRoutes.js
const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// --- VAPID z ENV alebo (voliteľne) natvrdo bez .env -------------------------
const ENV_PUB  = process.env.VAPID_PUBLIC_KEY || '';
const ENV_PRIV = process.env.VAPID_PRIVATE_KEY || '';
const ENV_MAIL = process.env.PUSH_CONTACT || 'mailto:admin@example.com';

// Ak chceš ísť BEZ .env, vlož sem svoje kľúče a zahoď ENV_*:
const HARD_PUB  = ''; // napr. 'BKoWNs...'
const HARD_PRIV = ''; // napr. 'D13gtz...'
const HARD_MAIL = 'mailto:bratislava@listovecentrum.sk';

const PUB  = ENV_PUB  || HARD_PUB;
const PRIV = ENV_PRIV || HARD_PRIV;
const MAIL = (ENV_PUB || ENV_PRIV) ? ENV_MAIL : HARD_MAIL;

// inicializácia webpush len ak máme kľúče
if (PUB && PRIV) {
  webpush.setVapidDetails(MAIL, PUB, PRIV);
} else {
  console.warn('[push] VAPID keys not set (no env and no hardcoded keys).');
}

// --- public key pre klienta --------------------------------------------------
router.get('/public-key', (_req, res) => {
  if (!PUB) return res.status(503).json({ message: 'VAPID keys not set' });
  res.json({ publicKey: PUB });
});

// alias kvôli starším klientom (vracia { key })
router.get('/vapid-public-key', (_req, res) => {
  if (!PUB) return res.status(503).json({ message: 'VAPID keys not set' });
  res.json({ key: PUB });
});

// --- uloženie/aktualizácia subscription -------------------------------------
router.post('/subscribe', async (req, res) => {
  try {
    const { email, subscription } = req.body || {};
    if (!subscription?.endpoint) {
      return res.status(400).json({ message: 'Invalid subscription' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { email: email || null, endpoint: subscription.endpoint, sub: subscription },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('push/subscribe', e);
    res.status(500).json({ message: 'Subscribe failed' });
  }
});

// --- odhlásenie --------------------------------------------------------------
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ message: 'Missing endpoint' });
    await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Unsubscribe failed' });
  }
});

// --- hromadné notify pre daného adresáta ------------------------------------
router.post('/notify', async (req, res) => {
  if (!PUB || !PRIV) return res.status(503).json({ message: 'VAPID keys not set' });

  try {
    const { toEmail, title, body, url } = req.body || {};
    if (!toEmail) return res.status(400).json({ message: 'toEmail required' });

    const subs = await PushSubscription.find({ email: toEmail }).lean();
    const payload = JSON.stringify({
      title: title || 'Nová správa',
      body: body || '',
      url: url || `/messages.html?email=${encodeURIComponent(toEmail)}`
    });

    let sent = 0, tried = 0;
    await Promise.all(subs.map(async (s) => {
      tried++;
      try {
        await webpush.sendNotification(s.sub, payload);
        sent++;
      } catch (err) {
        // 410/404 = expirovaný endpoint -> odstrániť
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await PushSubscription.deleteOne({ endpoint: s.endpoint });
        } else {
          console.warn('webpush error', err?.statusCode || err?.message);
        }
      }
    }));
    res.json({ tried, sent });
  } catch (e) {
    console.error('push/notify', e);
    res.status(500).json({ message: 'Notify failed' });
  }
});

module.exports = router;
