// routes/pdfTestRoutes.js
const express = require('express');

const { sendPdfEmail } = require('../utils/mailer');
const { buildTestPdfBuffer } = require('../utils/pdf/testPdfBuffer');
const { buildBalconyBridgePdfBuffer } = require('../utils/pdf/balconyBridgePdfBuffer');
const { buildBalconyFinalPdfBuffer } = require('../utils/pdf/balconyFinalPdfBuffer');

const router = express.Router();
const IS_PROD = process.env.NODE_ENV === 'production';

function getBaseOrigin(req) {
  return `${req.protocol}://${req.get('host')}`;
}

async function forwardJson(req, res, targetPath) {
  const url = `${getBaseOrigin(req)}${targetPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 120s

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
      signal: controller.signal,
    });

    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    const txt = await r.text();
    return res.status(r.status).send(txt);
  } catch (e) {
    const msg =
      e?.name === 'AbortError'
        ? 'Forward timeout – generovanie/odoslanie trvalo príliš dlho.'
        : (e?.message || String(e));

    console.error('[pdfTestRoutes] forward error:', msg);
    return res.status(500).json({ ok: false, message: msg });
  } finally {
    clearTimeout(timeout);
  }
}

// ping
router.get('/ping', (_req, res) => {
  res.json({ ok: true, route: 'pdfTestRoutes', ts: new Date().toISOString() });
});

/**
 * TEST MAIL (nechávame kvôli kompatibilite)
 */
router.post('/test-mail', async (req, res) => {
  try {
    if (IS_PROD) {
      const key = String(req.headers['x-admin-key'] || '').trim();
      const need = String(process.env.PDF_TEST_KEY || '').trim();
      if (!need) return res.status(503).json({ message: 'Chýba PDF_TEST_KEY v env (produkcia).' });
      if (!key || key !== need) return res.status(403).json({ message: 'Forbidden' });
    }

    const to = String(req.body?.email || '').trim();
    if (!to) return res.status(400).json({ message: 'Chýba email.' });

    const pdfBuffer = await buildTestPdfBuffer();

    await sendPdfEmail({
      to,
      subject: 'Lištobook – test PDF príloha',
      html: '<p>V prílohe je testovací PDF súbor.</p>',
      pdfBuffer,
      filename: 'listobook-test.pdf',
    });

    return res.json({ ok: true, message: `PDF odoslané na ${to}` });
  } catch (e) {
    console.error('POST /api/pdf/test-mail error', e);
    return res.status(500).json({ ok: false, message: e?.message || 'Chyba servera.' });
  }
});

/**
 * Bridge download
 */
router.post('/balkon-bridge', async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, message: 'Chýba payload.' });
    }

    const pdfBuffer = await buildBalconyBridgePdfBuffer(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="balkon-bridge.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error('POST /api/pdf/balkon-bridge error', e);
    return res.status(500).json({ ok: false, message: e?.message || 'Chyba servera.' });
  }
});

/**
 * Bridge mail (ponechávame)
 */
router.post('/balkon-bridge-mail', async (req, res) => {
  // ak chceš aj bridge mail riešiť HTML routou neskôr, spravíme potom
  return forwardJson(req, res, '/api/pdf/balkon-bridge-mail');
});

/**
 * Final download (buffer) – ponechávame kvôli kompatibilite
 */
router.post('/balkon-final', async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, message: 'Chýba payload.' });
    }

    const pdfBuffer = await buildBalconyFinalPdfBuffer(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="balkon-final.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error('POST /api/pdf/balkon-final error', e);
    return res.status(500).json({ ok: false, message: e?.message || 'Chyba servera.' });
  }
});

/**
 * ✅ KĽÚČOVÉ:
 * /api/pdf/balkon-final-mail -> presmeruj na HTML SEND endpoint
 * aby sa poslal “normálny” PDF + text + tech listy.
 */
router.post('/balkon-final-mail', async (req, res) => {
  return forwardJson(req, res, '/api/pdf/balkon-final-html-send');
});

module.exports = router;
