const mongoose = require('mongoose');

const DocumentCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DocumentCategory', DocumentCategorySchema);
