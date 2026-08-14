const mongoose = require("mongoose");

const trustedDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    accessCount: {
      type: Number,
      default: 0
    },

    lastUsedAt: {
      type: Date,
      default: Date.now
    },

    lastPinVerifiedAt: {
      type: Date,
      default: null
    },

    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

trustedDeviceSchema.index({
  userId: 1,
  revokedAt: 1
});

module.exports =
  mongoose.models.TrustedDevice ||
  mongoose.model("TrustedDevice", trustedDeviceSchema);