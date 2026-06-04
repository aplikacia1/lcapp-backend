const mongoose = require("mongoose");

const inventoryRecordSchema = new mongoose.Schema({

  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventorySession",
    default: null
  },

  warehouse: {
    type: String,
    default: "BA"
  },

  productCode: String,

  productName: String,

  systemStock: Number,

  barcode: String,

  priceWithVat: {
    type: Number,
    default: 0
  },

  description: {
    type: String,
    default: ""
  },

  countedQty: Number,

  countedBy: String,

  countedAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model(
  "InventoryRecord",
  inventoryRecordSchema
);