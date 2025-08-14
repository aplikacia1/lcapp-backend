const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title:       { type: String, default: '' },
  description: { type: String, default: '' },
  image:       { type: String, required: true }, // názov súboru v /uploads
  isActive:    { type: Boolean, default: true },
}, { timestamps: true, collection: 'banners' });

module.exports = mongoose.model('Banner', bannerSchema);
