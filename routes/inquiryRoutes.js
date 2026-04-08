const express = require("express");
const router = express.Router();

router.use(express.json());

const nodemailer = require("nodemailer");

// 🔁 TIMEBRAIN (už máš v projekte)
// const { nowSK } = require("../utils/timeBrain");

// ===== MAILER =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ===== HELPER – pracovný čas =====
function isWorkTime(date){
  const day = date.getDay(); // 0 = nedeľa, 6 = sobota
  const hour = date.getHours();

  if(day === 0 || day === 6) return false;

  return hour >= 8 && hour < 16;
}

// ===== ROUTE =====
router.post("/send", async (req, res) => {
  try {
    const { name, email, message, product } = req.body;

    if (!name || !email || !product) {
      return res.status(400).json({ error: "Chýbajú údaje" });
    }

    const now = new Date();
    const workTime = isWorkTime(now);

    // ===== MAIL PRE TEBa =====
    await transporter.sendMail({
      from: `"Lištobook" <${process.env.SMTP_USER}>`,
      to: "bratislava@listovecentrum.sk",
      subject: `Dopyt na produkt: ${product}`,
      html: `
        <h2>Nový dopyt z Lištobooku</h2>

        <b>Produkt:</b> ${product}<br>
        <b>Meno:</b> ${name}<br>
        <b>Email:</b> ${email}<br><br>

        <b>Správa:</b><br>
        ${message || "(bez správy)"}
      `,
    });

    // ===== AUTO ODPOVEĎ =====
    await transporter.sendMail({
      from: `"Lištobook" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Potvrdenie dopytu",
      html: `
        Dobrý deň,<br><br>

        Váš dopyt na produkt <b>${product}</b> bol úspešne odoslaný.<br><br>

        ${
          workTime
            ? "Budeme Vás kontaktovať v čo najkratšom čase."
            : "Momentálne sme mimo pracovnej doby (Po–Pia 08:00–16:00). Odpovieme Vám v najbližší pracovný deň."
        }

        <br><br>
        S pozdravom<br>
        Lištové centrum
      `,
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Inquiry error:", err);
    res.status(500).json({ error: "Chyba servera" });
  }
});

module.exports = router;