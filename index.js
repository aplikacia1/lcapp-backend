// index.js — JEDINÁ spúšťacia appka
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

/* --- Middleware --- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- Rýchle diagnostiky --- */
app.get('/__whoami', (_req, res) => {
  res.json({ subor: __filename, dir: __dirname, ts: new Date().toISOString() });
});
app.get('/health/db', (_req, res) => res.send('Test je v poriadku'));

/* --- MongoDB --- */
const { MONGO_URI } = process.env;
if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v environment variables');
  process.exit(1);
}
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('🟢 MongoDB connected'))
  .catch(err => {
    console.error('🔴 MongoDB error:', err?.message || err);
    process.exit(1);
  });

/* --- Statické súbory --- */
// nahrávky (ak používaš)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// frontend ide z ./public
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

/* --- Helper na mount routes s logom --- */
function mountRoute(url, filePath) {
  try {
    const router = require(filePath);
    app.use(url, router);
    console.log(`✅ route ${url} -> ${filePath}`);
  } catch (e) {
    console.warn(`⚠️  preskakujem ${url}: ${filePath} (nenájdené?) – ${e.message}`);
  }
}

/* --- API routes (POZOR: správne ./routes/...) --- */
mountRoute('/api/admin',           './routes/adminRoutes');
mountRoute('/api/users',           './routes/userRoutes');
mountRoute('/api/categories',      './routes/categoryRoutes');
mountRoute('/api/products',        './routes/productRoutes');
mountRoute('/api/orders',          './routes/orderRoutes');
mountRoute('/api/timeline',        './routes/timelineRoutes');
mountRoute('/api/ratings',         './routes/ratingRoutes');
mountRoute('/api/presence',        './routes/presenceRoutes');
mountRoute('/api/banners',         './routes/bannerRoutes');
mountRoute('/api/admin/timeline',  './routes/timelineAdminRoutes');
mountRoute('/api/messages',        './routes/messageRoutes');

/* --- Root: pošli index.html z ./public --- */
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
