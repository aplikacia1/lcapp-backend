const express = require('express');
const router = express.Router();
const { ensureConnection } = require('../utils/mailer');

function codes(s) { return [...String(s)].map(ch => ch.charCodeAt(0)); }

router.get('/debug', async (_req, res) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER } = process.env;
  const user = String(SMTP_USER || '').trim();

  try {
    await ensureConnection();
    return res.json({
      ok: true,
      env: {
        host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE,
        user, userLen: user.length, userCodes: codes(user),
      },
      note: 'verify OK',
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
      env: {
        host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE,
        user, userLen: user.length, userCodes: codes(user),
      },
    });
  }
});

module.exports = router;
