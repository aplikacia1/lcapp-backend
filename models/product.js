// models/product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    categoryId:   { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    name:         { type: String, required: true, trim: true },
    image:        { type: String, default: "" },
    code:         { type: String, default: "" },
    price:        { type: Number, required: true, default: 0 },
    unit:         { type: String, default: "" },     // napr. ks, m, m2
    description:  { type: String, default: "" },

    // ⬇️ dôležité: sem sa zapisuje sumár z hodnotení
    averageRating:{ type: Number, default: 0 },
    ratingCount:  { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
