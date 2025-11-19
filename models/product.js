// backend/models/product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      default: ""
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    description: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: null
    },
    order: {
      type: Number,
      default: 9999
    },

    // 🔹 NOVÉ POLIA
    // URL na technický list (napr. stránka na listovecentrum.sk)
    techSheetUrl: {
      type: String,
      default: ""
    },
    // URL na produkt v e-shope
    shopUrl: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Product", productSchema);
