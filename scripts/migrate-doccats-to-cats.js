// scripts/migrate-doccats-to-cats.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

if (!process.env.MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v .env');
  process.exit(1);
}

(async () => {
  const uri = process.env.MONGO_URI;
  const dbNameFromUri = (() => {
    const m = uri.match(/mongodb(\+srv)?:\/\/[^/]+\/([^?]+)/);
    return m?.[2] || 'lcapp';
  })();
  const client = new MongoClient(uri, { ignoreUndefined: true });

  try {
    await client.connect();
    const lcapp = client.db('lcapp'); // cieľ
    const test  = client.db('test');  // prípadný zdroj

    // zisti, kde sú tvoje documentcategories (lcapp alebo test)
    const srcDb =
      (await lcapp.collection('documentcategories').countDocuments()) > 0
        ? lcapp
        : test;

    console.log(`ℹ️  Zdroj DB: ${srcDb.databaseName} • Cieľ DB: lcapp`);

    const srcCol = srcDb.collection('documentcategories');
    const dstCol = lcapp.collection('categories');

    const docs = await srcCol.find({}).toArray();
    console.log(`→ Našiel som ${docs.length} dokumentov v documentcategories`);

    for (const d of docs) {
      const payload = {
        name: d.name,
        image: d.image,
        createdAt: d.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // upsert podľa názvu (nech sa nerobia duplicitné kategórie)
      await dstCol.updateOne(
        { name: d.name },
        { $set: payload, $setOnInsert: { __v: 0 } },
        { upsert: true }
      );
    }

    const count = await dstCol.countDocuments();
    console.log(`✅ Hotovo. V lcapp.categories je teraz ${count} položiek.`);
  } catch (e) {
    console.error('❌ Chyba migrácie:', e);
  } finally {
    await client.close();
  }
})();
