const mongoose = require("mongoose");

const inventorySettingsSchema =
  new mongoose.Schema({

    allowedUsers: {

      type: [String],

      default: []

    }

  });

module.exports = mongoose.model(
  "InventorySettings",
  inventorySettingsSchema
);