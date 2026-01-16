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
  SMTP_AUTH_METHOD = '',
  ADMIN_EMAIL = '',
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

if (!user || !pass) console.error('❌ SMTP_USER alebo SMTP_PASS chýba.');

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
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(s = '') { return escapeHtml(s).replace(/"/g, '&quot;'); }

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * ✅ Normalizácia PDF na Buffer (fix na “zlá príloha”)
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

  const info = await transporter.sendMail({
    from: `${APP_NAME} <${user}>`,
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

/**
 * ✅ BACKWARD COMPAT: sendPdfEmail (aby staré routy nezlyhali)
 */
async function sendPdfEmail({ to, subject, html, text, pdfBuffer, filename = 'kalkulacia.pdf', cc, bcc }) {
  if (!to) throw new Error('sendPdfEmail: "to" je povinné');
  const pdf = normalizeToBuffer(pdfBuffer);
  if (!pdf || pdf.length < 1000) throw new Error('sendPdfEmail: PDF buffer je neplatný/príliš malý');

  return sendMail({
    to,
    cc,
    bcc,
    subject: subject || `${APP_NAME} – PDF`,
    html,
    text,
    attachments: [{
      filename,
      content: pdf,
      contentType: 'application/pdf',
    }],
  });
}

/* ===================== ŠABLÓNY (WELCOME) ===================== */

function signupTemplate() {
  const app = String(APP_URL || '').replace(/\/+$/, '');
  const logoUrl = `${app}/icons/icon-512.png`;
  const subject = `Vitaj v ${APP_NAME}!`;
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

async function sendSignupEmail(toEmail) {
  const { subject, html } = signupTemplate();
  return sendMail({ to: toEmail, subject, html });
}
async function sendWelcomeEmail(toEmail) {
  return sendSignupEmail(toEmail);
}

/* ===================== BALKÓN – E-MAIL (PROFI / TECH) ===================== */

function balconyDocsTemplate({
  customerName = 'Zákazník',
  customerEmail = '',
  pdfFilename = 'balkon-final.pdf',
} = {}) {
  const app = String(APP_URL || '').replace(/\/+$/, '');
  const logoUrl = `${app}/icons/icon-512.png`;

  // prekliky (s email parametrom – ak ho máme)
  const q = customerEmail ? `?email=${encodeURIComponent(customerEmail)}` : '';
  const linkOnboarding = `${app}/onboarding.html${q}`;
  const linkDashboard  = `${app}/dashboard.html${q}`;   // prezývka / účet
  const linkCatalog    = `${app}/catalog.html${q}`;     // hodnotenia
  const linkTimeline   = `${app}/timeline.html${q}`;    // lištobook
  const linkMessages   = `${app}/messages.html${q}`;    // správy

  const subject = `${APP_NAME} – Vaša kalkulácia (PDF)`;

  // "toxicko-profesionálny, až mechanický" = vecný, presný, technický tón
  const preheader = `Automatické doručenie PDF a technických listov – ${pdfFilename}`;

  const html = `
  <div style="background:#0a1029;padding:26px 0;">
    <div style="max-width:640px;margin:0 auto;padding:0 14px;">
      <div style="background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.14);border-radius:18px;overflow:hidden;font-family:Arial,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.45);">
        <span style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(preheader)}</span>

        <!-- Header -->
        <div style="background:
          radial-gradient(900px 640px at 6% -10%, #13255d 0%, transparent 60%),
          radial-gradient(760px 560px at 100% 0%, #0d1e4a 0%, transparent 60%),
          #0a1029;
          padding:22px 18px 16px;
          text-align:center;">
          <img src="${escapeAttr(logoUrl)}" alt="Lištové centrum" width="76" height="76" style="display:block;margin:0 auto 10px;border-radius:14px" />
          <div style="color:#ecf2ff;font-size:20px;font-weight:800;letter-spacing:.2px;margin:0">Lištobook</div>
          <div style="color:#a8b3d6;font-size:13px;margin-top:6px">Automatický technický výstup • PDF + technické listy</div>
        </div>

        <!-- Body -->
        <div style="padding:18px;background:#0a1029;color:#ecf2ff;line-height:1.55">

          <!-- Card 1 -->
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 16px 14px;margin-bottom:12px;">
            <div style="color:#a8b3d6;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Doručenie dokumentov</div>

            <div style="font-size:14.5px;margin:0 0 10px">
              Ďakujeme za využitie našich služieb.
            </div>

            <div style="font-size:14.5px;margin:0 0 10px">
              Dobrý deň <strong>${escapeHtml(customerName)}</strong>,
              systém <strong>Lištobook</strong> automaticky vygeneroval technický podklad k Vášmu zadaniu.
            </div>

            <div style="font-size:14.5px;margin:0 0 10px">
              V prílohe nájdete:
              <ul style="margin:10px 0 0 18px;padding:0;color:#cfe2ff">
                <li><strong>PDF dokument</strong> (${escapeHtml(pdfFilename)})</li>
                <li><strong>Technické listy</strong> k odporúčaným materiálom a systémom</li>
              </ul>
            </div>
          </div>

          <!-- Card 2 -->
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 16px 14px;margin-bottom:12px;">
            <div style="color:#a8b3d6;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Ak chcete nacenenie</div>

            <div style="font-size:14.5px;margin:0 0 10px;color:#cfe2ff">
              Lištobook Vám to vypočítal. <strong>Tím Lištového centra</strong> nacení skladbu na základe týchto podkladov – ak máte záujem.
            </div>

            <div style="font-size:14.5px;margin:0 0 10px;color:#cfe2ff">
              Postup je jednoduchý:
              <ol style="margin:10px 0 0 18px;padding:0;color:#cfe2ff">
                <li>Odpovedzte na tento e-mail</li>
                <li>Nechajte priložené PDF (${escapeHtml(pdfFilename)})</li>
                <li>Prípadne dopíšte doplňujúce informácie (fotky, poznámky, termín)</li>
              </ol>
            </div>

            <div style="margin-top:12px;font-size:13px;color:#a8b3d6">
              Kontakt:
              <a href="mailto:bratislava@listovecentrum.sk" style="color:#7cd2ff;text-decoration:underline">bratislava@listovecentrum.sk</a>
              •
              <a href="tel:+421947922181" style="color:#7cd2ff;text-decoration:underline">0947&nbsp;922&nbsp;181</a>
            </div>
          </div>

          <!-- Card 3 -->
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 16px 14px;margin-bottom:12px;">
            <div style="color:#a8b3d6;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Čo je Lištobook</div>

            <div style="font-size:14.5px;margin:0 0 10px;color:#cfe2ff">
              Lištobook je komunitná <strong>mikrosieť</strong> a sada nástrojov pre majstrov a kutilov.
            </div>

            <div style="font-size:14.5px;margin:0 0 10px;color:#cfe2ff">
              Obsahuje:
              <ul style="margin:10px 0 0 18px;padding:0;color:#cfe2ff">
                <li>časovú os (Lištobook) – fotky a príspevky z praxe</li>
                <li>hodnotenie tovarov – recenzie + prekliky na e-shop</li>
                <li>kalkulačky – technický podklad k skladbám</li>
                <li>súkromné správy – rýchla komunikácia</li>
              </ul>
            </div>

            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);margin:12px 0;"></div>

            <div style="font-size:13.5px;color:#a8b3d6;margin:0 0 10px">
              Prístupové pravidlá:
              <ul style="margin:8px 0 0 18px;padding:0;color:#a8b3d6">
                <li><strong>neregistrovaní</strong>: môžu čítať recenzie, preklikať sa do e-shopu a používať kalkulačky</li>
                <li><strong>registrovaní</strong>: môžu pridávať príspevky, hodnotiť a písať správy (po nastavení prezývky)</li>
              </ul>
            </div>

            <!-- CTA buttons (email-safe) -->
            <div style="margin-top:12px;">
              <div style="display:block;margin-bottom:10px;">
                <a href="${escapeAttr(linkDashboard)}"
                   style="display:inline-block;background:linear-gradient(135deg,#4da3ff,#7cd2ff);color:#0a1029;text-decoration:none;font-weight:800;padding:12px 16px;border-radius:14px;">
                  Nastaviť prezývku
                </a>
              </div>

              <div style="display:block;margin-bottom:10px;">
                <a href="${escapeAttr(linkCatalog)}"
                   style="display:inline-block;background:linear-gradient(135deg,#22c55e,#86efac);color:#06220e;text-decoration:none;font-weight:800;padding:12px 16px;border-radius:14px;">
                  Hodnotiť produkty
                </a>
              </div>

              <div style="display:block;margin-bottom:10px;">
                <a href="${escapeAttr(linkTimeline)}"
                   style="display:inline-block;background:#1a2b59;color:#ecf2ff;text-decoration:none;font-weight:800;padding:12px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.16);">
                  Otvoriť Lištobook
                </a>
                <span style="display:inline-block;width:8px;"></span>
                <a href="${escapeAttr(linkMessages)}"
                   style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#fde68a);color:#3d2a05;text-decoration:none;font-weight:800;padding:12px 16px;border-radius:14px;">
                  Otvoriť správy
                </a>
              </div>

              <div style="font-size:12.5px;color:#a8b3d6;margin-top:6px;">
                Tip: ak sa v linkoch otvorí onboarding, tu je prehľad:
                <a href="${escapeAttr(linkOnboarding)}" style="color:#7cd2ff;text-decoration:underline">Vitajte v Lištobooku</a>
              </div>
            </div>
          </div>

          <!-- Card 4 -->
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 16px 14px;">
            <div style="color:#a8b3d6;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Kde nás nájdete</div>

            <div style="font-size:14.5px;margin:0 0 10px;color:#cfe2ff">
              Ešte raz ďakujeme a tešíme sa na Vašu skorú návštevu:
            </div>

            <div style="font-size:14.5px;margin:0;color:#cfe2ff">
              <strong>Bratislava</strong> • Svornosti 43<br/>
              <strong>Žilina</strong> • Sasinkova 13
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding:14px 16px;background:#081433;color:#8aa4d6;font-size:12px;text-align:center;border-top:1px solid rgba(255,255,255,.12)">
          Automatická správa z <strong>no-reply@listobook.sk</strong> • Neodpovedajte na túto adresu.<br/>
          Kontakt: <a href="mailto:bratislava@listovecentrum.sk" style="color:#7cd2ff;text-decoration:underline">bratislava@listovecentrum.sk</a>
          • <a href="tel:+421947922181" style="color:#7cd2ff;text-decoration:underline">0947&nbsp;922&nbsp;181</a>
          <br/><br/>
          Lištobook.sk by LIŠTOVÉ CENTRUM EU, s.r.o. ©
        </div>
      </div>
    </div>
  </div>`;

  return { subject, html };
}

/* ===================== BALKÓN – TECH LISTY ===================== */

function loadTechSheetAttachmentsForVariant({ heightId, drainId }) {
  const h = String(heightId || '').toLowerCase();
  const d = String(drainId || '').toLowerCase();

  // Variant A: LOW + EDGE_FREE
  const isLow = h === 'low';
  const isEdgeFree = d === 'edge-free';
  if (!(isLow && isEdgeFree)) return [];

  // ✅ Stabilná cesta (nezávisí od process.cwd())
  const baseDir = path.resolve(__dirname, '..', 'public', 'img', 'pdf', 'balkon', 'tech');

  const files = [
    { filename: 'technicky-list-mapei-lepidlo.pdf',    local: 'mapei-lepidlo.pdf' },
    { filename: 'technicky-list-schluter-bara-rt.pdf', local: 'schluter-bara-rt.pdf' },
    { filename: 'technicky-list-schluter-bara-rw.pdf', local: 'schluter-bara-rw.pdf' },
    { filename: 'technicky-list-schluter-ditra.pdf',   local: 'schluter-ditra.pdf' },
    { filename: 'technicky-list-sopro-lepidlo.pdf',    local: 'sopro-lepidlo.pdf' },
  ];

  const out = [];
  for (const f of files) {
    const p = path.join(baseDir, f.local);

    if (!fs.existsSync(p)) {
      console.warn('⚠️ Chýba technický list:', p);
      continue;
    }

    const stat = fs.statSync(p);
    // ✅ ochrana pred “prázdnym” pdf
    if (!stat.size || stat.size < 1500) {
      console.warn('⚠️ Technický list je podozrivo malý (pravdepodobne prázdny):', p, 'size=', stat.size);
      continue;
    }

    const buf = fs.readFileSync(p);
    if (!buf || buf.length < 1500) {
      console.warn('⚠️ Technický list sa načítal prázdny:', p, 'len=', buf ? buf.length : 0);
      continue;
    }

    console.log('📎 Tech sheet OK:', f.local, 'bytes=', buf.length);

    out.push({
      filename: f.filename,
      content: buf,
      contentType: 'application/pdf',
    });
  }

  return out;
}

async function sendBalconyDocsEmail({
  to,
  subject,
  html,
  text,
  pdfBuffer,
  pdfFilename = 'balkon-final.pdf',
  customerName = 'Zákazník',
  variant, // { heightId, drainId }
}) {
  if (!isValidEmail(to)) throw new Error('sendBalconyDocsEmail: neplatný e-mail');

  const pdf = normalizeToBuffer(pdfBuffer);
  if (!pdf || pdf.length < 1000) throw new Error('sendBalconyDocsEmail: PDF buffer je neplatný/príliš malý');

  // ✅ ak route neposlala html/subject, použijeme náš template
  const tpl = balconyDocsTemplate({
    customerName,
    customerEmail: to, // ✅ pre linky s ?email=
    pdfFilename,
  });
  const finalSubject = subject || tpl.subject;
  const finalHtml = html || tpl.html;

  const tech = loadTechSheetAttachmentsForVariant(variant || {});
  const attachments = [
    { filename: pdfFilename, content: pdf, contentType: 'application/pdf' },
    ...tech,
  ];

  return sendMail({
    to,
    subject: finalSubject || `${APP_NAME} – technické podklady k balkónu`,
    html: finalHtml,
    text,
    attachments,
  });
}

async function sendBalconyOfferCustomerEmail(args) {
  return sendBalconyDocsEmail(args);
}

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

module.exports = {
  sendMail,
  sendPdfEmail,
  sendSignupEmail,
  sendWelcomeEmail,
  sendBalconyDocsEmail,
  sendBalconyOfferCustomerEmail,
  sendBalconyOfferAdminEmail,
};
