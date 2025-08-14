const mongoose = require('mongoose');

const DocumentItemSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentCategory',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DocumentItem', DocumentItemSchema);
