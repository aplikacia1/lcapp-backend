const express = require("express");
const router = express.Router();

router.post("/debug", (req, res) => {

  console.log("🟦 PUSH DEBUG:");
  console.log(JSON.stringify(req.body, null, 2));

  res.json({ ok: true });
});

module.exports = router;