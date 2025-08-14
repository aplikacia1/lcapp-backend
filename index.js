// backend/index.js
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

/* --- Uploads (ponechávame) --- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* --- API routy (ponechaj/odstráň podľa toho, čo reálne máš v backend/routes) --- */
try {
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/categories', require('./routes/categoryRoutes')); // ak nemáš categoryRoutes.js, vyhoď tento riadok
  app.use('/api/products', require('./routes/productRoutes'));
  app.use('/api/orders', require('./routes/orderRoutes'));
  app.use('/api/timeline', require('./routes/timelineRoutes'));
  app.use('/api/ratings', require('./routes/ratingRoutes'));
  app.use('/api/presence', require('./routes/presenceRoutes'));
  app.use('/api/banners', require('./routes/bannerRoutes'));
  app.use('/api/admin/timeline', require('./routes/timelineAdminRoutes'));
  app.use('/api/messages', require('./routes/messageRoutes'));
} catch (e) {
  console.warn('⚠️ Skontroluj názvy/umiestnenie súborov v backend/routes. Ak niektorý neexistuje, vyhoď alebo oprav import.');
}

/* --- FRONTEND: statické súbory z backend/public --- */
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

/* Root na index.html (voliteľne môžeš zmeniť na dashboard.html) */
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
