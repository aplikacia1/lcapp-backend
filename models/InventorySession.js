const mongoose = require("mongoose");

const inventorySessionSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  warehouse: {
    type: String,
    enum: ["BA", "ZA"],
    default: "BA"
  },

  status: {
    type: String,
    enum: ["active", "closed", "exported"],
    default: "active"
  },

  createdByEmail: {
    type: String,
    required: true
  },

  createdByName: {
    type: String,
    default: ""
  },

  allowedUsers: {
    type: [String],
    default: []
  },

  startedAt: {
    type: Date,
    default: Date.now
  },

  closedAt: {
    type: Date,
    default: null
  },

  expiresAt: {
    type: Date,
    default: function () {
      return new Date(
        Date.now() + 15 * 24 * 60 * 60 * 1000
      );
    }
  }

});

inventorySessionSchema.index({
  expiresAt: 1
});

module.exports = mongoose.model(
  "InventorySession",
  inventorySessionSchema
);