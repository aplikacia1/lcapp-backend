const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/adminModel');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await Admin.deleteOne({ email: 'bratislava@listovecentrum.sk' });
    console.log('✅ Admin zmazaný.');
    mongoose.disconnect();
  })
  .catch((err) => console.error('❌ Chyba pripojenia:', err));
