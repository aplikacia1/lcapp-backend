const express = require("express");

const router = express.Router();

const InventorySettings =
  require("../models/InventorySettings");

// =========================
// GET SETTINGS
// =========================

router.get("/settings", async (req, res) => {

  try {

    let settings =
      await InventorySettings.findOne();

    if (!settings) {

      settings =
        await InventorySettings.create({

          allowedUsers: []

        });

    }

    res.json({

      success: true,

      allowedUsers:
        settings.allowedUsers || []

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false

    });

  }

});

// =========================
// SAVE SETTINGS
// =========================

router.post("/settings", async (req, res) => {

  try {

    const { allowedUsers } = req.body;

    let settings =
      await InventorySettings.findOne();

    if (!settings) {

      settings =
        new InventorySettings();

    }

    settings.allowedUsers =
      allowedUsers || [];

    await settings.save();

    res.json({

      success: true

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false

    });

  }

});

module.exports = router;