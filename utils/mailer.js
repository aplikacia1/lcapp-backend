// utils/mailer.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST = '',
  SMTP_PORT = '587',
  SMTP_USER = '',
  SMTP_PASS = '',
  SMTP_SECURE = 'false',
  ADMIN_EMAIL = '',
  APP_NAME = 'Lištové centrum',
  APP_URL = 'https://listovecentrum.sk',
} = process.env;

// jeden zdieľaný transporter (pool)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: String(SMTP_SECURE).toLowerCase() === 'true', // len pri 465
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  pool: true,
  // keď je potrebné (firemné CA), môžeš povoliť nižšie:
//  tls: { rejectUnauthorized: false },
});

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('sendMail: chýba "to"');
  const fromPretty = `${APP_NAME} <${ADMIN_EMAIL || SMTP_USER}>`;

  return transporter.sendMail({
    from: fromPretty,
    to,
    subject,
    text: text || html?.replace(/<[^>]+>/g, ' '),
    html,
  });
}

// Pekná šablóna uvítacieho e-mailu
function welcomeEmailTemplate(toEmail) {
  const brand = APP_NAME || 'Lištové centrum';
  const url = APP_URL || '#';

  const subject = `Vitajte v ${brand}! 🛠️`;
  const html = `
  <div style="font-family:Arial, sans-serif; line-height:1.6; color:#0c1f4b;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8eefc;border-radius:12px;overflow:hidden">
      <div style="padding:18px 22px;background:#0c1f4b;color:#fff">
        <h1 style="margin:0;font-size:20px">${brand}</h1>
      </div>
      <div style="padding:22px">
        <p style="margin-top:0">Dobrý deň,</p>
        <p>
          ďakujeme za registráciu v aplikácii <strong>${brand}</strong>.
          Aplikácia je miesto pre majstrov a zákazníkov – nájdete tu:
        </p>
        <ul style="margin:12px 0 16px">
          <li>hodnotenia a skúsenosti k tovaru,</li>
          <li>Lištobook – časová os na zdieľanie fotiek a výsledkov práce,</li>
          <li>súkromné správy s naším tímom aj medzi používateľmi.</li>
        </ul>
        <p>
          O váš účet sa staráme zodpovedne: <strong>uchovávame iba váš e-mail a
          hash hesla</strong>. Iné osobné údaje od vás nežiadame. Občas môžete
          dostať novinky z ${brand} – z odberu sa dá kedykoľvek odhlásiť.
        </p>

        <div style="margin:20px 0">
          <a href="${url}" style="display:inline-block;background:#ffe37a;color:#493a00;font-weight:700;
              text-decoration:none;padding:10px 16px;border-radius:10px;border:1px solid #ffd34d">
            Otvoriť aplikáciu
          </a>
        </div>

        <p style="margin-bottom:0">
          Prajeme pohodlné používanie,<br>
          tím <strong>${brand}</strong>
        </p>
      </div>
      <div style="padding:12px 22px;background:#f7fbff;color:#40527a;font-size:12px;border-top:1px solid #e8eefc">
        Tento e-mail bol odoslaný na adresu <strong>${toEmail}</strong>. Ak ste sa neregistrovali vy,
        prosím ignorujte správu.
      </div>
    </div>
  </div>`;

  return { subject, html };
}

async function sendWelcomeEmail(toEmail) {
  const { subject, html } = welcomeEmailTemplate(toEmail);
  try {
    const info = await sendMail({ to: toEmail, subject, html });
    console.log('✅ Welcome e-mail odoslaný:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Welcome e-mail zlyhal:', err?.message || err);
    throw err;
  }
}

// voliteľné: rýchla diagnostika transportu (spusti sa manuálne)
async function verifyTransport() {
  try {
    await transporter.verify();
    console.log('✅ SMTP transport OK – pripojenie a prihlasovanie funguje.');
  } catch (e) {
    console.error('❌ SMTP verify zlyhal:', e?.message || e);
  }
}

module.exports = {
  sendWelcomeEmail,
  verifyTransport,
  sendMail,
};
