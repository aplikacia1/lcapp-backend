// scripts/dedupe-categories-by-name.js
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) { console.error('❌ Chýba MONGO_URI v .env'); process.exit(1); }

const norm = s => String(s || '').trim().toLowerCase();

(async () => {
  const cli = new MongoClient(uri, { ignoreUndefined: true });
  try {
    await cli.connect();
    const db = cli.db('lcapp');
    const catsCol = db.collection('categories');
    const prodCol = db.collection('products');

    const cats = await catsCol.find({}).toArray();
    console.log(`Načítaných kategórií: ${cats.length}`);

    // spočítaj produkty podľa categoryId
    const countsAgg = await prodCol.aggregate([
      { $group: { _id: "$categoryId", n: { $sum: 1 } } }
    ]).toArray();
    const counts = new Map(countsAgg.map(x => [String(x._id), x.n]));

    // zoskup podľa názvu
    const groups = new Map();
    for (const c of cats) {
      const key = norm(c.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }

    for (const [key, arr] of groups) {
      if (arr.length < 2) continue; // žiadne duplicity

      // vyber "víťaza" – ten s najviac produktami
      arr.sort((a,b) => (counts.get(String(b._id))||0) - (counts.get(String(a._id))||0));
      const keeper = arr[0];
      const losers = arr.slice(1);

      const keepId = keeper._id;
      const loserIds = losers.map(x => x._id);

      // presmeruj produkty z "losers" na "keeper"
      const upd = await prodCol.updateMany(
        { categoryId: { $in: loserIds } },
        { $set: { categoryId: keepId } }
      );
      // zmaž duplicitné kategórie
      const del = await catsCol.deleteMany({ _id: { $in: loserIds } });

      console.log(`✔ ${keeper.name}: presunuté produkty ${upd.modifiedCount}, zmazané duplicitné kategórie ${del.deletedCount}`);
    }

    const left = await catsCol.countDocuments();
    console.log(`✅ Hotovo. Po deduplikácii ostáva ${left} kategórií.`);
  } catch (e) {
    console.error('❌ Chyba:', e);
  } finally {
    await cli.close();
  }
})();
