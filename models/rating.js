// models/rating.js
const mongoose = require("mongoose"); 

const ratingSchema = new mongoose.Schema(
  {
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    email:      { type: String, required: true },      // kto hodnotil (identifikátor)
    authorName: { type: String, default: "" },         // prezývka uložená z User.name
    stars:      { type: Number, min: 1, max: 5, required: true },
    comment:    { type: String, default: "" }
  },
  { timestamps: true, collection: "ratings" }
);

// 1 používateľ = 1 hodnotenie na produkt
ratingSchema.index({ productId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
