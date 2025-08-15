// index.js  (KOREŇ PROJEKTU)
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

/* --- Diagnostika --- */
app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() });
});

/* --- MongoDB --- */
const MONGO_URI = process.env.MONGO_URI; // odporúčam: ...mongodb.net/test?... (tam máš dáta)
if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v environment variables');
  process.exit(1);
}
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB error:', err?.message || err);
    process.exit(1);
  });

/* --- Health check (ping + počty) --- */
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
      catch { /* kolekcia môže chýbať */ }
    };
    await Promise.all([
      tryCount('users'),
      tryCount('products'),
      tryCount('categories'),
      tryCount('timelineposts'),
      tryCount('ratings'),
      tryCount('orders'),
    ]);

    res.json({ status: 'ok', host: mongoose.connection.host, db: mongoose.connection.name, sampleCounts });
  } catch (e) {
    res.status(500).json({ status: 'fail', error: e.message });
  }
});

/* --- Rýchla sonda bez modelu (pomôže pri overení) --- */
app.get('/__probe/products', async (_req, res) => {
  try {
    const docs = await mongoose.connection.db.collection('products').find({}).limit(5).toArray();
    res.json({ count: docs.length, docs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* --- Statické súbory (bežíme z koreňa) --- */
const publicDir = path.join(__dirname, 'backend', 'public');
app.use(express.static(publicDir));

/* --- API routy: montujeme každú zvlášť + fallback, ak niektorá chýba --- */
const mounted = {};
function tryMount(filePath, mountPath) {
  try {
    const router = require(filePath);
    app.use(mountPath, router);
    mounted[mountPath] = true;
    console.log(`✅ mounted ${mountPath} from ${filePath}`);
  } catch (e) {
    console.warn(`⚠️ skipping ${mountPath} (${filePath}) → ${e.message}`);
  }
}

tryMount('./backend/routes/adminRoutes', '/api/admin');
tryMount('./backend/routes/userRoutes', '/api/users');
tryMount('./backend/routes/categoryRoutes', '/api/categories');
tryMount('./backend/routes/productRoutes', '/api/products'); // ak je rozbité, nižšie máme fallback
tryMount('./backend/routes/orderRoutes', '/api/orders');
tryMount('./backend/routes/timelineRoutes', '/api/timeline');
tryMount('./backend/routes/ratingRoutes', '/api/ratings');
tryMount('./backend/routes/presenceRoutes', '/api/presence');
tryMount('./backend/routes/bannerRoutes', '/api/banners');
tryMount('./backend/routes/timelineAdminRoutes', '/api/admin/timeline');
tryMount('./backend/routes/messageRoutes', '/api/messages');

/* --- Fallback pre /api/products, ak sa route nenamountovala --- */
if (!mounted['/api/products']) {
  app.get('/api/products', async (_req, res) => {
    try {
      const items = await mongoose.connection.db.collection('products').find({}).limit(50).toArray();
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  console.log('ℹ️ using fallback /api/products (no productRoutes mounted)');
}

/* Root na index.html s bezpečným fallbackom */
app.get('/', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(200).send('<h1>Backend OK</h1><p>Chýba <code>backend/public/index.html</code>.</p>');
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000; // Render si interný port nastaví sám
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
