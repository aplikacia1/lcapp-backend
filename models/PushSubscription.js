// backend/models/PushSubscription.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: { type: String, index: true },          // komu patrí toto zariadenie
  endpoint: { type: String, unique: true },      // endpoint z Push API (unikátny)
  sub: { type: Object, required: true },         // celý subscription JSON
}, { timestamps: true, collection: 'push_subscriptions' });

module.exports = mongoose.model('PushSubscription', schema);
