// backend/models/ZisCard.js

const mongoose = require("mongoose");

const zisCardSchema = new mongoose.Schema(
  {
    // Prepojenie na existujúci produkt Lištobooku
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    manufacturer: {
      type: String,
      default: ""
    },

    // Nepovinné video
    youtubeUrl: {
      type: String,
      default: ""
    },

    // Viac čiarových kódov na jednu kartu
    barcodes: {
      type: [String],
      default: []
    },

    // Viac produktových kódov
    productCodes: {
      type: [String],
      default: []
    },

    // Kategórie pre zoskupovanie
    categories: {
      type: [String],
      default: []
    },

    // Kľúčové slová pre vyhľadávanie
    keywords: {
      type: [String],
      default: []
    },

    // Zapnutá / vypnutá karta
    active: {
      type: Boolean,
      default: true
    },

    // Interná poznámka admina
    adminNote: {
      type: String,
      default: ""
    },
    // HTML obsah ZIS
content: {
  type: String,
  default: ""
}
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ZisCard", zisCardSchema);