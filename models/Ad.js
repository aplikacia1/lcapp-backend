const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  targetUrl: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// do budúcna môžeme pridať napr. "validFrom / validTo", ale teraz netreba
const Ad = mongoose.model("Ad", adSchema);

module.exports = Ad;
