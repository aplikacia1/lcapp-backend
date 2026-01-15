// utils/mailer.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const {
  SMTP_HOST = 'smtp.m1.websupport.sk',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER,
  SMTP_PASS,
  APP_NAME = 'Lištobook',
  APP_URL = 'https://listobook.sk',
  EMAIL_DEBUG = 'false',
  SMTP_AUTH_METHOD = '', // voliteľné: LOGIN alebo PLAIN
  ADMIN_EMAIL = '', // kam pôjde ponuka (interný mail)
} = process.env;

// --- očistenie a defaulty ---
const host = String(SMTP_HOST || '').trim();
const port = Number(String(SMTP_PORT || '').trim()) || 587;
const secure =
  port === 465 ? true : String(SMTP_SECURE || 'false').trim().toLowerCase() === 'true';
const user = String(SMTP_USER || '').trim();
const pass = String(SMTP_PASS || '').trim();
const debug = String(EMAIL_DEBUG || 'false').trim().toLowerCase() === 'true';
const authMethod = String(SMTP_AUTH_METHOD || '').trim().toUpperCase() || null;

if (!user || !pass) {
  console.error('❌ SMTP_USER alebo SMTP_PASS chýba.');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  ...(authMethod ? { authMethod } : {}),
  tls: { minVersion: 'TLSv1.2' },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  pool: false,
  logger: debug,
  debug,
});

let _verified = false;
async function verifyOnce() {
  if (_verified) return;
  await transporter.verify();
  _verified = true;
  console.log(
    `✅ SMTP ready as ${user} @ ${host}:${port} (secure=${secure}${authMethod ? `, auth=${authMethod}` : ''})`
  );
}

