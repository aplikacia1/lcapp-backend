// scripts/copy-test-to-lcapp.js
// npm i mongodb
const { MongoClient } = require('mongodb');

const URI = process.env.MONGO_ATLAS_URI; // bez názvu DB (…mongodb.net)
const SRC_DB  = 'test';
const DEST_DB = 'lcapp';

// zoznam kolekcií, ktoré chceš preniesť
const collections = [
  'admins',
  'banners',
  'categories',
  'documentcategories',
  'documentitems',
  'messages',
  'orders',
  'products',
  'ratings',
  'timelineposts',
  'users',
];

(async () => {
  if (!URI) {
    console.error('❌ Setni MONGO_ATLAS_URI (bez /db) v env!');
    process.exit(1);
  }
  const client = new MongoClient(URI, { ignoreUndefined: true });
  try {
    await client.connect();
    const src  = client.db(SRC_DB);
    const dest = client.db(DEST_DB);

    for (const name of collections) {
      const sCol = src.collection(name);
      const dCol = dest.collection(name);

      const docs = await sCol.find({}).toArray();
      console.log(`→ ${name}: ${docs.length} dokumentov`);

      // vyprázdni cieľ (ak existuje)
      try { await dCol.drop(); } catch (_) {}

      if (docs.length) {
        await dCol.insertMany(docs, { ordered: false }); // zachová pôvodné _id
      }
    }
    console.log('✅ Hotovo: skopírované do DB', DEST_DB);
  } catch (e) {
    console.error('❌ Chyba pri kopírovaní:', e);
  } finally {
    await client.close();
  }
})();
