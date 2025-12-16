// routes/pdfTestRoutes.js
const express = require('express');
const { sendPdfEmail } = require('../utils/mailer');
const { buildTestPdfBuffer } = require('../utils/pdf/testPdfBuffer');

// ✅ bridge PDF pre balkóny
const { buildBalconyBridgePdfBuffer } = require('../utils/pdf/balconyBridgePdfBuffer');

// ✅ FINAL PDF pre balkóny (diakritika + plán strán)
const { buildBalconyFinalPdfBuffer } = require('../utils/pdf/balconyFinalPdfBuffer');

const router = express.Router();

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * POST /api/pdf/test-mail
 * Body: { "email": "niekto@email.sk" }
 *
 * Bezpečnosť:
 * - v produkcii vyžaduje header x-admin-key = PDF_TEST_KEY
 * - lokálne ide bez kľúča
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
 * POST /api/pdf/balkon-bridge
 * Body: { payload: {...} }
 * Vráti PDF ako download.
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
 * POST /api/pdf/balkon-bridge-mail
 * Body: { payload: {...} }
 *
 * Bezpečnosť:
 * - to = VŽDY payload.meta.email
 */
router.post('/balkon-bridge-mail', async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, message: 'Chýba payload.' });
    }

    const to = String(payload?.meta?.email || '').trim();
    if (!to) {
      return res.status(400).json({ ok: false, message: 'Chýba meta.email v payloade (email z URL).' });
    }

    const pdfBuffer = await buildBalconyBridgePdfBuffer(payload);

    await sendPdfEmail({
      to,
      subject: 'Lištové centrum – balkón (bridge PDF)',
      html: '<p>V prílohe je technický (bridge) PDF podklad z kalkulačky balkónov.</p>',
      pdfBuffer,
      filename: 'balkon-bridge.pdf',
    });

    return res.json({ ok: true, message: `PDF odoslané na ${to}` });
  } catch (e) {
    console.error('POST /api/pdf/balkon-bridge-mail error', e);
    return res.status(500).json({ ok: false, message: e?.message || 'Chyba servera.' });
  }
});

/* =========================
   ✅ FINAL ENDPOINTY
   ========================= */

/**
 * POST /api/pdf/balkon-final
 * Body: { payload: {...} }
 * Vráti FINAL PDF ako download.
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
 * POST /api/pdf/balkon-final-mail
 * Body: { payload: {...} }
 *
 * Bezpečnosť:
 * - to = VŽDY payload.meta.email
 */
router.post('/balkon-final-mail', async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, message: 'Chýba payload.' });
    }

    const to = String(payload?.meta?.email || '').trim();
    if (!to) {
      return res.status(400).json({ ok: false, message: 'Chýba meta.email v payloade (email z URL).' });
    }

    const pdfBuffer = await buildBalconyFinalPdfBuffer(payload);

    await sendPdfEmail({
      to,
      subject: 'Lištové centrum – balkón (FINAL PDF)',
      html: '<p>V prílohe je finálny PDF podklad z kalkulačky balkónov.</p>',
      pdfBuffer,
      filename: 'balkon-final.pdf',
    });

    return res.json({ ok: true, message: `PDF odoslané na ${to}` });
  } catch (e) {
    console.error('POST /api/pdf/balkon-final-mail error', e);
    return res.status(500).json({ ok: false, message: e?.message || 'Chyba servera.' });
  }
});

module.exports = router;
