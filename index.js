// index.js  (KOREŇ PROJEKTU)
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

/* --- Statické adresáre (cesty upravené, lebo bežíme z KOREŇA) --- */
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

/* --- API routy (smerujú do backend/routes) --- */
try {
  app.use('/api/admin', require('./backend/routes/adminRoutes'));
  app.use('/api/users', require('./backend/routes/userRoutes'));
  app.use('/api/categories', require('./backend/routes/categoryRoutes')); // ak nemáš, vyhoď tento riadok
  app.use('/api/products', require('./backend/routes/productRoutes'));
  app.use('/api/orders', require('./backend/routes/orderRoutes'));
  app.use('/api/timeline', require('./backend/routes/timelineRoutes'));
  app.use('/api/ratings', require('./backend/routes/ratingRoutes'));
  app.use('/api/presence', require('./backend/routes/presenceRoutes'));
  app.use('/api/banners', require('./backend/routes/bannerRoutes'));
  app.use('/api/admin/timeline', require('./backend/routes/timelineAdminRoutes'));
  app.use('/api/messages', require('./backend/routes/messageRoutes'));
} catch (e) {
  console.warn('⚠️ Skontroluj názvy/umiestnenie súborov v backend/routes. Ak niektorý neexistuje, vyhoď alebo oprav import.');
}

/* --- FRONTEND: statické súbory z backend/public --- */
const publicDir = path.join(__dirname, 'backend', 'public');
app.use(express.static(publicDir));

/* --- Testovacia route na kontrolu nasadenia --- */
app.get('/health/db', (_req, res) => res.send('Test OK'));

/* Root na index.html */
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
