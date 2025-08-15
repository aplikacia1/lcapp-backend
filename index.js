// index.js (KOREŇ PROJEKTU)
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
const MONGO_URI = process.env.MONGO_URI; // ideálne nech končí .../test?...
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

/* --- Health check (JSON) --- */
app.get('/health/db', async (_req, res) => {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return res.status(500).json({ status: 'fail', error: 'DB not connected' });
    }
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok', db: mongoose.connection.name, host: mongoose.connection.host });
  } catch (e) {
    res.status(500).json({ status: 'fail', error: e.message });
  }
});

/* --- Uploads statika --- */
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

/* --- API routy – montujeme bezpečne --- */
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

tryMount('./backend/routes/userRoutes', '/api/users');
tryMount('./backend/routes/documentRoutes', '/api/categories'); // tvoje pôvodné mapovanie
tryMount('./backend/routes/adminRoutes', '/api/admin');
tryMount('./backend/routes/productRoutes', '/api/products');
tryMount('./backend/routes/orderRoutes', '/api/orders');
tryMount('./backend/routes/timelineRoutes', '/api/timeline');
tryMount('./backend/routes/ratingRoutes', '/api/ratings');
tryMount('./backend/routes/presenceRoutes', '/api/presence');
tryMount('./backend/routes/bannerRoutes', '/api/banners');
tryMount('./backend/routes/timelineAdminRoutes', '/api/admin/timeline');
tryMount('./backend/routes/messageRoutes', '/api/messages');

/* --- Fallback pre /api/products, ak route nesedel --- */
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

/* --- Root: bez frontendu, len informácia --- */
app.get('/', (_req, res) => {
  res.status(200).send('<h1>API OK</h1><p>Frontend sa zatiaľ nenasadzuje z tohto servera.</p>');
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
