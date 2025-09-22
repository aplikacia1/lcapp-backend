// scripts/test-smtp.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sendWelcomeEmail } = require('../utils/mailer');

(async () => {
  try {
    const user = process.env.SMTP_USER || '';
    const passLen = (process.env.SMTP_PASS || '').length;
    console.log('ENV check -> SMTP_USER:', user || '(empty)', 'SMTP_PASS len:', passLen);

    if (!user || !passLen) throw new Error('Chýba SMTP_USER alebo SMTP_PASS (pozri .env)');

    const to = process.argv[2] || 'tvoja.adresa@gmail.com';
    await sendWelcomeEmail(to);
    console.log('✅ Odoslané na', to);
    process.exit(0);
  } catch (e) {
    console.error('❌ Zlyhalo:', e?.message || e);
    process.exit(1);
  }
})();
