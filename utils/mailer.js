// utils/mailer.js
// Kompletný, samostatný súbor pripravený na Websupport SMTP (smtp.m1.websupport.sk).
// Môžeš použiť bez .env (fallbacky nižšie), alebo si pridaj premenné do .env.

const nodemailer = require('nodemailer');

/* ===== KONFIGURÁCIA (bezpečné defaulty, .env prepíše) ===== */
const {
  SMTP_HOST = 'smtp.m1.websupport.sk',
  SMTP_PORT = '465',                          // SSL port
  SMTP_SECURE = 'true',                       // pri 465 = true
  SMTP_USER = 'no-reply@listobook.sk',
  SMTP_PASS = 'benadiCka22&',                             // >>> DOPLŇ HESLO, ak nepoužívaš .env <<<
  ADMIN_EMAIL = 'no-reply@listobook.sk',      // zobrazí sa ako from
  APP_NAME = 'Lištobook',
  APP_URL = 'https://listobook.sk',
} = process.env;

/* ===== TRANSPORT ===== */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: String(SMTP_SECURE).toLowerCase() === 'true',
  auth: (SMTP_USER && (SMTP_PASS || process.env.SMTP_PASS))
    ? { user: SMTP_USER, pass: SMTP_PASS || process.env.SMTP_PASS }
    : undefined,
  pool: true,
});

/* Voliteľná diagnostika – spusti raz pri štarte ak chceš logy.
(async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP OK:', SMTP_HOST);
  } catch (e) {
    console.warn('❌ SMTP verify failed:', e?.message || e);
  }
})();
*/

/* ===== HELPER: odoslanie ===== */
async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('sendMail: chýba "to"');

  const fromPretty = `${APP_NAME} <${ADMIN_EMAIL || SMTP_USER}>`;

  return transporter.sendMail({
    from: fromPretty,
    to,
    subject,
    text: text || (html ? stripHtml(html) : ''),
    html,
  });
}

/* ===== UVÍTACÍ EMAIL ===== */
/** Texty ponechávam ako v tvojej verzii; rád upravím, ak chceš iné znenie. */
function welcomeEmailTemplate(toEmail, nick = '') {
  const brand = APP_NAME || 'Lištobook';
  const url = APP_URL || '#';

  const subject = `Vitajte v ${brand}! 🛠️`;
  const html = `
  <div style="font-family:Arial, sans-serif; line-height:1.6; color:#0c1f4b;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8eefc;border-radius:12px;overflow:hidden">
      <div style="padding:18px 22px;background:#0c1f4b;color:#fff">
        <h1 style="margin:0;font-size:20px">${escapeHtml(brand)}</h1>
      </div>
      <div style="padding:22px">
        <p style="margin-top:0">Dobrý deň${nick ? ', ' + escapeHtml(nick) : ''},</p>
        <p>
          ďakujeme za registráciu v aplikácii <strong>${escapeHtml(brand)}</strong>.
          Aplikácia je miesto pre majstrov a zákazníkov – nájdete tu:
        </p>
        <ul style="margin:12px 0 16px">
          <li>hodnotenia a skúsenosti k tovaru,</li>
          <li>Lištobook – časová os na zdieľanie fotiek a výsledkov práce,</li>
          <li>súkromné správy s naším tímom aj medzi používateľmi.</li>
        </ul>
        <p>
          O váš účet sa staráme zodpovedne: <strong>uchovávame iba váš e-mail a hash hesla</strong>.
          Občas môžete dostať novinky z ${escapeHtml(brand)} – z odberu sa dá kedykoľvek odhlásiť.
        </p>

        <div style="margin:20px 0">
          <a href="${escapeAttr(url)}" style="display:inline-block;background:#ffe37a;color:#493a00;font-weight:700;
              text-decoration:none;padding:10px 16px;border-radius:10px;border:1px solid #ffd34d">
            Otvoriť aplikáciu
          </a>
        </div>

        <p style="margin-bottom:0">
          Prajeme pohodlné používanie,<br>
          tím <strong>${escapeHtml(brand)}</strong>
        </p>
      </div>
      <div style="padding:12px 22px;background:#f7fbff;color:#40527a;font-size:12px;border-top:1px solid #e8eefc">
        Tento e-mail bol odoslaný na adresu <strong>${escapeHtml(toEmail)}</strong>.
        Neodpovedajte prosím na túto správu (no-reply).
      </div>
    </div>
  </div>`;
  return { subject, html };
}

async function sendWelcomeEmail(toEmail, nick = '') {
  const { subject, html } = welcomeEmailTemplate(toEmail, nick);
  return sendMail({ to: toEmail, subject, html });
}

/* ===== POMOCNÉ FUNKCIE ===== */
function stripHtml(s = '') {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/* ===== EXPORTY ===== */
module.exports = {
  sendMail,
  sendWelcomeEmail,
  // ak chceš, môžeš si exportnúť aj welcomeEmailTemplate/stripHtml
};
