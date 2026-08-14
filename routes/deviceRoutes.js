const express = require("express");
const crypto = require("crypto");

const User = require("../models/User");
const TrustedDevice = require("../models/TrustedDevice");

const router = express.Router();


// =========================
// HELPERS
// =========================

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

function createDeviceToken() {
  return crypto.randomBytes(32).toString("hex");
}


// =========================
// REGISTER TRUSTED DEVICE
// po úspešnom login-e heslom
// =========================

router.post("/register", async (req, res) => {
  try {

        // Zariadenie smieme označiť ako dôveryhodné
    // iba používateľovi, ktorý je skutočne prihlásený.
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        ok: false,
        message: "Používateľ nie je prihlásený."
      });
    }

    const user = await User.findById(req.session.userId);

if (!user) {
  return res.status(401).json({
    ok: false,
    message: "Prihlásený používateľ neexistuje."
  });
}

const existingDeviceToken = req.body?.deviceToken;

if (existingDeviceToken) {
  const existingTokenHash = hashToken(existingDeviceToken);

  const existingDevice = await TrustedDevice.findOne({
    userId: user._id,
    tokenHash: existingTokenHash,
    revokedAt: null
  });

  if (existingDevice) {
    existingDevice.lastUsedAt = new Date();
    await existingDevice.save();

    return res.json({
      ok: true,
      deviceToken: existingDeviceToken,
      existing: true
    });
  }
}

    const deviceToken = createDeviceToken();
    const tokenHash = hashToken(deviceToken);

    await TrustedDevice.create({
      userId: user._id,
      tokenHash,
      accessCount: 0,
      lastUsedAt: new Date(),
      lastPinVerifiedAt: null,
      revokedAt: null
    });

    return res.json({
  ok: true,
  deviceToken,
  existing: false
});

  } catch (err) {

    console.error("DEVICE REGISTER ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: "Chyba servera."
    });

  }
});


// =========================
// CHECK TRUSTED DEVICE
// =========================

router.post("/check", async (req, res) => {
  try {

    const { deviceToken } = req.body || {};

    if (!deviceToken) {
      return res.status(401).json({
        ok: false,
        trusted: false
      });
    }

    const tokenHash = hashToken(deviceToken);

    const device = await TrustedDevice
      .findOne({
        tokenHash,
        revokedAt: null
      })
      .populate("userId", "email pinEnabled pinHash");

    if (!device || !device.userId) {
      return res.status(401).json({
        ok: false,
        trusted: false
      });
    }

    device.accessCount += 1;
    device.lastUsedAt = new Date();

    await device.save();

    const requiresPin =
      device.userId.pinEnabled === true &&
      device.accessCount % 50 === 0;

    return res.json({
      ok: true,
      trusted: true,
      email: device.userId.email,
      requiresPin
    });

  } catch (err) {

    console.error("DEVICE CHECK ERROR:", err);

    return res.status(500).json({
      ok: false,
      trusted: false
    });

  }
});


// =========================
// PIN VERIFIED
// vynulujeme počítadlo
// =========================

router.post("/pin-verified", async (req, res) => {
  try {

        if (
      !req.session ||
      req.session.pinVerified !== true ||
      !req.session.pinEmail
    ) {
      return res.status(401).json({
        ok: false
      });
    }

    const { deviceToken } = req.body || {};

    if (!deviceToken) {
      return res.status(400).json({
        ok: false
      });
    }

    const tokenHash = hashToken(deviceToken);

    const user = await User.findOne({
  email: req.session.pinEmail
});

if (!user) {
  return res.status(401).json({
    ok: false
  });
}

const device = await TrustedDevice.findOne({
  tokenHash,
  userId: user._id,
  revokedAt: null
});

    if (!device) {
      return res.status(404).json({
        ok: false
      });
    }

    device.accessCount = 0;
    device.lastPinVerifiedAt = new Date();
    device.lastUsedAt = new Date();

    await device.save();

    return res.json({
      ok: true
    });

  } catch (err) {

    console.error("DEVICE PIN VERIFIED ERROR:", err);

    return res.status(500).json({
      ok: false
    });

  }
});


// =========================
// FORGET / REVOKE DEVICE
// =========================

router.post("/revoke", async (req, res) => {
  try {

    const { deviceToken } = req.body || {};

    if (!deviceToken) {
      return res.status(400).json({
        ok: false
      });
    }

    const tokenHash = hashToken(deviceToken);

    const device = await TrustedDevice.findOne({
      tokenHash,
      revokedAt: null
    });

    if (device) {
      device.revokedAt = new Date();
      await device.save();
    }

    return res.json({
      ok: true
    });

  } catch (err) {

    console.error("DEVICE REVOKE ERROR:", err);

    return res.status(500).json({
      ok: false
    });

  }
});


module.exports = router;