// models/message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    fromEmail: { type: String, required: true, index: true },
    fromName:  { type: String, default: '' },

    toEmail:   { type: String, required: true, index: true },
    toName:    { type: String, default: '' },

    text:      { type: String, required: true },

    // aby sme vedeli rozlíšiť systémové (auto) odpovede
    isAuto:    { type: Boolean, default: false }
  },
  { timestamps: true, collection: 'messages' }
);

module.exports = mongoose.model('Message', messageSchema);
