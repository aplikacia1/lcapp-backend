// index.js  (KOREŇ PROJEKTU)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

console.log('BOOT FILE:', __filename);

const app = express();

/* --- Middleware --- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- Diagnostika --- */
app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() });
});

/* --- MongoDB --- */
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v environment variables');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err?.message || err);
    process.exit(1);
  });

/* --- Health check s pingom a počtami --- */
app.get('/health/db', async (_req, res) => {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return res.status(500).json({ status: 'fail', error: 'DB not connected' });
    }
    const admin = mongoose.connection.db.admin();
    await admin.ping();

    const sampleCounts = {};
    const tryCount = async (name) => {
      try { sampleCounts[name] = await mongoose.connection.db.collection(name).countDocuments(); }
      catch { /* kolekcia nemusí existovať */ }
    };
    await Promise.all([
      tryCount('users'),
      tryCount('products'),
      tryCount('categories'),
      tryCount('timelineposts'),
      tryCount('ratings'),
      tryCount('orders')
    ]);

    res.json({
      status: 'ok',
      host: mongoose.connection.host,
      db: mongoose.connection.name,
      sampleCounts
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', error: e.message });
  }
});

/* --- Statické súbory (bežíme z koreňa) --- */
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

/* --- API routy (súbory sú v backend/routes) --- */
try {
  app.use('/api/admin', require('./backend/routes/adminRoutes'));
  app.use('/api/users', require('./backend/routes/userRoutes'));
  app.use('/api/categories', require('./backend/routes/categoryRoutes')); // ak nemáš, odstráň
  app.use('/api/products', require('./backend/routes/productRoutes'));
  app.use('/api/orders', require('./backend/routes/orderRoutes'));
  app.use('/api/timeline', require('./backend/routes/timelineRoutes'));
  app.use('/api/ratings', require('./backend/routes/ratingRoutes'));
  app.use('/api/presence', require('./backend/routes/presenceRoutes'));
  app.use('/api/banners', require('./backend/routes/bannerRoutes'));
  app.use('/api/admin/timeline', require('./backend/routes/timelineAdminRoutes'));
  app.use('/api/messages', require('./backend/routes/messageRoutes'));
} catch (e) {
  console.warn('⚠️ Skontroluj názvy súborov v backend/routes. Ak niektorý neexistuje, odstráň import.');
}

/* --- FRONTEND: backend/public --- */
const publicDir = path.join(__dirname, 'backend', 'public');
app.use(express.static(publicDir));

/* Root na index.html */
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
