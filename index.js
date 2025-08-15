// index.js (KOREŇ PROJEKTU)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

console.log('BOOT FILE:', __filename);

const app = express();

/* --- Middleware --- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- Rýchle diagnostické cesty --- */
app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() });
});
app.get('/health/db', (_req, res) => res.send('Test OK'));

/* --- MongoDB --- */
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v environment variables');
  process.exit(1);
}
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err?.message || err);
    process.exit(1);
  });

/* --- Uploads (ponechané) --- */
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

/* --- Bezpečné montovanie API rout --- */
function mountRoute(url, relPath) {
  try {
    app.use(url, require(relPath));
    console.log(`✔ mounted ${url} -> ${relPath}`);
  } catch (e) {
    console.warn(`⚠️ route ${url} not mounted (missing file?): ${relPath}`, e?.message || e);
  }
}
mountRoute('/api/admin', './backend/routes/adminRoutes');
mountRoute('/api/users', './backend/routes/userRoutes');
mountRoute('/api/categories', './backend/routes/categoryRoutes');
mountRoute('/api/products', './backend/routes/productRoutes');
mountRoute('/api/orders', './backend/routes/orderRoutes');
mountRoute('/api/timeline', './backend/routes/timelineRoutes');
mountRoute('/api/ratings', './backend/routes/ratingRoutes');
mountRoute('/api/presence', './backend/routes/presenceRoutes');
mountRoute('/api/banners', './backend/routes/bannerRoutes');
mountRoute('/api/admin/timeline', './backend/routes/timelineAdminRoutes');
mountRoute('/api/messages', './backend/routes/messageRoutes');

/* rýchly ping, aby sme vedeli že endpoint žije */
app.get('/api/products/ping', (_req, res) => res.json({ ok: true }));

/* --- FRONTEND: slúž iba ak skutočne existuje backend/public/index.html --- */
const publicDir = path.join(__dirname, 'backend', 'public');
const indexHtml = path.join(publicDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));
  app.get('/', (_req, res) => res.sendFile(indexHtml));
  console.log('🗂 serving static from', publicDir);
} else {
  // API-only root – žiadny ENOENT
  app.get('/', (_req, res) => {
    res.status(200).send('<h1>API OK</h1><p>Frontend sa tu zatiaľ neservuje.</p>');
  });
  console.log('ℹ️ static frontend not found, keeping API-only root');
}

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
