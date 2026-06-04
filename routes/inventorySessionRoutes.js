const express = require("express");

const router = express.Router();

const InventorySession =
  require("../models/InventorySession");

router.post("/start", async (req, res) => {

  try {

    const {
      name,
      warehouse,
      createdByEmail,
      createdByName,
      allowedUsers
    } = req.body;

    const session =
      await InventorySession.create({

        name,

        warehouse,

        createdByEmail,

        createdByName,

        allowedUsers

      });

    res.json({

      success: true,

      session

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false

    });

  }

});

router.get("/all", async (req, res) => {

  try {

    const sessions =
      await InventorySession.find()

      .sort({
        startedAt: -1
      });

    res.json({

      success: true,

      sessions

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false

    });

  }

});

module.exports = router;