function stripHtml(s = '') {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}
function escapeAttr(s = '') { return escapeHtml(s).replace(/"/g, '&quot;'); }

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * ✅ Normalizácia PDF na Buffer (fix na “zlá príloha”):
 * - Buffer -> ok
 * - Uint8Array -> Buffer.from()
 * - JSON Buffer {type:"Buffer",data:[...]} -> Buffer.from(data)
 */
function normalizeToBuffer(input) {
  if (!input) return null;
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === 'object' && input.type === 'Buffer' && Array.isArray(input.data)) {
    return Buffer.from(input.data);
  }
  return null;
}

/**
 * sendMail – základný odosielač
 */
async function sendMail({ to, subject, html, text, attachments, cc, bcc, replyTo }) {
  if (!to) throw new Error('sendMail: "to" je povinné');
  await verifyOnce();
  const fromPretty = `${APP_NAME} <${user}>`; // musí = SMTP_USER kvôli SPF/DMARC

  const info = await transporter.sendMail({
    from: fromPretty,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    text: text || (html ? stripHtml(html) : ''),
    html,
    attachments: Array.isArray(attachments) ? attachments : undefined,
  });

  console.log('✉️ Message sent:', info.messageId, 'to', to);
  return info;
}

/* ===================== ŠABLÓNY (WELCOME) ===================== */

function signupTemplate() {
  const app = String(APP_URL || '').replace(/\/+$/, '');
  const logoUrl = `${app}/icons/icon-512.png`;

  const subject   = `Vitaj v ${APP_NAME}!`;
  const preheader = 'Po prihlásení si zvoľ prezývku a máš hotovo.';

  const html = `
  <div style="background:#0c1f4b;padding:24px 0;">
    <div style="max-width:560px;margin:0 auto;background:#0b1a3a;border-radius:16px;overflow:hidden;border:1px solid #16336b;font-family:Arial,sans-serif;">
      <span style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</span>
      <div style="text-align:center;padding:24px 24px 8px;background:#0c1f4b;">
        <img src="${escapeAttr(logoUrl)}" alt="Lištové centrum" width="96" height="96" style="display:block;margin:0 auto 12px;border-radius:12px" />
        <h1 style="margin:0;color:#ffffff;font-size:22px;line-height:1.35">${escapeHtml(APP_NAME)}</h1>
      </div>
      <div style="padding:16px 24px;background:#0c1f4b;color:#cfe2ff;line-height:1.55">
        <p style="margin:0 0 12px">Vitaj v <strong>Lištobooku</strong> 👋</p>
        <p style="margin:0 0 12px">
          Lištobook je <strong>komunitná mini-sieť</strong> pre majstrov a kutilov z Lištového centra.
          Zdieľaj fotky svojej práce, pýtaj sa na rady, <strong>hodnoť materiály a výrobky</strong> a píš krátke recenzie.
        </p>
        <p style="margin:16px 0 8px;"><strong>Po prihlásení odporúčame:</strong></p>
        <ol style="margin:0 0 16px;padding-left:18px">
          <li>V časti <strong>Lištový dashboard</strong> si zvoľ <strong>prezývku</strong> a doplň mesto.</li>
          <li>V hornej lište nájdeš sekcie:
            <strong>„Lištobook“</strong> (časová os),
            <strong>„⭐ Hodnotenie tovarov ⭐“</strong> (katalóg na recenzie)
            a <strong>„Voľný čas“</strong> (videá a oddych).</li>
          <li>Keď máš prezývku, môžeš pridávať príspevky, komentovať a hodnotiť tovary.</li>
        </ol>
        <p style="margin:16px 0 0;font-size:13px;color:#9ab6e8">
          <strong>Kontakt na Lištové centrum:</strong>
          <a href="mailto:bratislava@listovecentrum.sk" style="color:#9ab6e8;text-decoration:underline">
            bratislava@listovecentrum.sk
          </a>
          •
          <a href="tel:+421947922181" style="color:#9ab6e8;text-decoration:underline">
            0947&nbsp;922&nbsp;181
          </a>
        </p>
      </div>
      <div style="padding:12px 16px;background:#081433;color:#8aa4d6;font-size:12px;text-align:center;border-top:1px solid #16336b">
        Odoslané z ${escapeHtml(user)} (no-reply). Neodpovedajte.<br/>
        Lištobook.sk by LIŠTOVÉ CENTRUM EU, s.r.o. ©
      </div>
    </div>
  </div>`;
  return { subject, html };
}

/* ===================== BALKÓN – TECH LISTY ===================== */

/**
 * Načíta technické listy z: public/img/pdf/balkon/tech/
 */
function loadTechSheetAttachmentsForVariant({ heightId, drainId }) {
  // zatiaľ iba: LOW + EDGE_FREE
  const h = String(heightId || '').toLowerCase();
  const d = String(drainId || '').toLowerCase();

  const isLow = h === 'low';
  const isEdgeFree = d === 'edge-free';

  if (!(isLow && isEdgeFree)) return [];

  // ✅ tvoja reálna cesta podľa screenu:
  const baseDir = path.join(process.cwd(), 'public', 'img', 'pdf', 'balkon', 'tech');

  const files = [
    { filename: 'technicky-list-schluter-ditra.pdf',   local: 'schluter-ditra.pdf' },
    { filename: 'technicky-list-schluter-bara-rt.pdf', local: 'schluter-bara-rt.pdf' },
    { filename: 'technicky-list-schluter-bara-rw.pdf', local: 'schluter-bara-rw.pdf' },
    { filename: 'technicky-list-mapei-lepidlo.pdf',    local: 'mapei-lepidlo.pdf' },
    { filename: 'technicky-list-sopro-lepidlo.pdf',    local: 'sopro-lepidlo.pdf' },
  ];

  const out = [];
  for (const f of files) {
    const p = path.join(baseDir, f.local);
    if (!fs.existsSync(p)) {
      console.warn('⚠️ Chýba technický list:', p);
      continue;
    }
    out.push({
      filename: f.filename,
      content: fs.readFileSync(p),
      contentType: 'application/pdf',
    });
  }
  return out;
}

/**
 * sendBalconyDocsEmail
 * - pošle zákazníkovi PDF + technické listy (podľa variantu)
 */
async function sendBalconyDocsEmail({
  to,
  subject,
  html,
  text,
  pdfBuffer,
  pdfFilename = 'balkon-final.pdf',
  variant, // { heightId, drainId }
}) {
  if (!isValidEmail(to)) throw new Error('sendBalconyDocsEmail: neplatný e-mail');

  const pdf = normalizeToBuffer(pdfBuffer);
  if (!pdf || pdf.length < 1000) throw new Error('sendBalconyDocsEmail: PDF buffer je neplatný/príliš malý');

  const tech = loadTechSheetAttachmentsForVariant(variant || {});
  const attachments = [
    { filename: pdfFilename, content: pdf, contentType: 'application/pdf' },
    ...tech,
  ];

  return sendMail({
    to,
    subject: subject || `${APP_NAME} – technické podklady k balkónu`,
    html,
    text,
    attachments,
  });
}

/**
 * sendBalconyOfferCustomerEmail
 * - zákazníkovi príde potvrdzovací mail + rovnaké prílohy ako “Poslať PDF”
 */
async function sendBalconyOfferCustomerEmail(args) {
  return sendBalconyDocsEmail(args);
}

/**
 * sendBalconyOfferAdminEmail
 * - ADMIN_EMAIL dostane iba 1 prílohu: PDF + text požiadavky
 */
async function sendBalconyOfferAdminEmail({
  subject,
  html,
  text,
  pdfBuffer,
  pdfFilename = 'balkon-final.pdf',
}) {
  if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL nie je nastavený v env (Render)');

  const pdf = normalizeToBuffer(pdfBuffer);
  if (!pdf || pdf.length < 1000) throw new Error('sendBalconyOfferAdminEmail: PDF buffer je neplatný/príliš malý');

  return sendMail({
    to: ADMIN_EMAIL,
    subject: subject || `${APP_NAME} – NOVÁ žiadosť o cenovú ponuku (balkón)`,
    html,
    text,
    attachments: [{ filename: pdfFilename, content: pdf, contentType: 'application/pdf' }],
  });
}

/* ===================== VEREJNÉ API (WELCOME) ===================== */

async function sendSignupEmail(toEmail) {
  const { subject, html } = signupTemplate();
  return sendMail({ to: toEmail, subject, html });
}

// alias kvôli kompatibilite so starými volaniami
async function sendWelcomeEmail(toEmail) {
  return sendSignupEmail(toEmail);
}

module.exports = {
  sendMail,
  sendSignupEmail,
  sendWelcomeEmail,

  // balkón – nové API
  sendBalconyDocsEmail,
  sendBalconyOfferCustomerEmail,
  sendBalconyOfferAdminEmail,
};
